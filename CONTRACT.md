# CONTRACT.md — 《重返夜郎国》全项目契约

> 冻结日期：2026-08-29
> 本文件由 A 机维护。B 机、C 机以此为准。**字段名、API 路径、SVG 命名、Realtime 频道一经冻结不再改动。**
> 与旧文档冲突时以本文件为准。新增字段/接口须走 A 机 PR，追加到本文末尾的"变更记录"节。

---

## 0. 通用约定

- HTTP：全部 `POST /api/*`，`Content-Type: application/json`，返回 `application/json`。
- 认证：MVP 阶段 header `x-player-token: {token}`（token = player_id，Demo 简化）。`/api/enroll` 无需 token。
- 时间：所有时间戳用 ISO 8601 UTC 字符串（`timestamptz`）。
- ID：uuid v4，字符串序列化。
- 错误格式：`{ "error": "SNAKE_CASE_CODE", "detail": "human readable" }`，HTTP 状态码见 §8。
- 前端**禁止直接写库**。资源变动只能通过 `/api/quest/complete`、`/api/battle/action` 走后端账本。
- AI 响应必须 JSON Schema 校验，超时 3s 退模板；主链路无 AI 也能跑完。

---

## 1. 冻结枚举

### 1.1 阵营 `faction`
- `守文盟` — 守方，评委扮演
- `新火盟` — 攻方，Demo 由 bot 扮演

### 1.2 面纹 `pattern`（数据库存中文单字，JSON key 用拼音）

| 中文 | key | 说明 |
|---|---|---|
| 证 | `zheng` | 博物馆扫展品 / 夜郎谷观览扫景点 |
| 石 | `shi`   | 拍照寻踪、隐藏点位 |
| 工 | `gong`  | 非遗工坊手作 |
| 人 | `ren`   | 与 NPC / 玩家协作 |
| 火 | `huo`   | 演出、傩面舞、共绘 |

### 1.3 物资 `res_type`
- `工材` `gong_cai`
- `粮草` `liang_cao`
- `铜令` `tong_ling`
- `民心` `min_xin`

### 1.4 职业 `profession`
- `觅迹者` `mi_ji_zhe`
- `百工者` `bai_gong_zhe`
- `说面人` `shuo_mian_ren`
- `护火者` `hu_huo_zhe`
- `领鼓人` `ling_gu_ren`

### 1.5 玩家状态机 `players.state`
```
SIGNED_IN → DAY1_EXPLORING → MASK_CRAFTING → FIRE_NIGHT
  → FACTION_LOCKED → DAY2_PREPARING → BATTLE_R1 → BATTLE_R2 → BATTLE_R3 → ENDING
```
后端接口按当前 state 校验合法性；非法转移返回 `409 STATE_INVALID`。

### 1.6 事件阶段 `events.current_phase`
与玩家状态同名（枚举一致），驱动运营屏和 bot 调度。

### 1.7 内容分层 `content_cards.layer`
- `史证` `historical`
- `活态非遗` `heritage`
- `谷中艺术` `valley_art`
- `游戏演绎` `game_lore`

### 1.8 战场目标类型 `battle_actions.target_type`
- `route`      护送路线 A/B/C/D
- `gate`       城门
- `tower`      哨塔 a/b/c
- `grain`      粮草通道
- `camp`       攻方营地 1/2/3/4
- `event`      AI 触发事件的抉择

### 1.9 结局代码 `ending.code`
- `DUAL_SYMBIOSIS` — 双面共生
- `CITY_HELD_FIRE_OUT` — 城守而火熄
- `GATE_OPEN_MASK_SCATTER` — 门开而纹散
- `NAMELESS_CITY` — 无名之城

---

## 2. JSON 字段结构（数据库 JSONB 与 API 通用）

### 2.1 `masks.fragments_json`
```json
{ "zheng": 0, "shi": 0, "gong": 0, "ren": 0, "huo": 0 }
```
每项 `number`，取值 `0..5`。合计 ≥ 8 才允许进入 `MASK_CRAFTING`。

