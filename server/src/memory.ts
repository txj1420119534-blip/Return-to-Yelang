import { randomUUID } from 'node:crypto';
import cardsJson from './content/cards.json';
import questsJson from './content/quests.json';
import botActionsJson from './content/bot_actions.json';
import npcsJson from './content/npcs.json';
import mottoTemplatesJson from './content/motto_templates.json';

export type Fragments = {
  zheng: number;
  shi: number;
  gong: number;
  ren: number;
  huo: number;
};

export type PlayerState =
  | 'SIGNED_IN'
  | 'DAY1_EXPLORING'
  | 'MASK_CRAFTING'
  | 'FIRE_NIGHT'
  | 'FACTION_LOCKED'
  | 'DAY2_PREPARING'
  | 'BATTLE_R1'
  | 'BATTLE_R2'
  | 'BATTLE_R3'
  | 'ENDING';

export type Player = {
  id: string;
  event_id: string;
  name: string;
  initial_bias: string | null;
  faction: '守文盟' | '新火盟' | null;
  profession: string | null;
  state: PlayerState;
  token: string;
};

export type Mask = {
  player_id: string;
  fragments_json: Fragments;
  style: {
    base: string;
    eye: string;
    mouth: string;
    brow: string;
    aux: string[];
  } | null;
  name: string | null;
  motto: string | null;
};

export type ContentCard = {
  id: string;
  title: string;
  body: string;
  source: string;
  layer: string;
  scene_id: string;
  image_url?: string | null;
  audio_url: string | null;
  fragment: { pattern: string; delta: number };
  codes: string[];
};

export type Quest = {
  id: string;
  npc_id: string;
  day: number;
  type: string;
  description: string;
  reward_json: {
    res: { res_type: string; delta: number }[];
    fragment: { pattern: string; delta: number } | null;
    inventory: unknown;
  };
  one_time_code: string;
};

export type BattleState = {
  round_id: string;
  gate_hp: number;
  grain_blocked_min: number;
  tower_a: string | null;
  tower_b: string | null;
  tower_c: string | null;
  attacker_camps: number;
  cars_delivered: number;
  cars_broken: number;
};

export type Day2MissionType = 'escort' | 'ambush';

export type Day2Registration = {
  player_id: string;
  mission_type: Day2MissionType;
  target_id: 'A' | 'B' | 'C' | 'D';
  created_at: string;
};

export type EscortRun = {
  route: 'A' | 'B' | 'C' | 'D';
  started_at: string;
  started_by: string;
  completed_at: string | null;
  completed_by: string | null;
  integrity: number;
  broken_at: string | null;
  ambushes: Array<{ player_id: string; checkpoint: 1 | 2; at: string; damage: number }>;
};

export type LedgerRow = {
  id: string;
  player_id: string;
  faction: string | null;
  res_type: string;
  delta: number;
  source: string;
  occurred_at: string;
};

export type BotAction = {
  id: string;
  target_type: string;
  target_id: string;
  weight: number;
  cost: Record<string, number>;
  effect: Record<string, number | string>;
  narration: string;
};

export type Npc = { id: string; name: string; role: string; location: string; layer: string; source: string };

export const cards = cardsJson as ContentCard[];
export const quests = questsJson as Quest[];
export const botActions = botActionsJson as unknown as BotAction[];
export const npcs = npcsJson as Npc[];
export const mottoTemplates = mottoTemplatesJson as Record<string, string[]>;

export const EVENT_ID = process.env.EVENT_ID ?? '00000000-0000-0000-0000-000000000001';

const CN_TO_KEY: Record<string, keyof Fragments> = {
  证: 'zheng',
  石: 'shi',
  工: 'gong',
  人: 'ren',
  火: 'huo'
};

const KEY_TO_CN: Record<keyof Fragments, string> = {
  zheng: '证',
  shi: '石',
  gong: '工',
  ren: '人',
  huo: '火'
};

const RES_CN: Record<string, string> = {
  gong_cai: '工材',
  liang_cao: '粮草',
  tong_ling: '铜令',
  min_xin: '民心',
  工材: '工材',
  粮草: '粮草',
  铜令: '铜令',
  民心: '民心'
};

export function emptyFragments(): Fragments {
  return { zheng: 0, shi: 0, gong: 0, ren: 0, huo: 0 };
}

