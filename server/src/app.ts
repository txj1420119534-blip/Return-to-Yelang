import cors from 'cors';
import { timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { callAI } from './lib/ai.js';
import {
  addFragment,
  addInventory,
  addWall,
  adminSnapshot,
  allPlayers,
  ambushEscort,
  appendLedger,
  applyEffect,
  assetPart,
  balances,
  battleLog,
  claimQuest,
  completeQuest,
  dominantPattern,
  emptyFragments,
  enroll,
  EVENT_ID,
  findCard,
  getBattle,
  getEventPhase,
  getEscortRun,
  getMask,
  hasWallStroke,
  getPlayerByToken,
  getRound,
  listInventory,
  listScannedCards,
  markScan,
  mottoTemplates,
  mustPlayer,
  patternCn,
  pickBot,
  pickBotForStep,
  provisionDay2Resources,
  professionFor,
  quests,
  rounds,
  setState,
  setEventPhase,
  spendFactionResource,
  grantFactionResource,
  registerDay2Mission,
  hasDay2Registration,
  startEscort,
  completeEscort,
  markDay2Scan,
  day2World,
  assessDay2Outcome,
  stateForRound,
  roundForState,
  selectedVirtueForPlayer,
  tacticalSnapshot,
  trackAnalytics,
  wallPatternForPlayer,
  wallTotal,
  type Fragments,
  type PlayerState
} from './memory.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

const dbConfigured = Boolean(
  process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your-')
);
const aiConfigured = Boolean(
  process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('xxxx')
);
const isProduction = process.env.NODE_ENV === 'production';
const demoMode = process.env.DEMO_MODE !== 'false';
const configuredAdminKey = process.env.ADMIN_KEY ?? (isProduction ? '' : 'yelang-demo-admin');

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'yelang-server',
    mode: dbConfigured ? 'supabase' : 'memory',
    db: dbConfigured,
    ai: aiConfigured,
    event_id: EVENT_ID
  });
});

app.get('/', (_req, res) => {
  res.type('text').send('重返夜郎国 API · GET /health · POST /api/*');
});

type AuthedRequest = Request & { playerId?: string };

const DAY2_WRITABLE_STATES: PlayerState[] = ['DAY2_PREPARING', 'BATTLE_R1', 'BATTLE_R2', 'BATTLE_R3'];
const DAY2_CODE = /^(?:ESCORT-([A-D])-(START|END)|AMBUSH-([A-D])-(1|2)|GATE-MAIN|GRAIN-(IN|OUT)|TOWER-([A-C]))$/;
const enrollSchema = z.object({ name: z.string().trim().min(1).max(32).optional(), event_id: z.string().uuid().optional() });
const day2EnterSchema = z.object({}).strict();
const day2DemoFactionSchema = z.object({ faction: z.enum(['守文盟', '新火盟']) }).strict();
const day2RegisterSchema = z.object({ mission_type: z.enum(['escort', 'ambush']), target_id: z.enum(['A', 'B', 'C', 'D']) });
const day2ScanSchema = z.object({ code: z.string().trim().min(3).max(48), simulated: z.boolean().optional().default(false) }).strict();
const craftUploadSchema = z.object({
  workshop_id: z.string().trim().min(1).max(64).optional(),
  image_base64: z.string().min(1).max(3_000_000).optional()
});
const paintWallSchema = z.object({
  pattern_id: z.enum([
    'virtue-ren-01',
    'virtue-yi-01',
    'virtue-li-01',
    'virtue-zhi-01',
    'virtue-xin-01',
    'stroke-stone-01',
    'stroke-flame-01',
    'stroke-ink-01',
    'stroke-jade-01'
  ])
});
const MAX_CRAFT_IMAGE_BYTES = 2 * 1024 * 1024;

function playerFromRequest(req: Request) {
  const playerId = (req as AuthedRequest).playerId;
  if (!playerId) {
    const error = new Error('UNAUTHORIZED') as Error & { code?: string; status?: number };
    error.code = 'UNAUTHORIZED';
    error.status = 401;
    throw error;
  }
  return mustPlayer(playerId);
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown, res: Response): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    fail(res, 422, 'SCHEMA_INVALID', parsed.error.issues.map((issue) => issue.path.join('.') || issue.message).join(', '));
    return null;
  }
  return parsed.data;
}