### 2.2 `masks.style` (SVG 部件组合)
```json
{
  "base": "base-01",
  "eye":  "eye-03",
  "mouth":"mouth-02",
  "brow": "brow-05",
  "aux":  ["aux-flame-01", "aux-stone-02"]
}
```
`base/eye/mouth/brow` 必填，`aux` 可选数组。前端按 §5 SVG 命名去 `/assets/mask/` 拼图。

### 2.3 `inventory.day2_effect_json`
```json
{ "res_type": "工材", "delta": 2, "one_time": true }
```
Day2 使用时消费；`one_time=true` 消费后从库存移除。

### 2.4 `quests.reward_json`
```json
{ "res": [{ "res_type": "粮草", "delta": 3 }],
  "fragment": { "pattern": "人", "delta": 1 },
  "inventory": null }
```

### 2.5 `battle_actions.cost_json` / `effect_json`
```json
// cost
{ "gong_cai": 1, "liang_cao": 0, "tong_ling": 0, "min_xin": 0 }
// effect（写入 battle_state 的增量）
{ "gate_hp": +5, "tower_a": "守文盟", "grain_blocked_min": -10 }
```

### 2.6 `analytics_events.payload_json`
自由 JSON，建议 `{ "path": "...", "context": {...} }`。

---

## 3. 数据库表（Postgres / Supabase）

字段来自圣经 §8，细化如下。**完整 DDL 见 `supabase/migrations/0001_init.sql`。**

| 表 | 主键 | 说明 |
|---|---|---|
| `events` | `id` | 一场活动一行；`current_phase` 驱动全场节奏 |
| `players` | `id` | `state` enum；`initial_bias` 是选面型倾向 |
| `masks` | `player_id` | 一玩家一张；`fragments_json` 五纹碎片 |
| `inventory` | `id` | 手作/收藏，`day2_effect_json` 记 Day2 加成 |
| `content_cards` | `id` | 扫描内容库；C 机在 `content/cards.json` 提供 |
| `quests` | `id` | 悬赏，`one_time_code` 与 NPC 挂钩 |
| `quest_progress` | (player_id, quest_id) | 领取/完成状态 |
| `resource_ledger` | `id` | **append-only**；`CHECK (delta != 0)` |
| `battle_rounds` | `id` | 每轮一行 |
| `battle_actions` | `id` | 攻防动作流水 |
| `battle_state` | `round_id` | 每轮实时状态 |
| `analytics_events` | `id` | 埋点，用于掉队检测 |
| `npc_codes` | `id` | NPC 一次性码，防重放 |

聚合视图：
- `v_faction_resources(event_id, faction, res_type, balance)`
- `v_player_mask(player_id, zheng, shi, gong, ren, huo, total)`

Realtime 打开：`resource_ledger`、`battle_actions`、`battle_state`、`masks`。

---

## 4. REST API 契约

所有接口 `POST`，均需 `x-player-token`（`/api/enroll` 除外）。请求体 `application/json`。

### 4.1 `/api/enroll` — 玩家扫码入场
- **Req**: `{ "name": "小明", "event_id": "uuid-可选，默认取当前 active event" }`
- **Res**: `{ "player_id": "uuid", "token": "uuid", "event_id": "uuid", "state": "SIGNED_IN" }`
- 副作用：insert `players`，写 `analytics_events{event_type:"ENROLL"}`

### 4.2 `/api/pick-mask-base` — 选初始面型
- **Req**: `{ "player_id": "uuid", "base_id": "base-01" }`
- **Res**: `{ "ok": true, "state": "DAY1_EXPLORING" }`
- 副作用：update `players.initial_bias`；`state` 从 `SIGNED_IN` → `DAY1_EXPLORING`；upsert 空 `masks` 行

### 4.3 `/api/scan` — 扫码/图识景点/展品/工坊
- **Req**: `{ "player_id": "uuid", "code": "scene:shicheng-01" }` 或 `{ "player_id":"uuid", "image_base64":"..." }`
- **Res**:
```json
{ "content_card": { "id": "...", "title": "石城之眼", "body": "...", "layer": "史证",
                    "audio_url": "assets/audio/shicheng-01.mp3", "duration_sec": 20 },
  "fragment_gain": { "pattern": "石", "delta": 1 },
  "new_totals": { "zheng":0,"shi":1,"gong":0,"ren":0,"huo":0 } }
```
- 副作用：insert `content_cards` 关联（若首次），update `masks.fragments_json`