export function patternKey(pattern: string): keyof Fragments {
  return CN_TO_KEY[pattern] ?? (pattern as keyof Fragments);
}

export function patternCn(key: keyof Fragments): string {
  return KEY_TO_CN[key];
}

export function normalizeRes(t: string): string {
  return RES_CN[t] ?? t;
}

export function assetPart(id: string): string {
  return id.replace(/-0(\d)\b/, '-$1');
}

const players = new Map<string, Player>();
const masks = new Map<string, Mask>();
type InventoryItem = {
  id: string;
  player_id: string;
  source_type: string;
  name: string;
  description?: string;
  day2_effect_json: { res_type: string; delta: number; one_time: boolean } | null;
};

const inventory: InventoryItem[] = [];
const scanned = new Set<string>();
const claimed = new Set<string>();
const completed = new Set<string>();
const usedCodes = new Set<string>();
const ledger: LedgerRow[] = [];
const wall: Array<{ player_id: string; pattern_id: string; at: string }> = [];
const wallPlayers = new Set<string>();
const analytics: Array<{ event_type: string; player_id?: string; payload?: unknown; at: string }> = [];
const registrations = new Map<string, Day2Registration>();
const escortRuns = new Map<string, EscortRun>();
const day2ScanKeys = new Set<string>();
const eventPhase = new Map<string, PlayerState>();
const day2Provisioned = new Set<string>();

export const rounds = [
  { id: '22222222-2222-2222-2222-000000000001', round_no: 1 },
  { id: '22222222-2222-2222-2222-000000000002', round_no: 2 },
  { id: '22222222-2222-2222-2222-000000000003', round_no: 3 }
];

const battleByRound = new Map<string, BattleState>(
  rounds.map((r) => [
    r.id,
    {
      round_id: r.id,
      gate_hp: 100,
      grain_blocked_min: 0,
      tower_a: '守文盟',
      tower_b: '守文盟',
      tower_c: null,
      attacker_camps: 4,
      cars_delivered: 0,
      cars_broken: 0
    }
  ])
);

export const battleLog: Array<{
  round_id: string;
  narration: string;
  at: string;
  actor: string;
}> = [];

export type MemorySnapshot = {
  players: Player[];
  masks: Mask[];
  inventory: InventoryItem[];
  scanned: string[];
  claimed: string[];
  completed: string[];
  usedCodes: string[];
  ledger: LedgerRow[];
  wall: Array<{ player_id: string; pattern_id: string; at: string }>;
  analytics: Array<{ event_type: string; player_id?: string; payload?: unknown; at: string }>;
  registrations: Day2Registration[];
  escortRuns: EscortRun[];
  day2ScanKeys: string[];
  eventPhase: Array<[string, PlayerState]>;
  day2Provisioned: string[];
  battleByRound: Array<[string, BattleState]>;
  battleLog: typeof battleLog;
};

/** Creates a JSON-safe snapshot for the Sites D1 persistence adapter. */
export function exportMemoryState(): MemorySnapshot {
  return {
    players: [...players.values()],
    masks: [...masks.values()],
    inventory: [...inventory],
    scanned: [...scanned],
    claimed: [...claimed],
    completed: [...completed],
    usedCodes: [...usedCodes],
    ledger: [...ledger],
    wall: [...wall],
    analytics: [...analytics],
    registrations: [...registrations.values()],
    escortRuns: [...escortRuns.values()],
    day2ScanKeys: [...day2ScanKeys],
    eventPhase: [...eventPhase.entries()],
    day2Provisioned: [...day2Provisioned],
    battleByRound: [...battleByRound.entries()],
    battleLog: [...battleLog]
  };
}

