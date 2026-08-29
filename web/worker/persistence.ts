import { exportMemoryState, importMemoryState, type MemorySnapshot } from '../../server/src/memory';

type SitesEnv = Cloudflare.Env & { DB: D1Database };

const CREATE_STATE_TABLE = `
  CREATE TABLE IF NOT EXISTS yelang_runtime_state (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )
`;

let requestQueue: Promise<void> = Promise.resolve();

async function runWithState<T>(db: D1Database, operation: () => Promise<T>): Promise<T> {
  await db.prepare(CREATE_STATE_TABLE).run();
  const session = db.withSession('first-primary');
  const row = await session
    .prepare('SELECT payload FROM yelang_runtime_state WHERE id = ?')
    .bind('global')
    .first<{ payload: string }>();

  let snapshot: MemorySnapshot | null = null;
  if (row?.payload) {
    try {
      snapshot = JSON.parse(row.payload) as MemorySnapshot;
    } catch {
      snapshot = null;
    }
  }
  importMemoryState(snapshot);

  const result = await operation();
  const payload = JSON.stringify(exportMemoryState());
  await session
    .prepare(
      `INSERT INTO yelang_runtime_state (id, payload, revision, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET
         payload = excluded.payload,
         revision = yelang_runtime_state.revision + 1,
         updated_at = excluded.updated_at`
    )
    .bind('global', payload, new Date().toISOString())
    .run();
  return result;
}

/** Serializes API mutations per Worker isolate and persists every completed request to D1. */
export function withPersistentState<T>(env: SitesEnv, operation: () => Promise<T>): Promise<T> {
  const task = requestQueue.then(() => runWithState(env.DB, operation));
  requestQueue = task.then(
    () => undefined,
    () => undefined
  );
  return task;
}

