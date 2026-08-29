# 重返夜郎国 Return to Yelang

一套连接夜郎谷实景、个人傩面、两日叙事与文明攻防的沉浸式互动系统。

## 在线体验

[公开在线 Demo（ChatGPT Sites）](https://return-to-yelang.txj1420119534.chatgpt.site)

该地址已在无登录状态的独立浏览器会话中验证可访问。ChatGPT Sites 是本项目当前的主生产环境；GitHub 是权威源码与版本记录。

## 产品体验

### Day 1

领取白面 → 实景探索 → 五纹积累 → 手作与共绘 → 形成个人之面

玩家在夜郎谷的真实空间中完成探索、记录、收藏、晚宴、人物、演出和集市体验。当天行为沉淀为个人傩面，并成为第二日身份与选择的基础。

### Day 2

阵营与职业 → 资源筹备 → 护送 / 伏击 / 城门 / 粮草 / 哨塔 → 结局与归面

玩家进入守文盟或新火盟，以阵营、职业和资源状态参与文明攻防。地图、任务、资源与战斗结算共同呈现局势变化。

## 产品差异

- 不是普通文化介绍页，而是一套与现场行动相连的互动叙事系统。
- 真实空间、二维码与数字进程相连。
- Day 1 的行为会进入 Day 2，而不是两套彼此独立的流程。
- 个人身份会进入集体冲突与共同结局。
- 内容明确区分史证、活态非遗、谷中艺术、展览介绍和游戏演绎。

## 技术结构

- 前端：React 19、React Router、Vite 8。
- 全栈适配：Vinext。
- 服务端运行时：ChatGPT Sites 托管的 Worker 运行时，复用现有 Express API。
- 主生产托管：ChatGPT Sites Hosting。
- 生产持久化：D1，binding 为 `DB`。
- 对象存储：R2 当前未启用。
- AI fallback：外部 AI 当前未在生产环境启用；AI 路径使用确定性模板 fallback 完成演示与 smoke。

`supabase/` 与未接入的 Supabase 代码是早期数据模型参考，不是当前 ChatGPT Sites 生产数据库。

## 本地开发

要求 Node.js 20.19+、pnpm 9。仓库使用 Corepack 固定 pnpm 版本；仓库补丁保证当前 Vinext 版本可在 CI 的 Node.js 20 上完成构建。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev:web
```

`pnpm dev:web` 启动包含页面、Worker 与 API 的本地体验，默认地址为 `http://127.0.0.1:5173`。

如需独立调试 Express 服务：

```bash
pnpm dev:server
```

默认地址为 `http://127.0.0.1:8787`。

## 构建与测试

```bash
pnpm typecheck
pnpm build
pnpm smoke
```

一次执行基础门禁：

```bash
pnpm verify
```

启动本地前后端后，可执行真实浏览器流程：

```bash
pnpm qa:web
```

GitHub Actions 在 `main` push、Pull Request 和手动触发时运行安装、类型检查、构建与 smoke。CI 不读取真实 AI Key、不访问生产 Site，也不写入生产数据。

## ChatGPT Sites 发布方式

生产项目关联文件是 [`.openai/hosting.json`](.openai/hosting.json)，其中只保存非秘密的项目 ID 与 D1/R2 binding 名称。环境变量和秘密必须通过 Sites Settings 配置。

推荐发布链路：

```text
本地修改
→ 测试
→ Git commit
→ push GitHub
→ Sites 保存版本
→ 核对关联 commit
→ 正式部署
→ 创建 GitHub Release
```

禁止直接修改线上 Site 而不把源码同步回 GitHub。详细规则见 [`docs/CHATGPT_SITES.md`](docs/CHATGPT_SITES.md)，实际部署记录见 [`docs/DEPLOYMENT_RECORD.md`](docs/DEPLOYMENT_RECORD.md)。

## 文化内容边界

`content/*.json` 是仓库中的文化内容权威来源。展示与接口必须保留内容来源，并区分史证、活态非遗、谷中艺术、展览介绍和游戏演绎。游戏化叙事不能被表述成已经证实的历史事实。本轮仓库稳定化不修改文化正文、美术内容或玩法。

## 已知限制

- R2 未启用；玩家拍摄的手作照片目前只保存在当前浏览器，无法跨设备同步。
- 相机、二维码识别与自动播放声音受设备和浏览器权限策略影响。
- 外部 AI 当前未启用，生产环境使用模板 fallback。
- D1 当前保存 Demo 级全局运行态快照，不是多租户生产数据模型。
- `content/` 与 `server/src/content/` 存在内容镜像，测试负责阻止两处漂移。
- 仓库包含大图、音频与视频；优化前必须确认视觉、路径与 Sites 兼容性，详见 [`docs/ASSET_AUDIT.md`](docs/ASSET_AUDIT.md)。

## 项目结构

```text
yelang/
├─ .openai/                 # ChatGPT Sites 非秘密项目关联清单
├─ assets/                  # 生产图片、音频与视频素材
├─ content/                 # 文化卡与玩法内容权威 JSON
├─ docs/                    # 托管、部署和素材审计记录
├─ scripts/                 # Sites 构建输出整理脚本
├─ server/                  # Express API、状态机、D1 适配与 smoke
├─ web/                     # React/Vite/Vinext 页面、Worker 与浏览器 QA
├─ supabase/                # 早期 PostgreSQL/Supabase 模型参考，非当前生产链路
└─ CONTRACT.md              # API、字段与状态契约
```

## License

License 尚未指定。除非权利人另行授权，不应推定代码、文化正文或美术素材可被自由再分发。