### 4.4 `/api/upload-craft` — 上传手作照片
- **Req**: `{ "player_id":"uuid", "image_base64":"...", "workshop_id":"ws-01" }`
- **Res**: `{ "inventory_id":"uuid", "name":"未名蓝面", "description":"...", "fragment_gain":{"pattern":"工","delta":1} }`
- AI 命名走 `lib/ai.ts`；超时退模板 `"工坊之作 · {ws}"`

### 4.5 `/api/mask-preview` — 拉取当前数字面
- **Req**: `{ "player_id":"uuid" }`
- **Res**:
```json
{ "svg_parts": { "base":"base-01","eye":"eye-03","mouth":"mouth-02","brow":"brow-05","aux":["aux-flame-01"] },
  "fragments": { "zheng":1,"shi":1,"gong":1,"ren":1,"huo":0 },
  "name": "石语",
  "motto": "以石为字，以火为言" }
```

### 4.6 `/api/paint-wall` — 傩面共绘提交一道纹
- **Req**: `{ "player_id":"uuid", "pattern_id":"stroke-fire-03" }`
- **Res**: `{ "ok": true, "wall_total": 137 }`
- 副作用：broadcast Realtime `mask-wall:{event_id}` payload `{ player_id, pattern_id, at }`

### 4.7 `/api/lock-faction` — 阵营锁定（后台触发）
- **Req**: `{ "event_id":"uuid" }`（管理员接口）
- **Res**:
```json
{ "assignments": [
  { "player_id":"uuid", "faction":"守文盟", "profession":"说面人" }
]}
```
- 规则：按 `fragments_json` 主导纹分派；评委机强制守文盟

### 4.8 `/api/quest/claim` — 领任务
- **Req**: `{ "player_id":"uuid", "quest_id":"uuid" }`
- **Res**: `{ "ok": true }`

### 4.9 `/api/quest/complete` — NPC 扫码确认完成
- **Req**: `{ "player_id":"uuid", "quest_id":"uuid", "one_time_code":"NPC-A7Q3" }`
- **Res**: `{ "reward": { "res":[{"res_type":"粮草","delta":3}], "fragment": null, "inventory": null } }`
- 副作用：写 `resource_ledger`（**唯一入账口之一**），标记 `npc_codes.used_by`

### 4.10 `/api/battle/action` — 攻防动作
- **Req**: `{ "player_id":"uuid", "round_id":"uuid", "target_type":"gate", "target_id":"main", "cost":{"gong_cai":1} }`
- **Res**: `{ "new_state": { "gate_hp":75, "tower_a":"守文盟", ... }, "action_id":"uuid" }`
- 副作用：insert `battle_actions` + 写 `resource_ledger` 负 delta + update `battle_state`；broadcast `battle:round:{round_id}`

### 4.11 `/api/battle/bot-tick` — 敌方 bot 定时动作
- **Req**: `{ "round_id":"uuid" }`（管理员/定时器）
- **Res**: `{ "action": { "target_type":"grain", "target_id":"main", "effect":{"grain_blocked_min":+5} } }`
- 从 `content/bot_actions.json` 随机抽取一条 → 写 `battle_actions` + `battle_state`

### 4.12 `/api/ai/narrate` — 生成战报
- **Req**: `{ "round_id":"uuid", "since":"ISO8601" }`
- **Res**: `{ "text":"第 1 轮 · 石城之下…", "highlights":["gate","grain"] }`
- 超时退模板 `"第 {n} 轮结束，双方各有胜负。"`

### 4.13 `/api/ai/mask-motto` — 生成面语
- **Req**: `{ "player_id":"uuid" }`
- **Res**: `{ "name":"石语", "motto":"以石为字，以火为言" }`
- 超时退模板：按主导纹从 `content/motto_templates.json` 抽

