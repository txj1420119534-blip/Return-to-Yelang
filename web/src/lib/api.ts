const KEY = 'yelang.session';

export type Session = {
  player_id: string;
  token: string;
  event_id: string;
  state: string;
  name: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function patchSession(partial: Partial<Session>) {
  const current = loadSession();
  if (!current) return;
  saveSession({ ...current, ...partial });
}

export function clearSession({ preserveOpening = false }: { preserveOpening?: boolean } = {}) {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem('yelang.day2.entered');
  if (!preserveOpening) sessionStorage.removeItem('yelang.opening.seen');
}

async function readJson<T>(response: Response): Promise<T & { error?: string; detail?: string; code?: string }> {
  const text = await response.text();
  if (!text) return {} as T & { error?: string; detail?: string; code?: string };
  try {
    return JSON.parse(text) as T & { error?: string; detail?: string; code?: string };
  } catch {
    throw new ApiError('服务返回了无法识别的内容', response.status);
  }
}

export async function post<T>(
  path: string,
  body: Record<string, unknown> = {},
  options: { headers?: Record<string, string> } = {}
): Promise<T> {
  const session = loadSession();
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { 'x-player-token': session.token } : {}),
        ...options.headers
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new ApiError('现场服务暂时未连通，请稍后再试', 0, 'NETWORK_ERROR');
  }
  const data = await readJson<T>(response);
  if (!response.ok) {
    throw new ApiError(data.detail || data.error || response.statusText || '请求未完成', response.status, data.code || data.error);
  }
  return data;
}

export async function health() {
  let response: Response;
  try {
    response = await fetch('/health');
  } catch {
    throw new ApiError('后端未连通', 0, 'NETWORK_ERROR');
  }
  if (!response.ok) throw new ApiError('后端未连通', response.status);
  return response.json() as Promise<{ ok: boolean; mode: string; db: boolean; ai: boolean }>;
}