/** Replaces the process cache with the latest durable Sites snapshot. */
export function importMemoryState(snapshot: MemorySnapshot | null | undefined) {
  players.clear();
  masks.clear();
  inventory.splice(0);
  scanned.clear();
  claimed.clear();
  completed.clear();
  usedCodes.clear();
  ledger.splice(0);
  wall.splice(0);
  wallPlayers.clear();
  analytics.splice(0);
  registrations.clear();
  escortRuns.clear();
  day2ScanKeys.clear();
  eventPhase.clear();
  day2Provisioned.clear();
  battleByRound.clear();
  battleLog.splice(0);

  if (!snapshot) {
    for (const round of rounds) {
      battleByRound.set(round.id, {
        round_id: round.id,
        gate_hp: 100,
        grain_blocked_min: 0,
        tower_a: '守文盟',
        tower_b: '守文盟',
        tower_c: null,
        attacker_camps: 4,
        cars_delivered: 0,
        cars_broken: 0
      });
    }
    return;
  }

  for (const player of snapshot.players ?? []) players.set(player.id, player);
  for (const mask of snapshot.masks ?? []) masks.set(mask.player_id, mask);
  inventory.push(...(snapshot.inventory ?? []));
  for (const key of snapshot.scanned ?? []) scanned.add(key);
  for (const key of snapshot.claimed ?? []) claimed.add(key);
  for (const key of snapshot.completed ?? []) completed.add(key);
  for (const key of snapshot.usedCodes ?? []) usedCodes.add(key);
  ledger.push(...(snapshot.ledger ?? []));
  wall.push(...(snapshot.wall ?? []));
  for (const stroke of wall) wallPlayers.add(stroke.player_id);
  analytics.push(...(snapshot.analytics ?? []));
  for (const registration of snapshot.registrations ?? []) {
    registrations.set(`${registration.player_id}:${registration.mission_type}:${registration.target_id}`, registration);
  }
  for (const run of snapshot.escortRuns ?? []) escortRuns.set(run.route, run);
  for (const key of snapshot.day2ScanKeys ?? []) day2ScanKeys.add(key);
  for (const [eventId, phase] of snapshot.eventPhase ?? []) eventPhase.set(eventId, phase);
  for (const playerId of snapshot.day2Provisioned ?? []) day2Provisioned.add(playerId);
  for (const [roundId, state] of snapshot.battleByRound ?? []) battleByRound.set(roundId, state);
  for (const round of rounds) {
    if (!battleByRound.has(round.id)) {
      battleByRound.set(round.id, {
        round_id: round.id,
        gate_hp: 100,
        grain_blocked_min: 0,
        tower_a: '守文盟',
        tower_b: '守文盟',
        tower_c: null,
        attacker_camps: 4,
        cars_delivered: 0,
        cars_broken: 0
      });
    }
  }
  battleLog.push(...(snapshot.battleLog ?? []));
}

export function getPlayer(id: string): Player | undefined {
  return players.get(id);
}

export function getPlayerByToken(token: string): Player | undefined {
  for (const p of players.values()) {
    if (p.token === token) return p;
  }
  return undefined;
}

export function enroll(name: string, eventId = EVENT_ID): Player {
  const id = randomUUID();
  const player: Player = {
    id,
    event_id: eventId,
    name: name.trim() || '评委',
    initial_bias: null,
    faction: null,
    profession: null,
    state: 'SIGNED_IN',
    token: randomUUID()
  };
  players.set(id, player);
  if (!eventPhase.has(eventId)) eventPhase.set(eventId, 'SIGNED_IN');
  analytics.push({ event_type: 'ENROLL', player_id: id, payload: { name: player.name }, at: new Date().toISOString() });
  return player;
}

export function mustPlayer(id: string): Player {
  const p = players.get(id);
  if (!p) {
    const e = new Error('NOT_FOUND') as Error & { code?: string; status?: number };
    e.code = 'NOT_FOUND';
    e.status = 404;
    throw e;
  }
  return p;
}

export function setState(player: Player, next: PlayerState) {
  player.state = next;
}

const EVENT_PHASE_ORDER: PlayerState[] = [
  'SIGNED_IN',
  'DAY1_EXPLORING',
  'MASK_CRAFTING',
  'FIRE_NIGHT',
  'FACTION_LOCKED',
  'DAY2_PREPARING',
  'BATTLE_R1',
  'BATTLE_R2',
  'BATTLE_R3',
  'ENDING'
];

export function setEventPhase(eventId: string, phase: PlayerState) {
  const current = eventPhase.get(eventId);
  if (current && EVENT_PHASE_ORDER.indexOf(phase) < EVENT_PHASE_ORDER.indexOf(current)) return;
  eventPhase.set(eventId, phase);
}

export function getEventPhase(eventId: string): PlayerState {
  return eventPhase.get(eventId) ?? 'SIGNED_IN';
}

export function stateForRound(roundNo: number): PlayerState {
  return roundNo === 1 ? 'BATTLE_R1' : roundNo === 2 ? 'BATTLE_R2' : 'BATTLE_R3';
}