function day2Unlocked(state: PlayerState) {
  return ['FIRE_NIGHT', 'FACTION_LOCKED', 'DAY2_PREPARING', 'BATTLE_R1', 'BATTLE_R2', 'BATTLE_R3', 'ENDING'].includes(state);
}

function ensureDay2Writable(player: ReturnType<typeof mustPlayer>) {
  if (player.state === 'ENDING' || getEventPhase(player.event_id) === 'ENDING') {
    const error = new Error('STATE_INVALID') as Error & { code?: string; status?: number };
    error.code = 'STATE_INVALID';
    error.status = 409;
    throw error;
  }
  if (!DAY2_WRITABLE_STATES.includes(player.state)) {
    const error = new Error('STATE_INVALID') as Error & { code?: string; status?: number };
    error.code = 'STATE_INVALID';
    error.status = 409;
    throw error;
  }
}

function rejectEndedWrite(player: ReturnType<typeof mustPlayer>, res: Response): boolean {
  if (player.state !== 'ENDING' && getEventPhase(player.event_id) !== 'ENDING') return false;
  fail(res, 409, 'STATE_INVALID', 'event has ended; writes are frozen');
  return true;
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!configuredAdminKey) {
    fail(res, 503, 'ADMIN_UNAVAILABLE', 'ADMIN_KEY must be configured in production');
    return false;
  }
  const provided = req.header('x-admin-key') ?? '';
  const expectedBuffer = Buffer.from(configuredAdminKey);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    fail(res, 403, 'FORBIDDEN', 'valid x-admin-key required');
    return false;
  }
  return true;
}

function validateCraftImage(imageBase64: string | undefined): { imageReceived: boolean; valid: boolean } {
  if (!imageBase64) return { imageReceived: false, valid: true };
  const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(imageBase64);
  if (!match) {
    return { imageReceived: false, valid: false };
  }
  const payload = match[1];
  const bytes = Math.floor((payload.length * 3) / 4) - (payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0);
  if (bytes <= 0 || bytes > MAX_CRAFT_IMAGE_BYTES) {
    return { imageReceived: false, valid: false };
  }
  return { imageReceived: true, valid: true };
}

function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.path === '/enroll') return next();
  const token = String(req.header('x-player-token') ?? '');
  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', detail: 'missing x-player-token' });
    return;
  }
  const player = getPlayerByToken(token);
  if (!player) {
    res.status(401).json({ error: 'UNAUTHORIZED', detail: 'invalid token' });
    return;
  }
  req.playerId = player.id;
  next();
}

function fail(res: Response, status: number, error: string, detail: string) {
  res.status(status).json({ error, detail });
}

function styleFromBase(baseId: string, fr: Fragments) {
  const n = (v: number, max: number) => String(Math.min(max, Math.max(1, v || 1)));
  const base = assetPart(baseId);
  return {
    base,
    eye: `eye-${n(fr.shi, 8)}`,
    mouth: `mouth-${n(fr.ren, 4)}`,
    brow: `forehead-${n(fr.zheng, 6)}`,
    aux: [fr.gong > 0 ? `cheek-${n(fr.gong, 6)}` : '', fr.huo > 0 ? `aura-${n(fr.huo, 4)}` : ''].filter(
      Boolean
    )
  };
}

app.use('/api', (req, res, next) => {
  if (req.path === '/enroll') return next();
  auth(req as AuthedRequest, res, next);
});

app.post('/api/enroll', (req, res) => {
  const body = parseBody(enrollSchema, req.body, res);
  if (!body) return;
  const player = enroll(body.name ?? '评委', body.event_id ?? EVENT_ID);
  res.json({
    player_id: player.id,
    token: player.token,
    event_id: player.event_id,
    state: player.state
  });
});