### 4.14 `/api/ending` — 生成最终结局
- **Req**: `{ "player_id":"uuid" }`
- **Res**:
```json
{ "tactical": { "cars_delivered": 2, "gate_hp": 40, "grain_blocked_min": 12 },
  "cultural": { "code":"DUAL_SYMBIOSIS", "title":"双面共生", "text":"..." },
  "card":     { "svg_parts":{...}, "name":"石语", "motto":"..." } }
```

---

## 5. SVG 命名规范（C 机放 `assets/mask/`）

统一：小写 + 短横；每部件独立 SVG，viewBox 300×400，透明背景。

| 部件 | 命名 | 数量下限 |
|---|---|---|
| 面型基底 | `base-01.svg` … `base-05.svg` | 5 |
| 眼 | `eye-01.svg` … `eye-06.svg` | 6 |
| 嘴 | `mouth-01.svg` … `mouth-04.svg` | 4 |
| 眉 | `brow-01.svg` … `brow-06.svg` | 6 |
| 辅纹 | `aux-{theme}-{n}.svg`，theme ∈ {flame, stone, ink, jade, drum} | 各 3 |
| 共绘笔画 | `stroke-{theme}-{n}.svg` | 各 5 |

组合器读取顺序：`base → brow → eye → mouth → aux[]`。z-index 递增。

内容图：
- 场景卡缩略：`assets/scene/{scene_id}.jpg`（例：`scene/shicheng-01.jpg`）
- 展品图：`assets/exhibit/{exhibit_id}.jpg`
- 工坊图：`assets/workshop/{workshop_id}.jpg`
- 音频：`assets/audio/{scene_id_or_exhibit_id}.mp3`

---

## 6. Realtime 频道

Supabase Realtime broadcast，channel 名固定：

| Channel | 事件 | Payload |
|---|---|---|
| `mask-wall:{event_id}` | `stroke` | `{ player_id, pattern_id, at }` |
| `mask-wall:{event_id}` | `break`  | `{ at }`（大面破裂） |
| `battle:round:{round_id}` | `action` | `{ action_id, actor, target_type, target_id, effect, at }` |
| `battle:round:{round_id}` | `state`  | `battle_state` 整行快照 |
| `resources:{event_id}` | `delta` | `{ player_id, faction, res_type, delta, source, at }` |
| `phase:{event_id}` | `advance` | `{ from, to, at }` |

订阅规则：B 机在 `web/src/lib/realtime.ts` 统一封装，禁止散写。

---

## 7. 内容文件（C 机维护，A 机读取）

放在 `yelang/content/` 下，A 机 seed 时导入。文件与 shape：

### 7.1 `content/cards.json`
```json
[{ "id":"scene-shicheng-01", "title":"石城之眼", "body":"...", "layer":"史证",
   "source":"贵州省博物馆 2019 展陈说明", "scene_id":"shicheng-01",
   "audio_url":"assets/audio/shicheng-01.mp3", "fragment":{"pattern":"石","delta":1} }]
```

### 7.2 `content/quests.json`
```json
[{ "id":"quest-day1-01", "npc_id":"npc-01", "day":1, "type":"寻迹",
   "description":"找到夜郎谷入口的两只石羊，拍下正面照",
   "reward_json":{ "fragment":{"pattern":"石","delta":1}, "res":[], "inventory":null },
   "one_time_code":"NPC-A7Q3" }]
```

### 7.3 `content/bot_actions.json`（Day2 攻方脚本池）
```json
[{ "id":"atk-gate-1", "target_type":"gate", "target_id":"main",
   "weight":3, "cost":{"gong_cai":2}, "effect":{"gate_hp":-8},
   "narration":"新火盟以撞车冲击城门。" }]
```
调度：每轮 3 次 tick，每 6 分钟一次；按 `weight` 加权随机；`cost` 只做叙事，不真的扣攻方资源（Demo 简化）。

### 7.4 `content/motto_templates.json`
```json
{ "证":["以证为骨"], "石":["以石为字"], "工":["以器为言"], "人":["以人为镜"], "火":["以火为心"] }
```

