export type Fragments = {
  zheng: number;
  shi: number;
  gong: number;
  ren: number;
  huo: number;
};

export type SvgParts = {
  base: string;
  eye: string;
  mouth: string;
  brow: string;
  aux: string[];
};

export type ContentCard = {
  id: string;
  title: string;
  layer: string;
  body: string;
  source?: string;
  image_url?: string | null;
};

export type VirtueId = 'ren' | 'yi' | 'li' | 'zhi' | 'xin';

export const VIRTUE_OPTIONS = [
  { id: 'ren', name: '仁', patternId: 'virtue-ren-01' },
  { id: 'yi', name: '义', patternId: 'virtue-yi-01' },
  { id: 'li', name: '礼', patternId: 'virtue-li-01' },
  { id: 'zhi', name: '智', patternId: 'virtue-zhi-01' },
  { id: 'xin', name: '信', patternId: 'virtue-xin-01' }
] as const satisfies ReadonlyArray<{ id: VirtueId; name: string; patternId: string }>;

export type InventoryItem = {
  id: string;
  name: string;
  description?: string;
  day2_effect_json?: { res_type: string; delta: number };
};

export type Preview = {
  svg_parts: SvgParts;
  fragments: Fragments;
  name: string | null;
  motto: string | null;
  selected_virtue?: VirtueId | null;
  wall_pattern_id?: string | null;
  state?: string;
  faction?: string | null;
  profession?: string | null;
  inventory: InventoryItem[];
  cards: ContentCard[];
  resources: Record<string, number>;
};

export type Player = {
  id?: string;
  player_id?: string;
  name?: string;
  state: string;
  faction?: string | null;
  profession?: string | null;
};

export type MapPoint = {
  id: string;
  name: string;
  label?: string;
  position?: string;
  x?: number;
  y?: number;
  resource_type?: string;
  resource?: string;
  status?: string;
};

export type Convoy = {
  id?: string;
  route_id?: string;
  progress?: number;
  status?: string;
};

export type Day2State = {
  phase: string;
  round: number | null;
  resources: Record<string, number>;
  npc_points: MapPoint[];
  resource_points: MapPoint[];
  routes: Array<{ id?: string; route?: string; name?: string; status?: string; progress?: number; integrity?: number; started_at?: string | null }>;
  gate: { hp: number | null; max_hp: number | null };
  grain: { blocked_min: number | null; defender_stock: number | null; attacker_stock: number | null };
  towers: Record<string, string | null>;
  route_visibility: boolean;
  registrations: Array<{ mission_type?: string; target_id?: string; status?: string }>;
  reports: Array<{ id?: string; text?: string; message?: string; created_at?: string } | string>;
  convoys?: Convoy[];
};

export type SessionSnapshot = {
  player: Player;
  mask?: Preview | null;
  day: number;
  day2_unlocked: boolean;
  resources: Record<string, number>;
  day2?: Day2State | null;
};

// Legacy demo components remain in the tree for reference; these exports keep
// them type-safe while the active routes use the server-owned Day2 snapshot.
export type BattleState = {
  gate_hp: number;
  grain_blocked_min: number;
  tower_a: string | null;
  tower_b?: string | null;
  tower_c?: string | null;
  cars_delivered: number;
  cars_broken: number;
  attacker_camps?: number;
};

export const ROUNDS = [
  '22222222-2222-2222-2222-000000000001',
  '22222222-2222-2222-2222-000000000002',
  '22222222-2222-2222-2222-000000000003'
];

export const DAY2_QUEST = '11111111-1111-1111-1111-000000000002';

export const EMPTY_FRAGMENTS: Fragments = { zheng: 0, shi: 0, gong: 0, ren: 0, huo: 0 };

export const EMPTY_PREVIEW: Preview = {
  svg_parts: { base: 'base-1', eye: '', mouth: '', brow: '', aux: [] },
  fragments: EMPTY_FRAGMENTS,
  name: null,
  motto: null,
  inventory: [],
  cards: [],
  resources: {}
};

export const EMPTY_DAY2: Day2State = {
  phase: 'PREPARING',
  round: null,
  resources: {},
  npc_points: [],
  resource_points: [],
  routes: [],
  gate: { hp: null, max_hp: null },
  grain: { blocked_min: null, defender_stock: null, attacker_stock: null },
  towers: { A: null, B: null, C: null },
  route_visibility: false,
  registrations: [],
  reports: [],
  convoys: []
};

export const FRAG_META: { key: keyof Fragments; cn: string; image: string; hint: string }[] = [
  { key: 'zheng', cn: '仁', image: 'ren', hint: '观照与相助' },
  { key: 'shi', cn: '义', image: 'yi', hint: '担当与选择' },
  { key: 'gong', cn: '礼', image: 'li', hint: '仪式与手作' },
  { key: 'ren', cn: '智', image: 'zhi', hint: '求证与辨识' },
  { key: 'huo', cn: '信', image: 'xin', hint: '同行与守诺' }
];

const LEGACY_PATTERN_TO_VIRTUE: Record<string, string> = {
  证: '仁',
  石: '义',
  工: '礼',
  人: '智',
  火: '信'
};

export function displayPatternName(pattern: string) {
  return LEGACY_PATTERN_TO_VIRTUE[pattern] ?? pattern;
}

export const SCENES = [
  { code: '寻源兽·鱼', title: '寻源兽·鱼', layer: '展览介绍', blurb: '神职为“寻源”，它带人逆流而上，记住来处。关键字：寻。', tone: 'jade' as const, icon: '/assets/icon/frag-zheng.svg' },
  { code: '破界兽·飞鸟', title: '破界兽·飞鸟', layer: '展览介绍', blurb: '神职为“破界”，它越过旧界，把勇气带向新路。关键字：勇。', tone: 'stone' as const, icon: '/assets/icon/frag-shi.svg' },
  { code: '照心兽·日面', title: '照心兽·日面', layer: '展览介绍', blurb: '神职为“照见”，它照见人真实的内心。关键字：真。', tone: 'bronze' as const, icon: '/assets/icon/frag-gong.svg' },
  { code: '负山兽·驮城', title: '负山兽·驮城', layer: '展览介绍', blurb: '神职为“担当”，它负城而行，把重量变成承诺。关键字：担。', tone: 'workshop' as const, icon: '/assets/icon/frag-ren.svg' },
  { code: '听世兽·长喙', title: '听世兽·长喙', layer: '展览介绍', blurb: '神职为“听心”，它听见言语之后未说出的声音。关键字：听。', tone: 'people' as const, icon: '/assets/icon/frag-huo.svg' },
  { code: '两极兽·双首', title: '两极兽·双首', layer: '展览介绍', blurb: '神职为“传承”，一首回望，一首向前，把所得传给下一人。关键字：给。', tone: 'stage' as const, icon: '/assets/icon/frag-zheng.svg' }
];

export function isDay2UnlockedState(state?: string | null) {
  return Boolean(state && ['FIRE_NIGHT', 'FACTION_LOCKED', 'DAY2_PREPARING', 'BATTLE_R1', 'BATTLE_R2', 'BATTLE_R3', 'ENDING'].includes(state));
}

export function isDay2State(state?: string | null) {
  return Boolean(state && (state.startsWith('DAY2') || state.startsWith('BATTLE') || state === 'ENDING'));
}