app.post('/api/session', (req, res) => {
  const player = playerFromRequest(req);
  const day = day2Unlocked(player.state) ? 2 : 1;
  const wallPatternId = wallPatternForPlayer(player.id);
  const selectedVirtue = selectedVirtueForPlayer(player.id);
  res.json({
    player: { ...player, token: undefined },
    mask: { ...getMask(player.id), wall_pattern_id: wallPatternId, selected_virtue: selectedVirtue },
    wall_pattern_id: wallPatternId,
    selected_virtue: selectedVirtue,
    day,
    day2_unlocked: day2Unlocked(player.state),
    resources: player.faction ? day2World(player).resources : balances(player.id),
    day2: day2World(player)
  });
});

app.post('/api/day2/enter', (req, res) => {
  const body = parseBody(day2EnterSchema, req.body ?? {}, res);
  if (!body) return;
  const player = playerFromRequest(req);
  if (!['FIRE_NIGHT', 'FACTION_LOCKED', 'DAY2_PREPARING'].includes(player.state)) {
    fail(res, 409, 'STATE_INVALID', `cannot enter Day2 from ${player.state}`);
    return;
  }
  // The judge is always the defending faction; real hostile players are assigned by operations.
  if (!player.faction) {
    const fragments = getMask(player.id).fragments_json;
    player.faction = '守文盟';
    player.profession = professionFor(dominantPattern(fragments));
  }
  setState(player, 'DAY2_PREPARING');
  if (!['BATTLE_R1', 'BATTLE_R2', 'BATTLE_R3'].includes(getEventPhase(player.event_id))) {
    setEventPhase(player.event_id, 'DAY2_PREPARING');
  }
  provisionDay2Resources(player);
  res.json({ ok: true, state: player.state, faction: player.faction, profession: player.profession, resources: day2World(player).resources, day2: day2World(player) });
});

app.post('/api/day2/demo/faction', (req, res) => {
  const body = parseBody(day2DemoFactionSchema, req.body, res);
  if (!body) return;
  if (isProduction && !demoMode) {
    fail(res, 403, 'DEMO_ONLY', 'demo faction switching is disabled in production');
    return;
  }
  const player = playerFromRequest(req);
  ensureDay2Writable(player);
  player.faction = body.faction;
  provisionDay2Resources(player);
  trackAnalytics(player.id, 'DEMO_FACTION_SWITCH', { faction: body.faction });
  res.json({ ok: true, faction: player.faction, day2: day2World(player) });
});

app.post('/api/day2/register', (req, res) => {
  const body = parseBody(day2RegisterSchema, req.body, res);
  if (!body) return;
  const player = playerFromRequest(req);
  ensureDay2Writable(player);
  const registration = registerDay2Mission(player, body.mission_type, body.target_id);
  res.json({ ok: true, registration, day2: day2World(player) });
});

app.post('/api/day2/snapshot', (req, res) => {
  const player = playerFromRequest(req);
  res.json({ day2: day2World(player) });
});

function defenderGrainModifier(player: ReturnType<typeof mustPlayer>) {
  const defenderGrain = day2World(player).grain.defender_stock;
  const attackerGrain = day2World(player).grain.attacker_stock;
  return { defenderLow: defenderGrain <= 1, attackerLow: attackerGrain <= 1 };
}

function activeBattle(player: ReturnType<typeof mustPlayer>) {
  const roundNo = roundForState(getEventPhase(player.event_id)) ?? 1;
  return getBattle(rounds[roundNo - 1].id);
}

