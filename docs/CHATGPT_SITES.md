# ChatGPT Sites 生产托管

## 当前生产环境

- 主生产平台：ChatGPT Sites Hosting
- 生产 URL：<https://return-to-yelang.txj1420119534.chatgpt.site>
- Site project ID：`appgprj_6a93295502f88191a99145d566528f0a`
- 当前已部署源码 commit：`d24fa980206ca3a55521965ed2d2f54613bdad6e`
- Saved version ID：`appgprj_6a93295502f88191a99145d566528f0a~appgver_d46b03313fe48191b14116e0a2a5c900`
- Deployment ID：`appgdep_6a9337a24d3481919ac00806ab766291`
- Source directory：`unknown / not verified`（Sites 只读记录未暴露原机器绝对路径）

上述版本的关联 commit 与本轮启动时的 `origin/main` 完全一致，因此没有需要从线上反向覆盖的玩法或素材源码。本轮只同步仓库治理文件；除非另行明确要求，不重新部署 Site。

## 运行时与存储

```text
React / Vite / Vinext
        ↓
ChatGPT Sites Worker runtime
        ↓
Express API
        ↓
D1 binding: DB
```

- D1：已启用，binding 名称为 `DB`。
- R2：未启用。
- 外部 AI：当前生产健康检查显示未启用；应用使用确定性模板 fallback。
- 玩家拍摄图片：当前保存在浏览器本地存储，不进入 R2。

## `.openai/hosting.json`

根目录的 `.openai/hosting.json` 是 Sites 生成的项目关联清单，应纳入版本控制。它只允许包含：

- `project_id`
- D1 binding 名称
- R2 binding 名称
- 其他明确为非秘密的托管配置

不得手工修改 `project_id`，也不得写入 API Key、Token、数据库口令、用户数据或线上数据库内容。环境变量与秘密只通过 ChatGPT Sites Settings 配置。

## 推荐发布流程

```text
本地修改
→ 测试
→ Git commit
→ push GitHub
→ Sites 保存版本
→ 核对关联 commit、源码差异与 D1/R2 bindings
→ 正式部署
→ 验证生产 URL 与 /health
→ 创建 GitHub Release
```

发布记录必须同时保存 Git commit、saved version ID、deployment ID、部署时间和存储 binding 状态。

## 禁止的分叉流程

```text
直接修改线上 Site
→ 不同步本地
→ GitHub 与生产版本永久分叉
```

任何 Sites 在线修改都必须带回 Git 分支，经测试、commit 与 push 后再形成正式部署。GitHub 是项目的权威源码和版本记录；Sites 是当前主生产运行环境。

## 回滚

回滚时使用已经记录的 saved version、deployment ID 与 Git commit，不用手工拼装线上文件。回滚后至少重新验证公开访问、`/health`、D1 binding 和 Day 1 / Day 2 关键路径，并在 `DEPLOYMENT_RECORD.md` 追加新记录。