export function roundForState(state: PlayerState): number | null {
  return state === 'BATTLE_R1' ? 1 : state === 'BATTLE_R2' ? 2 : state === 'BATTLE_R3' ? 3 : null;
}

export function getMask(playerId: string): Mask {
  let m = masks.get(playerId);
  if (!m) {
    m = {
      player_id: playerId,
      fragments_json: emptyFragments(),
      style: null,
      name: null,
      motto: null
    };
    masks.set(playerId, m);
  }
  return m;
}

export function addFragment(playerId: string, pattern: string, delta: number): Fragments {
  const m = getMask(playerId);
  const key = patternKey(pattern);
  m.fragments_json[key] = Math.min(5, (m.fragments_json[key] ?? 0) + delta);
  return { ...m.fragments_json };
}

export function findCard(code: string): ContentCard | undefined {
  const q = code.trim();
  return cards.find(
    (c) =>
      c.id === q ||
      c.scene_id === q ||
      c.codes?.includes(q) ||
      c.title === q
  );
}

export function markScan(playerId: string, cardId: string): boolean {
  const key = `${playerId}:${cardId}`;
  if (scanned.has(key)) return false;
  scanned.add(key);
  return true;
}

export function addInventory(row: {
  player_id: string;
  source_type: string;
  name: string;
  description?: string;
  day2_effect_json: { res_type: string; delta: number; one_time: boolean } | null;
}) {
  const item = { id: randomUUID(), ...row };
  inventory.push(item);
  return item;
}

export function listInventory(playerId: string) {
  return inventory.filter((i) => i.player_id === playerId);
}

export function listScannedCards(playerId: string) {
  return cards.filter((c) => scanned.has(`${playerId}:${c.id}`));
}

export function addWall(playerId: string, patternId: string) {
  if (wallPlayers.has(playerId)) {
    const error = new Error('CODE_USED') as Error & { code?: string; status?: number };
    error.code = 'CODE_USED';
    error.status = 409;
    throw error;
  }
  wallPlayers.add(playerId);
  wall.push({ player_id: playerId, pattern_id: patternId, at: new Date().toISOString() });
  return wall.length;
}

export function hasWallStroke(playerId: string) {
  return wallPlayers.has(playerId);
}

/** Returns the player's persisted co-painting choice, if they have completed it. */
export function wallPatternForPlayer(playerId: string): string | null {
  return wall.find((stroke) => stroke.player_id === playerId)?.pattern_id ?? null;
}

export type SelectedVirtue = 'ren' | 'yi' | 'li' | 'zhi' | 'xin';

/** Maps the selected wall pattern to the virtue used to render a player's face. */
export function selectedVirtueForPlayer(playerId: string): SelectedVirtue | null {
  const patternId = wallPatternForPlayer(playerId);
  const match = patternId?.match(/^virtue-(ren|yi|li|zhi|xin)-01$/);
  return (match?.[1] as SelectedVirtue | undefined) ?? null;
}

export function wallTotal() {
  return wall.length;
}

export function trackAnalytics(playerId: string, eventType: string, payload?: unknown) {
  analytics.push({ event_type: eventType, player_id: playerId, payload, at: new Date().toISOString() });
}

export function claimQuest(playerId: string, questId: string) {
  claimed.add(`${playerId}:${questId}`);
}

export function completeQuest(playerId: string, questId: string, code: string) {
  const quest = quests.find((q) => q.id === questId);
  if (!quest) {
    const e = new Error('NOT_FOUND') as Error & { code?: string; status?: number };
    e.code = 'NOT_FOUND';
    e.status = 404;
    throw e;
  }
  if (quest.one_time_code && quest.one_time_code !== code) {
    const e = new Error('BAD_REQUEST') as Error & { code?: string; status?: number };
    e.code = 'BAD_REQUEST';
    e.status = 400;
    throw e;
  }
  const usedKey = `${code}`;
  if (usedCodes.has(usedKey)) {
    const e = new Error('CODE_USED') as Error & { code?: string; status?: number };
    e.code = 'CODE_USED';
    e.status = 409;
    throw e;
  }
  usedCodes.add(usedKey);
  completed.add(`${playerId}:${questId}`);
  const player = mustPlayer(playerId);
  for (const r of quest.reward_json.res ?? []) {
    appendLedger(playerId, player.faction, r.res_type, r.delta, `quest:${questId}`);
  }
  if (quest.reward_json.fragment) {
    addFragment(playerId, quest.reward_json.fragment.pattern, quest.reward_json.fragment.delta);
  }
  return quest.reward_json;
}

