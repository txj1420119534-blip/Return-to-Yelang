import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const port = 8791;
const server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/index.ts'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, PORT: String(port) },
  stdio: 'pipe'
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error('server did not become healthy');
}

async function request(path, token, body = {}, adminKey) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-player-token': token } : {}), ...(adminKey ? { 'x-admin-key': adminKey } : {}) },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

try {
  await waitForHealth();
  const enrolled = await request('/api/enroll', null, { name: '验收者' });
  assert.equal(enrolled.status, 200);
  const token = enrolled.body.token;

  const beastPlayer = await request('/api/enroll', null, { name: '神兽内容验收者' });
  assert.equal((await request('/api/pick-mask-base', beastPlayer.body.token, { base_id: 'base-1' })).status, 200);
  const beastCard = await request('/api/scan', beastPlayer.body.token, { code: '寻源兽·鱼' });
  assert.equal(beastCard.status, 200);
  assert.equal(beastCard.body.content_card.title, '寻源兽·鱼');
  assert.equal(beastCard.body.content_card.source, '《夜郎神兽》项目设定');

  const latePlayer = await request('/api/enroll', null, { name: '迟到共绘者' });
  assert.equal((await request('/api/pick-mask-base', latePlayer.body.token, { base_id: 'base-1' })).status, 200);
  assert.equal((await request('/api/ai/mask-motto', latePlayer.body.token)).status, 200);

  const invalidEnter = await request('/api/day2/enter', token);
  assert.equal(invalidEnter.status, 409, 'Day1 cannot bypass the fire-night transition');

  assert.equal((await request('/api/pick-mask-base', token, { player_id: 'forged-id', base_id: 'base-1' })).status, 200);
  assert.equal((await request('/api/paint-wall', token, { player_id: 'forged-id', pattern_id: 'virtue-ren-01' })).status, 409, 'exploring cannot submit a wall stroke');
  assert.equal((await request('/api/paint-wall', token, { pattern_id: 'not-a-stroke' })).status, 422, 'wall strokes are allowlisted');
  assert.equal((await request('/api/upload-craft', token, { player_id: 'forged-id', image_base64: 'data:image/gif;base64,aQ==' })).status, 422, 'craft upload rejects non-allowlisted image MIME types');
  assert.equal((await request('/api/upload-craft', token, { image_base64: `data:image/png;base64,${'A'.repeat(2_800_000)}` })).status, 422, 'craft upload rejects images above 2 MiB');
  const craft = await request('/api/upload-craft', token, { player_id: 'forged-id', image_base64: 'data:image/png;base64,aQ==' });
  assert.equal(craft.status, 200);
  assert.equal(craft.body.image_received, true);
  assert.equal((await request('/api/ai/mask-motto', token, { player_id: 'forged-id' })).status, 200);
  assert.equal((await request('/api/paint-wall', token, { player_id: 'forged-id', pattern_id: 'virtue-yi-01' })).status, 200);
  const duplicateWall = await request('/api/paint-wall', token, { player_id: 'forged-id', pattern_id: 'virtue-xin-01' });
  assert.equal(duplicateWall.status, 409);
  assert.equal(duplicateWall.body.error, 'CODE_USED', 'a player may paint exactly one wall stroke');
  assert.equal((await request('/api/admin/snapshot', token, { player_id: 'forged-id' })).status, 403, 'a player token is not an admin credential');
  assert.equal((await request('/api/admin/snapshot', token, {}, 'wrong-admin-key')).status, 403, 'an invalid admin key is rejected');
  const admin = await request('/api/admin/snapshot', token, { player_id: 'forged-id' }, 'yelang-demo-admin');
  assert.equal(admin.status, 200);
  assert.equal(admin.body.event.phase, 'FIRE_NIGHT');
  assert.equal(admin.body.routes.length, 4);
  assert.deepEqual(admin.body.stalled_players, []);
  assert.equal((await request('/api/lock-faction', token, {})).status, 403, 'player token cannot lock a faction');
  assert.equal((await request('/api/lock-faction', token, {}, 'yelang-demo-admin')).status, 200, 'correct admin key can lock a faction');
  const entered = await request('/api/day2/enter', token);
  assert.equal(entered.status, 200);
  assert.equal(entered.body.state, 'DAY2_PREPARING');
  assert.equal(entered.body.resources.工材, 3);
  assert.equal((await request('/api/day2/demo/faction', token, { faction: '无名盟' })).status, 422, 'demo faction is allowlisted');
  const switchedFaction = await request('/api/day2/demo/faction', token, { faction: '新火盟' });
  assert.equal(switchedFaction.status, 200);
  assert.equal(switchedFaction.body.faction, '新火盟');
  assert.equal((await request('/api/day2/demo/faction', token, { faction: '守文盟' })).status, 200, 'demo can return to the defending faction');
  assert.equal((await request('/api/battle/action', token, { round_id: '22222222-2222-2222-2222-000000000001', target_type: 'gate', target_id: 'main' })).status, 409, 'battle action cannot open battle from preparation');
  assert.equal((await request('/api/battle/bot-tick', token, { round_id: '22222222-2222-2222-2222-000000000001' })).status, 409, 'bot cannot open battle from preparation');

  const registration = await request('/api/day2/register', token, { mission_type: 'escort', target_id: 'A' });
  assert.equal(registration.status, 200);
  assert.equal((await request('/api/day2/register', token, { mission_type: 'escort', target_id: 'A' })).status, 200, 'registration is idempotent');
  assert.equal((await request('/api/day2/scan', token, { code: 'ESCORT-A-START' })).status, 200);
  assert.equal((await request('/api/day2/scan', token, { code: 'ESCORT-A-START' })).status, 409, 'route start is global single-use');
  assert.equal((await request('/api/paint-wall', latePlayer.body.token, { pattern_id: 'virtue-li-01' })).status, 200, 'a late player may still finish their personal wall stroke');
  const afterLateStroke = await request('/api/admin/snapshot', token, {}, 'yelang-demo-admin');
  assert.equal(afterLateStroke.body.event.phase, 'BATTLE_R1', 'a late wall stroke cannot rewind the event phase');
  const delivered = await request('/api/day2/scan', token, { code: 'ESCORT-A-END' });
  assert.equal(delivered.status, 200);
  assert.equal(delivered.body.day2.routes[0].status, 'DELIVERED');

  assert.equal((await request('/api/day2/register', token, { mission_type: 'escort', target_id: 'C' })).status, 200);
  const simulatedStart = await request('/api/day2/scan', token, { code: 'ESCORT-C-START', simulated: true });
  assert.equal(simulatedStart.status, 200);
  assert.equal(simulatedStart.body.simulated, true, 'demo scan is explicitly marked in the response');
  const simulatedEnd = await request('/api/day2/scan', token, { code: 'ESCORT-C-END', simulated: true });
  assert.equal(simulatedEnd.status, 200);
  assert.equal(simulatedEnd.body.day2.routes.find((route) => route.route === 'C')?.status, 'DELIVERED');

  assert.equal((await request('/api/day2/register', token, { mission_type: 'escort', target_id: 'B' })).status, 200);
  assert.equal((await request('/api/day2/register', token, { mission_type: 'ambush', target_id: 'B' })).status, 200);
  assert.equal((await request('/api/day2/scan', token, { code: 'ESCORT-B-START' })).status, 200);
  const ambush = await request('/api/day2/scan', token, { code: 'AMBUSH-B-1' });
  assert.equal(ambush.status, 200);
  assert.equal(ambush.body.effect.attacker_grain_low, true, 'low outside grain applies the server-side ambush coefficient');

  assert.equal((await request('/api/day2/scan', token, { code: 'GATE-MAIN' })).status, 200);
  assert.equal((await request('/api/day2/scan', token, { code: 'GATE-MAIN' })).status, 409, 'physical QR cannot be replayed');
  const tower = await request('/api/day2/scan', token, { code: 'TOWER-A' });
  assert.equal(tower.status, 200);
  assert.equal(tower.body.day2.route_visibility, true, 'an owned tower reveals the route map');

  // Fixed server costs drain the shared pool; a fourth gate action must not create negative resources.
  for (let index = 0; index < 2; index += 1) {
    assert.equal((await request('/api/battle/action', token, { round_id: '22222222-2222-2222-2222-000000000001', target_type: 'gate', target_id: 'main', cost: { 工材: 999 } })).status, 200);
  }
  const insufficient = await request('/api/battle/action', token, { round_id: '22222222-2222-2222-2222-000000000001', target_type: 'gate', target_id: 'main', cost: { 工材: 0 } });
  assert.equal(insufficient.status, 409);

  for (let index = 0; index < 3; index += 1) {
    assert.equal((await request('/api/battle/bot-tick', token, { round_id: '22222222-2222-2222-2222-000000000001' })).status, 200);
  }
  const roundTwo = await request('/api/day2/snapshot', token);
  assert.equal(roundTwo.body.day2.round, 2, 'three deterministic bot steps advance the server-controlled round');
  assert.equal((await request('/api/battle/action', token, { round_id: '22222222-2222-2222-2222-000000000001', target_type: 'event', target_id: 'save' })).status, 409, 'closed rounds cannot be replayed');

  // A server-controlled immediate defeat freezes every subsequent Day2 write.
  for (let index = 0; index < 8; index += 1) {
    await request('/api/battle/action', token, { round_id: '22222222-2222-2222-2222-000000000002', target_type: 'event', target_id: 'save' });
  }
  const frozen = await request('/api/day2/register', token, { mission_type: 'ambush', target_id: 'B' });
  assert.equal(frozen.status, 409, 'ENDING freezes writes');
  assert.equal((await request('/api/scan', token, { code: 'scene-shicheng-01' })).status, 409, 'ENDING freezes Day1 scan rewards');
  assert.equal((await request('/api/upload-craft', token, { workshop_id: 'ws-01' })).status, 409, 'ENDING freezes craft rewards');
  assert.equal((await request('/api/ai/mask-motto', token, {})).status, 409, 'ENDING freezes mask motto writes');
  assert.equal((await request('/api/quest/claim', token, { quest_id: '11111111-1111-1111-1111-000000000001' })).status, 409, 'ENDING freezes quest writes');
  console.log('Day2 smoke: PASS');
} finally {
  server.kill();
}
