# 《重返夜郎国》— 后端 & 数据库

48 小时贵客松原型。本目录承载数据库迁移、Edge 后端 API、AI 封装、运营接口、smoke 测试脚本。

---

## 目录

```
yelang/
  CONTRACT.md          # 全项目字段/API/SVG/Realtime 契约（B/C 必读）
  server/              # Node + tsx + Express 后端
  supabase/            # SQL migrations + seed
  web/                 # B 机前端（本仓库不管）
  content/             # C 机内容库（JSON）
  assets/              # C 机素材（SVG/音频/图）
```

## 本地起步

```bash
# 0. 装依赖
pnpm install

# 1. 起 Supabase（需要装 supabase CLI）
supabase start
supabase db reset            # 跑 0001_init.sql + 0002_views.sql + seed.sql

# 2. 复制环境变量
cp .env.example .env
# 把 supabase status 输出的 URL/anon/service_role 填进去

# 3. 起后端
pnpm dev:server              # 默认 http://localhost:8787

# 4. 冒烟测试
pnpm smoke                   # server/tests/smoke.sh，跑通端到端 demo 路径
```

## 只跑后端（不依赖 Supabase）

如果本地没有 Supabase，仍可编译 + 起服务：

```bash
cd server
pnpm dev
```

所有需要 DB 的 API 会 500，但 `/health`、AI 相关（用 mock 或真 key）能测。

## API 索引

见 `CONTRACT.md §4`。全部 `POST /api/*`，均需 `x-player-token` header（enroll 除外）。

## 关键约束

- 前端**禁止直接写库**。资源流水只能走 `/api/quest/complete` 和 `/api/battle/action`。
- 所有 AI 调用走 `server/src/lib/ai.ts`，超时 3s 退模板。
- `players.state` 是唯一状态源，不许用"当前在哪个页面"代替。

## 分支

- `main` — 仅 A 机可合
- `feat/backend-*` — A 机
- `feat/web-*` — B 机
- `feat/content-*` — C 机

## Demo 联调节奏

每 2 小时全员合并一次，跑一次 `pnpm smoke`。第 22 小时前必须有可提交版本。