export function appendLedger(
  playerId: string,
  faction: string | null,
  resType: string,
  delta: number,
  source: string
) {
  if (delta === 0) return;
  ledger.push({
    id: randomUUID(),
    player_id: playerId,
    faction,
    res_type: normalizeRes(resType),
    delta,
    source,
    occurred_at: new Date().toISOString()
  });
}

export function factionBalances(eventId: string, faction: string | null): Record<string, number> {
  const out = { 工材: 0, 粮草: 0, 铜令: 0, 民心: 0 };
  if (!faction) return out;
  const playerIds = new Set(
    allPlayers()
      .filter((player) => player.event_id === eventId && player.faction === faction)
      .map((player) => player.id)
  );
  for (const row of ledger) {
    if (!playerIds.has(row.player_id)) continue;
    const key = row.res_type as keyof typeof out;
    if (key in out) out[key] += row.delta;
  }
  return out;
}

export function spendFactionResource(player: Player, resType: string, amount: number, source: string) {
  const normalized = normalizeRes(resType);
  const available = factionBalances(player.event_id, player.faction)[normalized] ?? 0;
  if (amount <= 0 || available < amount) {
    const error = new Error('INSUFFICIENT_RESOURCE') as Error & { code?: string; status?: number };
    error.code = 'INSUFFICIENT_RESOURCE';
    error.status = 409;
    throw error;
  }
  appendLedger(player.id, player.faction, normalized, -amount, source);
}

export function grantFactionResource(player: Player, resType: string, amount: number, source: string) {
  if (amount <= 0) return;
  appendLedger(player.id, player.faction, normalizeRes(resType), amount, source);
}

export function provisionDay2Resources(player: Player) {
  if (day2Provisioned.has(player.id)) return;
  day2Provisioned.add(player.id);
  for (const [resType, amount] of Object.entries({ 工材: 3, 粮草: 3, 铜令: 2, 民心: 2 })) {
    grantFactionResource(player, resType, amount, 'day2:provision');
  }
}

export function balances(playerId: string): Record<string, number> {
  const out = { 工材: 0, 粮草: 0, 铜令: 0, 民心: 0 };
  for (const row of ledger) {
    if (row.player_id !== playerId) continue;
    const k = row.res_type as keyof typeof out;
    if (k in out) out[k] += row.delta;
  }
  return out;
}

export function getRound(roundId: string) {
  return rounds.find((r) => r.id === roundId);
}

export function getBattle(roundId: string): BattleState {
  const s = battleByRound.get(roundId);
  if (!s) {
    const e = new Error('NOT_FOUND') as Error & { code?: string; status?: number };
    e.code = 'NOT_FOUND';
    e.status = 404;
    throw e;
  }
  return s;
}

export function applyEffect(state: BattleState, effect: Record<string, number | string>) {
  if (typeof effect.gate_hp === 'number') state.gate_hp = Math.max(0, state.gate_hp + effect.gate_hp);
  if (typeof effect.grain_blocked_min === 'number') {
    state.grain_blocked_min = Math.max(0, state.grain_blocked_min + effect.grain_blocked_min);
  }
  if (typeof effect.tower_a === 'string') state.tower_a = effect.tower_a;
  if (typeof effect.tower_b === 'string') state.tower_b = effect.tower_b;
  if (typeof effect.tower_c === 'string') state.tower_c = effect.tower_c;
  if (typeof effect.cars_delivered === 'number') state.cars_delivered += effect.cars_delivered;
  if (typeof effect.cars_broken === 'number') state.cars_broken += effect.cars_broken;
}

export function pickBot(): BotAction {
  return pickBotForStep(battleLog.filter((entry) => entry.actor === '新火盟').length);
}

/** Demo bots are deterministic so a replay never delegates rules to the browser. */
export function pickBotForStep(step: number): BotAction {
  return botActions[step % Math.max(botActions.length, 1)] ?? {
    id: 'fallback-gate',
    target_type: 'gate',
    target_id: 'main',
    weight: 1,
    cost: {},
    effect: { gate_hp: -6 },
    narration: '新火盟试探城门。'
  };
}

export function dominantPattern(fr: Fragments): string {
  const entries = (Object.keys(fr) as (keyof Fragments)[]).map((k) => [patternCn(k), fr[k]] as const);
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? '石';
}