app.post('/api/day2/scan', (req, res) => {
  const body = parseBody(day2ScanSchema, req.body, res);
  if (!body) return;
  const player = playerFromRequest(req);
  ensureDay2Writable(player);
  if (body.simulated && isProduction && !demoMode) {
    fail(res, 403, 'DEMO_ONLY', 'simulated scans are disabled in production');
    return;
  }
  const code = body.code.toUpperCase();
  const match = DAY2_CODE.exec(code);
  if (!match) {
    fail(res, 404, 'NOT_FOUND', 'unknown Day2 QR code');
    return;
  }
  const eventPhase = getEventPhase(player.event_id);
  const setBattleOne = () => {
    if (eventPhase === 'DAY2_PREPARING') {
      setEventPhase(player.event_id, 'BATTLE_R1');
      setState(player, 'BATTLE_R1');
    }
  };
  let kind = 'scan';
  let effect: Record<string, unknown> = {};

  if (match[1]) {
    const route = match[1] as 'A' | 'B' | 'C' | 'D';
    const stage = match[2];
    if (!hasDay2Registration(player.id, 'escort', route)) {
      fail(res, 403, 'FORBIDDEN', 'register an escort mission before scanning this route');
      return;
    }
    setBattleOne();
    if (stage === 'START') {
      const existing = getEscortRun(route);
      if (existing) {
        fail(res, 409, 'CODE_USED', 'escort route has already started');
        return;
      }
      const run = startEscort(route, player.id);
      kind = 'escort_started';
      effect = { route, started_at: run.started_at, progress: 0 };
    } else {
      const run = getEscortRun(route);
      if (!run) {
        fail(res, 409, 'STATE_INVALID', 'scan the escort start point before the end point');
        return;
      }
      if (run.completed_at || run.broken_at) {
        fail(res, 409, 'CODE_USED', 'escort route is already settled');
        return;
      }
      completeEscort(route, player.id);
      const state = activeBattle(player);
      applyEffect(state, { cars_delivered: 1 });
      grantFactionResource(player, '铜令', 1, `escort:${route}:end`);
      battleLog.push({ round_id: state.round_id, narration: `护送车 ${route} 抵达终点。`, at: new Date().toISOString(), actor: player.name });
      kind = 'escort_completed';
      effect = { route, cars_delivered: 1 };
    }
  } else if (match[3]) {
    const route = match[3] as 'A' | 'B' | 'C' | 'D';
    const checkpoint = Number(match[4]) as 1 | 2;
    if (!hasDay2Registration(player.id, 'ambush', route)) {
      fail(res, 403, 'FORBIDDEN', 'register an ambush mission before scanning this checkpoint');
      return;
    }
    setBattleOne();
    const modifier = defenderGrainModifier(player);
    const damage = Math.max(3, 10 + (modifier.defenderLow ? 5 : 0) - (modifier.attackerLow ? 3 : 0));
    if (body.simulated && !getEscortRun(route)) startEscort(route, 'demo-opponent');
    const run = ambushEscort(route, player.id, checkpoint, damage);
    const state = activeBattle(player);
    if (run.broken_at) applyEffect(state, { cars_broken: 1 });
    battleLog.push({ round_id: state.round_id, narration: `路线 ${route} 遭伏击，文化车耐久 ${run.integrity}。`, at: new Date().toISOString(), actor: player.name });
    kind = 'ambush';
    effect = { route, checkpoint, damage, integrity: run.integrity, defender_grain_low: modifier.defenderLow, attacker_grain_low: modifier.attackerLow };
  } else if (code === 'GATE-MAIN') {
    if (!markDay2Scan(player.id, code)) {
      fail(res, 409, 'CODE_USED', 'gate QR has already been used by this player');
      return;
    }
    setBattleOne();
    const state = activeBattle(player);
    if (player.faction === '守文盟') {
      spendFactionResource(player, '工材', 1, 'scan:gate:reinforce');
      applyEffect(state, { gate_hp: 8 });
      effect = { gate_hp: 8, cost: { 工材: 1 } };
    } else {
      const modifier = defenderGrainModifier(player);
      const damage = 8 + (modifier.defenderLow ? 4 : 0) - (modifier.attackerLow ? 2 : 0);
      applyEffect(state, { gate_hp: -Math.max(3, damage) });
      effect = { gate_hp: -Math.max(3, damage) };
    }
    kind = 'gate';
  } else if (match[5]) {
    if (!markDay2Scan(player.id, code)) {
      fail(res, 409, 'CODE_USED', 'grain QR has already been used by this player');
      return;
    }
    setBattleOne();
    const state = activeBattle(player);
    if (match[5] === 'IN' && player.faction === '守文盟') {
      grantFactionResource(player, '粮草', 2, 'scan:grain:in');
      effect = { 粮草: 2 };
    } else if (match[5] === 'OUT' && player.faction === '新火盟') {
      applyEffect(state, { grain_blocked_min: 10 });
      effect = { grain_blocked_min: 10 };
    } else {
      fail(res, 403, 'FORBIDDEN', 'this grain point is controlled by the opposing faction');
      return;
    }
    kind = 'grain';
  } else if (match[6]) {
    if (!markDay2Scan(player.id, code)) {
      fail(res, 409, 'CODE_USED', 'tower QR has already been used by this player');
      return;
    }
    setBattleOne();
    const tower = match[6].toLowerCase() as 'a' | 'b' | 'c';
    const state = activeBattle(player);
    applyEffect(state, { [`tower_${tower}`]: player.faction ?? '守文盟' });
    effect = { tower: tower.toUpperCase(), owner: player.faction };
    kind = 'tower';
  }
  assessDay2Outcome(player);
  if (body.simulated) trackAnalytics(player.id, 'DAY2_SIMULATED_SCAN', { code, kind });
  res.json({ ok: true, kind, code, simulated: body.simulated, effect, day2: day2World(player) });
});

