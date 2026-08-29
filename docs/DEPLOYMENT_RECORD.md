# 生产部署记录

## ChatGPT Sites 当前生产部署

| 字段 | 已核验值 |
| --- | --- |
| Production URL | `https://return-to-yelang.txj1420119534.chatgpt.site` |
| Hosting platform | ChatGPT Sites |
| Project ID | `appgprj_6a93295502f88191a99145d566528f0a` |
| Saved version number | `5` |
| Version ID | `appgprj_6a93295502f88191a99145d566528f0a~appgver_d46b03313fe48191b14116e0a2a5c900` |
| Deployment ID | `appgdep_6a9337a24d3481919ac00806ab766291` |
| Provider deployment ID | `site---6a93295502f88191a99145d566528f0a` |
| Deployed commit | `d24fa980206ca3a55521965ed2d2f54613bdad6e` |
| Deployment completed at | `2026-08-30T03:55:14.565494+08:00` |
| Source directory | `unknown / not verified` |
| Source diff | `none reported / no divergence detected through the associated commit` |
| D1 | enabled, binding `DB` |
| R2 | disabled |
| External AI | disabled in current runtime health result; deterministic fallback active |
| Access audience | public |
| Anonymous access | verified in a fresh, unauthenticated browser session on 2026-08-30 |
| Runtime verification | `/health` returned HTTP 200 with `service: yelang-sites`, `mode: d1`, `db: true`, `ai: false` |
| Deployment status | succeeded |

## Git 对应关系

本轮启动时：

- 本地 `HEAD`：`d24fa980206ca3a55521965ed2d2f54613bdad6e`
- `origin/main`：`d24fa980206ca3a55521965ed2d2f54613bdad6e`
- Sites deployed commit：`d24fa980206ca3a55521965ed2d2f54613bdad6e`

三者一致，属于“生产部署关联 commit 就是当前 GitHub main，且没有额外源码修改”的同步情况。本轮仓库治理 commit 推送后，GitHub `main` 会包含生产源码并增加文档、CI 和测试修复；Sites 仍会明确记录为部署于上述生产 commit，直到后续从已推送 commit 保存并正式部署新版本。

用户在任务说明中提供的旧 `main` SHA `3ba4dd2808f24e5e207846d787958a78c494715d` 已不再是任务启动时的远端 `main`，但仍由既有 `#Guikesong` tag 保存。本轮不删除、移动或覆盖该 tag 或对应 Release。

## 本轮部署动作

- 只读核验现有生产部署：已完成。
- 修改或重新部署 ChatGPT Site：未执行，符合本轮限制。
- 生产数据写入：未执行。