export function professionFor(pattern: string): string {
  const map: Record<string, string> = {
    证: '觅迹者',
    石: '说面人',
    工: '百工者',
    人: '领鼓人',
    火: '护火者'
  };
  return map[pattern] ?? '说面人';
}

export function allPlayers(): Player[] {
  return [...players.values()];
}

export function tacticalSnapshot() {
  const r1 = getBattle(rounds[0].id);
  const r2 = getBattle(rounds[1].id);
  const r3 = getBattle(rounds[2].id);
  return {
    cars_delivered: r1.cars_delivered + r2.cars_delivered + r3.cars_delivered,
    cars_broken: r1.cars_broken + r2.cars_broken + r3.cars_broken,
    gate_hp: r3.gate_hp,
    grain_blocked_min: r1.grain_blocked_min + r2.grain_blocked_min + r3.grain_blocked_min
  };
}

export function registerDay2Mission(
  player: Player,
  missionType: Day2MissionType,
  targetId: 'A' | 'B' | 'C' | 'D'
): Day2Registration {
  const key = `${player.id}:${missionType}:${targetId}`;
  const existing = registrations.get(key);
  if (existing) return existing;
  const registration = { player_id: player.id, mission_type: missionType, target_id: targetId, created_at: new Date().toISOString() };
  registrations.set(key, registration);
  return registration;
}

export function registrationsForPlayer(playerId: string): Day2Registration[] {
  return [...registrations.values()].filter((registration) => registration.player_id === playerId);
}

export function hasDay2Registration(playerId: string, missionType: Day2MissionType, targetId: string): boolean {
  return registrations.has(`${playerId}:${missionType}:${targetId}`);
}

export function getEscortRun(route: string): EscortRun | undefined {
  return escortRuns.get(route);
}

export function startEscort(route: 'A' | 'B' | 'C' | 'D', playerId: string): EscortRun {
  const existing = escortRuns.get(route);
  if (existing) return existing;
  const run: EscortRun = {
    route,
    started_at: new Date().toISOString(),
    started_by: playerId,
    completed_at: null,
    completed_by: null,
    integrity: 100,
    broken_at: null,
    ambushes: []
  };
  escortRuns.set(route, run);
  return run;
}

export function completeEscort(route: string, playerId: string): EscortRun {
  const run = escortRuns.get(route);
  if (!run) {
    const error = new Error('STATE_INVALID') as Error & { code?: string; status?: number };
    error.code = 'STATE_INVALID';
    error.status = 409;
    throw error;
  }
  if (run.completed_at || run.broken_at) return run;
  run.completed_at = new Date().toISOString();
  run.completed_by = playerId;
  return run;
}

export function escortProgress(run: EscortRun, now = Date.now()): number {
  if (run.completed_at) return 100;
  if (run.broken_at) return 0;
  const elapsed = Math.max(0, now - Date.parse(run.started_at));
  return Math.min(95, Math.floor(elapsed / 1000));
}

export function ambushEscort(route: string, playerId: string, checkpoint: 1 | 2, damage: number): EscortRun {
  const run = escortRuns.get(route);
  if (!run || run.completed_at || run.broken_at) {
    const error = new Error('STATE_INVALID') as Error & { code?: string; status?: number };
    error.code = 'STATE_INVALID';
    error.status = 409;
    throw error;
  }
  const duplicate = run.ambushes.some((ambush) => ambush.player_id === playerId && ambush.checkpoint === checkpoint);
  if (duplicate) {
    const error = new Error('CODE_USED') as Error & { code?: string; status?: number };
    error.code = 'CODE_USED';
    error.status = 409;
    throw error;
  }
  run.ambushes.push({ player_id: playerId, checkpoint, damage, at: new Date().toISOString() });
  run.integrity = Math.max(0, run.integrity - damage);
  if (run.integrity === 0) run.broken_at = new Date().toISOString();
  return run;
}

export function markDay2Scan(playerId: string, code: string): boolean {
  const key = `${playerId}:${code}`;
  if (day2ScanKeys.has(key)) return false;
  day2ScanKeys.add(key);
  return true;
}