### 7.5 `content/npc_codes.json`
```json
[{ "npc_id":"npc-01", "codes":["NPC-A7Q3","NPC-K2M1"] }]
```

---

## 8. HTTP 状态码 & 错误

| Code | 场景 | 例 |
|---|---|---|
| 200 | 成功 | — |
| 400 | 参数错 | `BAD_REQUEST` |
| 401 | 无 token | `UNAUTHORIZED` |
| 403 | 阶段不允许 | `FORBIDDEN` |
| 404 | 资源不存在 | `NOT_FOUND` |
| 409 | 状态机非法转移/一次性码用过 | `STATE_INVALID`, `CODE_USED` |
| 422 | Schema 校验失败 | `SCHEMA_INVALID` |
| 500 | 未捕获 | `INTERNAL` |

AI 相关：超时退模板不算错误，返回 200，附加 `x-ai-fallback: 1` header。

---

## 9. Web/Server 环境变量（B/A 共读 `.env.example`）

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`（前端）
- `SUPABASE_SERVICE_ROLE_KEY`（后端）
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`（默认 `claude-sonnet-5`；不可用时替换）
- `PORT`（后端默认 `8787`）
- `ADMIN_KEY`（运营接口密钥；production 必填。非 production 未配置时仅使用明确 demo 值 `yelang-demo-admin`）
- `EVENT_ID`（默认 seed 出的那一场）

---

## 10. 变更记录
- 2026-08-29 v1.0 A 机首次锁定。之后所有变更须列在下方。
- 2026-08-29 v1.1 Day2 实景玩法补充：新增 `/api/session`、`/api/day2/enter`、`/api/day2/register`、`/api/day2/scan`、`/api/day2/snapshot`。所有接口均以 `x-player-token` 身份为准，忽略请求体中的 `player_id`。扫码只接收意图码：`ESCORT-{A|B|C|D}-{START|END}`、`AMBUSH-{A|B|C|D}-{1|2}`、`GATE-MAIN`、`GRAIN-{IN|OUT}`、`TOWER-{A|B|C}`；服务端计算成本、伤害、路线进度、粮草系数和结局冻结。
- 2026-08-29 v1.2 Task A P0：共绘一次性提交、手作图片输入校验、运营只读快照与验收 curl。
- 2026-08-29 v1.3 P0 安全收紧：运营快照/阵营锁定改为 admin key fail-closed；终局冻结所有奖励写入；筹备期禁止战斗接口开战。

### 10.1 Day2 快照响应（v1.1）

`/api/session` 与 `/api/day2/snapshot` 中的 `day2` 统一包含：

```json
{
  "phase":"DAY2_PREPARING", "round":0,
  "resources":{"工材":3,"粮草":3,"铜令":2,"民心":2},
  "npc_points":[{"id":"npc-05","label":"粮商","position":"晚宴入口"}],
  "resource_points":[...], "routes":[...],
  "gate":{"hp":100,"max_hp":100},
  "grain":{"blocked_min":0,"defender_stock":3,"attacker_stock":0},
  "towers":{"A":"守文盟","B":null,"C":null},
  "route_visibility":true, "registrations":[], "reports":[]
}
```

`/api/day2/enter` 只接受 `FIRE_NIGHT`、`FACTION_LOCKED` 或 `DAY2_PREPARING`；不可从 Day1 探索跳过共绘进入 Day2。`route_visibility` 为 false 时客户端必须隐藏护送路线细节。

### 10.2 Task A P0 补充（v1.2）

