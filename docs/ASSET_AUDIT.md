# 素材审计

审计日期：2026-08-30。本轮仅记录，不删除原始素材、不启用 Git LFS，也不改变文化正文、美术内容或运行路径。

## 大于 2 MB 的文件

| 文件 | 约计大小 | 是否进入首屏 / 当前使用情况 | 可优化方向 |
| --- | ---: | --- | --- |
| `assets/video/2.mp4` | 10.35 MB | 是，开场视频 | 在保持画质与音轨的前提下重编码，并检查 fast-start |
| `assets/day1/exhibits/beast-bird.jpg` | 9.93 MB | 否，探索详情 | WebP / AVIF 候选 |
| `assets/day1/exhibits/beast-fish.jpg` | 9.91 MB | 否，探索详情 | WebP / AVIF 候选 |
| `assets/day1/exhibits/beast-sun.jpg` | 9.84 MB | 否，探索详情 | WebP / AVIF 候选 |
| `assets/audio/day1.mp3` | 2.76 MB | Day 1 后加载 | 评估码率，不改变循环与听感 |
| `assets/day2/map-day2-battlefield.png` | 2.62 MB | 当前未引用 | 先确认未来用途，再决定格式 |
| `assets/posters/Day1.png` | 2.53 MB | 当前未引用，与 UI 副本重复 | 先统一引用路径，再评估 WebP / AVIF |
| `assets/ui/Day1.png` | 2.53 MB | Day 1 领取后海报 | WebP / AVIF 候选，文字清晰度需视觉 QA |
| `assets/ui/Day2.png` | 2.45 MB | Day 2 开启后海报 | WebP / AVIF 候选，文字清晰度需视觉 QA |
| `assets/posters/Day2.png` | 2.45 MB | 当前未引用，与 UI 副本重复 | 先统一引用路径，再评估 WebP / AVIF |
| `assets/audio/day2.mp3` | 2.45 MB | Day 2 后加载 | 评估码率，不改变循环与听感 |
| `assets/day1/meal1.png` | 2.45 MB | 否，晚宴详情 | WebP / AVIF 候选 |
| `assets/day1/meal2.png` | 2.41 MB | 否，晚宴详情 | WebP / AVIF 候选 |
| `assets/day1/meal4.png` | 2.38 MB | 否，晚宴详情 | WebP / AVIF 候选 |
| `assets/day1/dance.png` | 2.37 MB | 当前不展示 / 未引用 | 保留原件，待产品确认后处理 |
| `assets/day1/meal3.png` | 2.36 MB | 否，晚宴详情 | WebP / AVIF 候选 |
| `assets/day2/faction-shouwen.png` | 2.32 MB | 否，Day 2 阵营页 | 透明 PNG；只在 alpha 边缘验证后优化 |
| `assets/day1/face.png` | 2.21 MB | 开场视频后领取页使用 | 透明 PNG；只在 alpha 边缘验证后优化 |
| `assets/day2/profession-linggu.png` | 2.03 MB | 当前未引用 | 先确认未来用途，再决定格式 |

首屏真正直接加载的主要大文件是 `assets/video/2.mp4`。`face.png` 在视频结束后的领取页出现；Day 1 海报与 BGM 在领取后出现。其余大图与音频位于后续功能路由。

## 精确重复素材

按文件内容哈希发现以下 15 组精确重复：

- `assets/posters/Day1.png` = `assets/ui/Day1.png`
- `assets/posters/Day2.png` = `assets/ui/Day2.png`
- `assets/day1/virtue-mask-ren.png` = `assets/day1/virtue-ren.png`
- `assets/day1/virtue-mask-yi.png` = `assets/day1/virtue-yi.png`
- `assets/day1/virtue-mask-li.png` = `assets/day1/virtue-li.png`
- `assets/day1/virtue-mask-zhi.png` = `assets/day1/virtue-zhi.png`
- `assets/day1/virtue-mask-xin.png` = `assets/day1/virtue-xin.png`
- `assets/day2/npc-01.png` = `assets/day2/npc-laoshijiang.png`
- `assets/day2/npc-02.png` = `assets/day2/npc-tonggushi.png`
- `assets/day2/npc-03.png` = `assets/day2/npc-ranwenshi.png`
- `assets/day2/npc-04.png` = `assets/day2/npc-taohuoshi.png`
- `assets/day2/npc-05.png` = `assets/day2/npc-xingjiao.png`
- `assets/day2/npc-06.png` = `assets/day2/npc-liangshang.png`
- `assets/day2/npc-07.png` = `assets/day2/npc-shiguan.png`
- `assets/day2/npc-08.png` = `assets/day2/npc-shuomian.png`

重复文件本轮不删除。统一前必须确认所有代码、文档、缓存和 Sites 构建路径已改用同一稳定路径。

## 压缩空间与准入条件

- 三张探索 JPEG 是最优先的 WebP / AVIF 候选，通常有显著的视觉等价压缩空间。
- PNG 海报与菜品图可评估现代格式，但需要在手机尺寸下检查文字、纹理和透明边缘。
- 阵营、面具、NPC、资源等透明 PNG 只有在 alpha 边缘无光晕、无锯齿后才能替换。
- MP4 应使用视频编码流程处理，并保留可用音轨；不能用图片格式替代。
- 精确重复素材有仓库体积优化空间，但路径兼容优先于删除副本。

任何实际压缩都必须同时满足：视觉无明显变化、构建路径不变或完成受控迁移、ChatGPT Sites 内容类型与部署兼容、`pnpm verify` 和 `pnpm qa:web` 全部通过。本轮未执行压缩。