app.post('/api/pick-mask-base', (req, res) => {
  const baseId = String(req.body?.base_id ?? '');
  if (!baseId) {
    fail(res, 400, 'BAD_REQUEST', 'base_id required');
    return;
  }
  const player = playerFromRequest(req);
  if (rejectEndedWrite(player, res)) return;
  if (player.state !== 'SIGNED_IN' && player.state !== 'DAY1_EXPLORING') {
    fail(res, 409, 'STATE_INVALID', `cannot pick mask from ${player.state}`);
    return;
  }
  player.initial_bias = baseId;
  const mask = getMask(player.id);
  mask.style = styleFromBase(baseId, mask.fragments_json);
  setState(player, 'DAY1_EXPLORING');
  res.json({ ok: true, state: player.state });
});

app.post('/api/scan', (req, res) => {
  const code = String(req.body?.code ?? req.body?.manual ?? '');
  if (!code) {
    fail(res, 400, 'BAD_REQUEST', 'code required');
    return;
  }
  const player = playerFromRequest(req);
  if (rejectEndedWrite(player, res)) return;
  const card = findCard(code);
  if (!card) {
    fail(res, 404, 'NOT_FOUND', `unknown code: ${code}`);
    return;
  }
  const first = markScan(player.id, card.id);
  const totals = first
    ? addFragment(player.id, card.fragment.pattern, card.fragment.delta)
    : { ...getMask(player.id).fragments_json };
  res.json({
    content_card: {
      id: card.id,
      title: card.title,
      body: card.body,
      layer: card.layer,
      source: card.source,
      image_url: card.image_url ?? null,
      audio_url: card.audio_url,
      duration_sec: 20
    },
    fragment_gain: first ? card.fragment : { pattern: card.fragment.pattern, delta: 0 },
    new_totals: totals
  });
});

app.post('/api/upload-craft', async (req, res) => {
  const body = parseBody(craftUploadSchema, req.body, res);
  if (!body) return;
  const workshopId = body.workshop_id ?? 'ws-01';
  const player = playerFromRequest(req);
  if (rejectEndedWrite(player, res)) return;
  const image = validateCraftImage(body.image_base64);
  if (!image.valid) {
    fail(res, 422, 'SCHEMA_INVALID', 'image_base64 must be jpeg/png/webp data URL no larger than 2 MiB');
    return;
  }
  const fallback = { name: `工坊之作 · ${workshopId}`, description: '一件尚未命名的手作，先记入收藏。' };
  const ai = await callAI({
    schema: z.object({ name: z.string(), description: z.string() }),
    system: '你为夜郎谷工坊手作起名。不要编造历史事实。返回 JSON。',
    prompt: `workshop_id=${workshopId}，为一件傩意面具/蜡染手作起短名和一句描述。`,
    fallback
  });
  if (ai.usedFallback) res.setHeader('x-ai-fallback', '1');
  trackAnalytics(player.id, 'CRAFT_UPLOAD', { workshop_id: workshopId, image_received: image.imageReceived });
  const item = addInventory({
    player_id: player.id,
    source_type: 'craft',
    name: ai.data.name,
    description: ai.data.description,
    day2_effect_json: { res_type: '民心', delta: 2, one_time: true }
  });
  const totals = addFragment(player.id, '工', 1);
  res.json({
    inventory_id: item.id,
    name: item.name,
    description: ai.data.description,
    fragment_gain: { pattern: '工', delta: 1 },
    new_totals: totals,
    day2_effect: item.day2_effect_json,
    image_received: image.imageReceived,
    ai_fallback: ai.usedFallback
  });
});

