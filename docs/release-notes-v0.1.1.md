# MathGame Android v0.1.1

version: 0.1.1

tag: `v0.1.1`

branch: `main`

GitHub Release：

https://github.com/AlexQFMM2/mathGame/releases/tag/v0.1.1

Android debug APK：

https://github.com/AlexQFMM2/mathGame/releases/download/v0.1.1/MathGame-Android-debug-v0.1.1.apk

## 本版重点

- 新增第三款游戏“格点建筑师”，包含入门、简单、普通、困难四档难度。
- 使用精确离散几何计算面积、共享边周长、四向连通、洞口以及横向、纵向和中心对称。
- 几何题支持障碍、地标、最短周长、自动边界和多种合法答案；独立求解器保证每题至少存在一解。
- 完成算术填字的统一 `14×14` 支流地图、四阶段生成、有限卡牌求解和横竖关系严格判定。
- 数独、算术填字和格点建筑师均支持题号复现、暂停、存档恢复及保留完成盘面的结算页。
- 每日任务和历史补签现在可以从三款游戏中任选一款完成；历史日期继续保留当时固化的任务清单。

## 验收记录

- `pnpm typecheck` 通过。
- `pnpm test` 通过：Web 29 项、格点建筑师核心 7 项，以及数独和算术填字核心回归。
- `pnpm build` 通过。
- 格点建筑师额外完成 40 组难度/seed 生成、复现、构造解和独立求解压力检查。
- 真实浏览器完成四档几何题，并验证错误反馈、暂停、恢复和完成结算。
- 已验证 `320×640`、常见手机尺寸与横屏居中布局。

## Android 信息

- 应用 ID：`com.alexqfmm.mathgame`
- `versionCode`：2
- 固定竖屏，复用 Web 游戏逻辑与本地存档，可离线运行核心玩法。
- 本 APK 使用 debug 签名，面向直接安装和真机验证，不是应用商店正式签名包。

安装新版遇到签名不一致时，需要先卸载旧测试版；卸载会清除应用本地记录。