- `/api/paint-wall` 仅在 `MASK_CRAFTING` 可提交；`pattern_id` 必须是 `stroke-stone-01`、`stroke-flame-01`、`stroke-ink-01` 或 `stroke-jade-01`。每名玩家仅一笔，重复提交返回 `409 {"error":"CODE_USED"}`；成功后进入 `FIRE_NIGHT`。
- `/api/upload-craft` 的可选 `image_base64` 只接受 `data:image/jpeg|png|webp;base64,...`，解码后最大 2 MiB。服务端不持久化原图。响应新增 `image_received:boolean` 和 `ai_fallback:boolean`（同时保留 `x-ai-fallback: 1` 响应头）。
- `/api/admin/snapshot` 与 `/api/lock-faction` 需要有效玩家 `x-player-token` **和** `x-admin-key`。`ADMIN_KEY` 在 production 未配置时返回 `503 ADMIN_UNAVAILABLE`；非 production 的明确 demo 默认值为 `yelang-demo-admin`。普通玩家 token 永远不足以访问运营能力。
- 历史兼容接口仍可能携带 `player_id`，但服务端一律忽略该字段，以 `x-player-token` 所属玩家为准。
- 当玩家状态或 event phase 为 `ENDING` 时，所有会产生面纹、收藏、任务或资源变化的写接口返回 `409 STATE_INVALID`；读接口继续可用。
- `/api/battle/action` 与 `/api/battle/bot-tick` 仅在 event phase 为 `BATTLE_R1`、`BATTLE_R2` 或 `BATTLE_R3` 且 `round_id` 匹配时运行。`DAY2_PREPARING` 必须先通过合法 Day2 现场扫码进入 R1。

### 10.3 验收 curl（v1.2）

```bash
# TOKEN 来自 /api/enroll；不得以 player_id 代替 token
curl -sS -X POST http://127.0.0.1:8787/api/paint-wall \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' \
  --data '{"player_id":"forged-id","pattern_id":"stroke-stone-01"}'

curl -sS -X POST http://127.0.0.1:8787/api/upload-craft \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' \
  --data '{"image_base64":"data:image/png;base64,aQ==","workshop_id":"ws-01"}'

curl -sS -X POST http://127.0.0.1:8787/api/admin/snapshot \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' \
  -H 'x-admin-key: yelang-demo-admin' --data '{}'

# 其余接口最小请求；按状态机顺序执行
curl -sS -X POST http://127.0.0.1:8787/api/enroll \
  -H 'content-type: application/json' --data '{"name":"评委甲"}'
curl -sS -X POST http://127.0.0.1:8787/api/session \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{}'
curl -sS -X POST http://127.0.0.1:8787/api/pick-mask-base \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{"base_id":"base-1"}'
curl -sS -X POST http://127.0.0.1:8787/api/scan \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{"code":"石城之眼"}'
curl -sS -X POST http://127.0.0.1:8787/api/mask-preview \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{}'
curl -sS -X POST http://127.0.0.1:8787/api/ai/mask-motto \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{}'
curl -sS -X POST http://127.0.0.1:8787/api/lock-faction \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' \
  -H 'x-admin-key: yelang-demo-admin' --data '{"event_id":"00000000-0000-0000-0000-000000000001"}'
curl -sS -X POST http://127.0.0.1:8787/api/day2/enter \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{}'
curl -sS -X POST http://127.0.0.1:8787/api/day2/register \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{"mission_type":"escort","target_id":"A"}'
curl -sS -X POST http://127.0.0.1:8787/api/day2/scan \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{"code":"ESCORT-A-START"}'
curl -sS -X POST http://127.0.0.1:8787/api/day2/snapshot \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{}'
curl -sS -X POST http://127.0.0.1:8787/api/quest/claim \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{"quest_id":"11111111-1111-1111-1111-000000000001"}'
curl -sS -X POST http://127.0.0.1:8787/api/quest/complete \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{"quest_id":"11111111-1111-1111-1111-000000000001","one_time_code":"NPC-A7Q3"}'
curl -sS -X POST http://127.0.0.1:8787/api/battle/action \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' \
  --data '{"round_id":"22222222-2222-2222-2222-000000000001","target_type":"gate","target_id":"main"}'
curl -sS -X POST http://127.0.0.1:8787/api/battle/bot-tick \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' \
  --data '{"round_id":"22222222-2222-2222-2222-000000000001"}'
curl -sS -X POST http://127.0.0.1:8787/api/ai/narrate \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' \
  --data '{"round_id":"22222222-2222-2222-2222-000000000001","since":"1970-01-01T00:00:00Z"}'
curl -sS -X POST http://127.0.0.1:8787/api/ending \
  -H 'content-type: application/json' -H 'x-player-token: TOKEN' --data '{}'
```