app.post('/api/mask-preview', (req, res) => {
  const player = playerFromRequest(req);
  const mask = getMask(player.id);
  const base = player.initial_bias ?? 'base-1';
  const style = mask.style ?? styleFromBase(base, mask.fragments_json);
  mask.style = style;
  res.json({
    svg_parts: style,
    fragments: mask.fragments_json,
    name: mask.name,
    motto: mask.motto,
    state: player.state,
    wall_pattern_id: wallPatternForPlayer(player.id),
    selected_virtue: selectedVirtueForPlayer(player.id),
    faction: player.faction,
    profession: player.profession,
    inventory: listInventory(player.id),
    cards: listScannedCards(player.id),
    resources: balances(player.id)
  });
});

app.post('/api/paint-wall', (req, res) => {
  const body = parseBody(paintWallSchema, req.body, res);
  if (!body) return;
  const player = playerFromRequest(req);
  if (rejectEndedWrite(player, res)) return;
  if (hasWallStroke(player.id)) {
    fail(res, 409, 'CODE_USED', 'each player may submit only one wall stroke');
    return;
  }
  if (player.state !== 'MASK_CRAFTING') {
    fail(res, 409, 'STATE_INVALID', `cannot submit wall stroke from ${player.state}`);
    return;
  }
  const total = addWall(player.id, body.pattern_id);
  addFragment(player.id, '火', 1);
  setState(player, 'FIRE_NIGHT');
  setEventPhase(player.event_id, 'FIRE_NIGHT');
  trackAnalytics(player.id, 'PAINT_WALL', { pattern_id: body.pattern_id });
  res.json({
    ok: true,
    wall_total: total,
    state: player.state,
    wall_pattern_id: body.pattern_id,
    selected_virtue: selectedVirtueForPlayer(player.id)
  });
});

app.post('/api/admin/snapshot', (req, res) => {
  const player = playerFromRequest(req);
  if (!requireAdmin(req, res)) return;
  res.json(adminSnapshot(player.event_id));
});

app.post('/api/lock-faction', (req, res) => {
  const requester = playerFromRequest(req);
  if (!requireAdmin(req, res)) return;
  if (rejectEndedWrite(requester, res)) return;
  if (requester.state !== 'FIRE_NIGHT' && requester.state !== 'FACTION_LOCKED') {
    fail(res, 409, 'STATE_INVALID', `cannot lock faction from ${requester.state}`);
    return;
  }
  const fr = getMask(requester.id).fragments_json;
  requester.faction = '守文盟';
  requester.profession = professionFor(dominantPattern(fr));
  setState(requester, 'FACTION_LOCKED');
  const assignments = [{ player_id: requester.id, faction: requester.faction, profession: requester.profession }];
  res.json({ assignments });
});

app.post('/api/quest/claim', (req, res) => {
  const questId = String(req.body?.quest_id ?? '');
  const player = playerFromRequest(req);
  if (rejectEndedWrite(player, res)) return;
  claimQuest(player.id, questId);
  if (player.state === 'FACTION_LOCKED') setState(player, 'DAY2_PREPARING');
  res.json({ ok: true, state: player.state, quests });
});