export function day2World(player: Player) {
  const phase = getEventPhase(player.event_id);
  const roundNo = roundForState(phase) ?? 0;
  const state = getBattle(rounds[Math.max(0, roundNo - 1)]?.id ?? rounds[0].id);
  const ownsTower = [state.tower_a, state.tower_b, state.tower_c].some((owner) => owner === player.faction);
  return {
    phase,
    round: roundNo,
    resources: factionBalances(player.event_id, player.faction),
    npc_points: npcs
      .filter((npc) => ['npc-02', 'npc-05', 'npc-06'].includes(npc.id))
      .map((npc) => ({ id: npc.id, label: npc.name, role: npc.role, position: npc.location, layer: npc.layer, source: npc.source })),
    resource_points: [
      { id: 'material-yard', resource: '工材', position: '石场' },
      { id: 'grain-road', resource: '粮草', position: '粮道' }
    ],
    routes: [...escortRuns.values()].map((run) => ({
      route: run.route,
      started_at: run.started_at,
      progress: escortProgress(run),
      integrity: run.integrity,
      status: run.completed_at ? 'DELIVERED' : run.broken_at ? 'BROKEN' : 'MOVING'
    })),
    gate: { hp: state.gate_hp, max_hp: 100 },
    grain: { blocked_min: state.grain_blocked_min, defender_stock: factionBalances(player.event_id, '守文盟').粮草, attacker_stock: factionBalances(player.event_id, '新火盟').粮草 },
    towers: { A: state.tower_a, B: state.tower_b, C: state.tower_c },
    route_visibility: ownsTower,
    registrations: registrationsForPlayer(player.id),
    reports: battleLog.slice(-12)
  };
}

export function assessDay2Outcome(player: Player): 'ENDING' | null {
  const snapshot = tacticalSnapshot();
  const states = rounds.map((round) => getBattle(round.id));
  const liveState = states.find((state) => state.gate_hp < 100 || state.grain_blocked_min > 0 || state.cars_broken > 0) ?? states[0];
  const allTowersLost = [liveState.tower_a, liveState.tower_b, liveState.tower_c].every((tower) => tower === '新火盟');
  const gateBroken = states.some((state) => state.gate_hp <= 0);
  if (gateBroken || snapshot.grain_blocked_min >= 30 || allTowersLost || snapshot.cars_broken >= 2) {
    setEventPhase(player.event_id, 'ENDING');
    for (const participant of allPlayers().filter((item) => item.event_id === player.event_id)) setState(participant, 'ENDING');
    return 'ENDING';
  }
  return null;
}

export function adminSnapshot(eventId: string) {
  const eventPlayers = allPlayers().filter((player) => player.event_id === eventId);
  const stateCounts = eventPlayers.reduce<Record<string, number>>((counts, player) => {
    counts[player.state] = (counts[player.state] ?? 0) + 1;
    return counts;
  }, {});
  const lastActivity = new Map<string, string>();
  for (const event of analytics) {
    if (!event.player_id || !eventPlayers.some((player) => player.id === event.player_id)) continue;
    const prior = lastActivity.get(event.player_id);
    if (!prior || prior < event.at) lastActivity.set(event.player_id, event.at);
  }
  const staleThreshold = Date.now() - 5 * 60 * 1000;
  const stalledPlayers = eventPlayers
    .filter((player) => {
      const last = lastActivity.get(player.id);
      return !last || Date.parse(last) < staleThreshold;
    })
    .map((player) => ({ id: player.id, name: player.name, state: player.state, last_active: lastActivity.get(player.id) ?? null }));
  const routes = (['A', 'B', 'C', 'D'] as const).map((route) => {
    const run = escortRuns.get(route);
    return run
      ? { route, started_at: run.started_at, progress: escortProgress(run), integrity: run.integrity, status: run.completed_at ? 'DELIVERED' : run.broken_at ? 'BROKEN' : 'MOVING' }
      : { route, started_at: null, progress: 0, integrity: 100, status: 'PENDING' };
  });
  return {
    event: { id: eventId, phase: getEventPhase(eventId) },
    player_state_counts: stateCounts,
    faction_resources: [
      { faction: '守文盟', resources: factionBalances(eventId, '守文盟') },
      { faction: '新火盟', resources: factionBalances(eventId, '新火盟') }
    ],
    routes,
    reports: battleLog.slice(-50),
    stalled_players: stalledPlayers,
    analytics_events: analytics.filter((event) => event.player_id && eventPlayers.some((player) => player.id === event.player_id)).slice(-50)
  };
}