app.post('/api/quest/complete', (req, res) => {
  const questId = String(req.body?.quest_id ?? '');
  const code = String(req.body?.one_time_code ?? '');
  const player = playerFromRequest(req);
  if (rejectEndedWrite(player, res)) return;
  const reward = completeQuest(player.id, questId, code);
  if (player.state === 'FACTION_LOCKED' || player.state === 'DAY2_PREPARING') {
    setState(player, 'DAY2_PREPARING');
  }
  res.json({ reward, resources: player.faction ? day2World(player).resources : balances(player.id), state: player.state });
});

app.post('/api/battle/action', (req, res) => {
  const roundId = String(req.body?.round_id ?? rounds[0].id);
  const targetType = String(req.body?.target_type ?? 'route');
  const targetId = String(req.body?.target_id ?? 'A');
  const player = playerFromRequest(req);
  ensureDay2Writable(player);
  const round = getRound(roundId);
  if (!round) {
    fail(res, 404, 'NOT_FOUND', 'round not found');
    return;
  }
  const expectedRound = roundForState(getEventPhase(player.event_id));
  if (!expectedRound || round.round_no !== expectedRound) {
    fail(res, 409, 'STATE_INVALID', `round ${round.round_no} is not active`);
    return;
  }
  const state = getBattle(roundId);
  const nextState: PlayerState =
    round.round_no === 1 ? 'BATTLE_R1' : round.round_no === 2 ? 'BATTLE_R2' : 'BATTLE_R3';
  setState(player, nextState);
  setEventPhase(player.event_id, nextState);

  // Legacy action surface remains for the existing client. Costs are a fixed server table,
  // never an untrusted numeric value supplied by the browser.
  const fixedCost = targetType === 'gate' ? { 工材: 1 } : targetType === 'route' ? { 铜令: 1 } : {};
  for (const [resType, amount] of Object.entries(fixedCost)) spendFactionResource(player, resType, amount, `battle:${roundId}`);

  if (targetType === 'gate') applyEffect(state, { gate_hp: 5 });
  if (targetType === 'route') applyEffect(state, { cars_delivered: 1 });
  if (targetType === 'event' && targetId === 'save') applyEffect(state, { gate_hp: -18 });
  if (targetType === 'event' && targetId === 'defend') applyEffect(state, { cars_broken: 1, gate_hp: 4 });

  const narration =
    targetType === 'event'
      ? targetId === 'save'
        ? '守文盟选择救工坊文物。城门一时间无人加固。'
        : '守文盟选择守城墙。工坊的火只能先看着。'
      : targetType === 'gate'
        ? '守文盟把工材压上城门。'
        : `守文盟派出护送队走路线 ${targetId}。`;
  battleLog.push({ round_id: roundId, narration, at: new Date().toISOString(), actor: player.name });
  assessDay2Outcome(player);

  res.json({
    action_id: `${Date.now()}`,
    new_state: state,
    resources: day2World(player).resources,
    player_state: player.state,
    log: battleLog.filter((l) => l.round_id === roundId)
  });
});

app.post('/api/battle/bot-tick', (req, res) => {
  const roundId = String(req.body?.round_id ?? rounds[0].id);
  const player = playerFromRequest(req);
  ensureDay2Writable(player);
  const round = getRound(roundId);
  if (!round) {
    fail(res, 404, 'NOT_FOUND', 'round not found');
    return;
  }
  const expectedRound = roundForState(getEventPhase(player.event_id));
  if (!expectedRound || round.round_no !== expectedRound) {
    fail(res, 409, 'STATE_INVALID', `round ${round.round_no} is not active`);
    return;
  }
  const state = getBattle(roundId);
  const action = pickBotForStep(battleLog.filter((entry) => entry.round_id === roundId && entry.actor === '新火盟').length);
  applyEffect(state, action.effect);
  battleLog.push({
    round_id: roundId,
    narration: action.narration,
    at: new Date().toISOString(),
    actor: '新火盟'
  });
  const botSteps = battleLog.filter((entry) => entry.round_id === roundId && entry.actor === '新火盟').length;
  if (!assessDay2Outcome(player) && botSteps >= 3) {
    if (round.round_no === 3) {
      setEventPhase(player.event_id, 'ENDING');
      for (const participant of allPlayers().filter((item) => item.event_id === player.event_id)) setState(participant, 'ENDING');
    } else {
      const nextState = stateForRound(round.round_no + 1);
      setEventPhase(player.event_id, nextState);
      for (const participant of allPlayers().filter((item) => item.event_id === player.event_id && item.state !== 'ENDING')) {
        setState(participant, nextState);
      }
    }
  }
  res.json({
    action: {
      target_type: action.target_type,
      target_id: action.target_id,
      effect: action.effect,
      narration: action.narration
    },
    new_state: state
  });
});

app.post('/api/ai/narrate', async (req, res) => {
  const roundId = String(req.body?.round_id ?? rounds[0].id);
  const round = getRound(roundId);
  const fallback = { text: `第 ${round?.round_no ?? 1} 轮结束，双方各有胜负。`, highlights: ['gate', 'grain'] };
  const ai = await callAI({
    schema: z.object({ text: z.string(), highlights: z.array(z.string()) }),
    system: '你写夜郎谷攻防战报，短、冷、不编造史实。',
    prompt: `round=${round?.round_no} log=${JSON.stringify(battleLog.filter((l) => l.round_id === roundId))}`,
    fallback
  });
  if (ai.usedFallback) res.setHeader('x-ai-fallback', '1');
  res.json(ai.data);
});

app.post('/api/ai/mask-motto', async (req, res) => {
  const player = playerFromRequest(req);
  if (rejectEndedWrite(player, res)) return;
  const mask = getMask(player.id);
  const lead = dominantPattern(mask.fragments_json);
  const pool = mottoTemplates[lead] ?? ['以石为字'];
  const fallback = { name: `${lead}语`, motto: pool[0] };
  const ai = await callAI({
    schema: z.object({ name: z.string(), motto: z.string() }),
    system: '根据五面纹碎片写一句面语。不要编造历史结论。',
    prompt: JSON.stringify(mask.fragments_json),
    fallback
  });
  if (ai.usedFallback) res.setHeader('x-ai-fallback', '1');
  mask.name = ai.data.name;
  mask.motto = ai.data.motto;
  if (player.state === 'DAY1_EXPLORING') setState(player, 'MASK_CRAFTING');
  res.json({ name: mask.name, motto: mask.motto, state: player.state });
});

app.post('/api/ending', (req, res) => {
  const player = playerFromRequest(req);
  if (player.state !== 'ENDING' && player.state !== 'BATTLE_R3') {
    fail(res, 409, 'STATE_INVALID', `cannot generate ending from ${player.state}`);
    return;
  }
  const mask = getMask(player.id);
  const tac = tacticalSnapshot();
  setState(player, 'ENDING');
  const cultural =
    tac.cars_delivered >= 2
      ? {
          code: 'DUAL_SYMBIOSIS',
          title: '双面共生',
          text: '车到了。城还在。旧物没有被说成唯一答案，新火也没有把名字烧掉。'
        }
      : {
          code: 'CITY_HELD_FIRE_OUT',
          title: '城守而火熄',
          text: '门还在，但夜里的火没有被接住。'
        };
  res.json({
    tactical: tac,
    cultural,
    card: {
      svg_parts: mask.style ?? styleFromBase(player.initial_bias ?? 'base-1', mask.fragments_json || emptyFragments()),
      name: mask.name ?? '未名面',
      motto: mask.motto ?? '先听完，再决定站哪边'
    }
  });
});

app.post('/api/demo/snapshot', (req, res) => {
  const player = playerFromRequest(req);
  res.json({
    player,
    mask: getMask(player.id),
    resources: balances(player.id),
    inventory: listInventory(player.id),
    cards: listScannedCards(player.id),
    quests,
    rounds,
    wall_total: wallTotal()
  });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { code?: string; status?: number; message?: string };
  const status = e.status ?? (e.code === 'NOT_FOUND' ? 404 : e.code === 'STATE_INVALID' ? 409 : 500);
  res.status(status).json({ error: e.code ?? 'INTERNAL', detail: e.message ?? 'internal' });
});

export { app };
