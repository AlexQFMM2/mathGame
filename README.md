# MathGame

MathGame 是一个离线优先、没有广告的数学小游戏集合。

项目不会被命名和架构限定为“数独 App”。数独验证棋盘交互与可解释提示，算术填字验证非规则关系网，格点建筑师则把玩法扩展到面积、周长、连通和对称等离散几何构造。

## 当前状态

Web 端已经可以完整游玩三款游戏：

- [x] pnpm workspace
- [x] React + TypeScript + Vite Web 基座
- [x] `320 × 640` 竖屏逻辑视口与等比缩放
- [x] 通用游戏目录 `game-core`
- [x] 独立数独领域包 `sudoku-core`
- [x] 独立算术填字领域包 `crossmath-core`
- [x] 独立格点几何领域包 `grid-architect-core`
- [x] Capacitor Android 包装配置
- [x] 数独棋盘、严格输入、笔记、撤销与擦除
- [x] 候选数、求解、唯一解生成和基础可解释提示
- [x] 三档难度选择、计时、暂停、本地存档恢复与结算
- [x] Web 端从主页到完成一局的完整流程
- [x] 首页 / 日历 / 我的底部导航与本地个人统计
- [x] 每日任务任选一款游戏完成即可签到，支持历史日期补打卡并参与自然月全勤奖杯
- [x] 三款游戏结算页展示完成棋盘、复制题目编号，并可按编号再次挑战
- [x] 算术填字四档难度、14×14 支流地图、数字/符号卡牌和变量推导
- [x] 算术填字保证至少一解并允许多解，填满错误时只退回冲突支流卡牌
- [x] 格点建筑师四档难度、自动边界、障碍/地标、对称和最短周长条件
- [x] 格点建筑师接受所有满足公开条件的图形，保证至少一解并允许多解
- [ ] Android 真机触觉反馈和生命周期验收

当前 Web 主流程为：主页 → 选择游戏 → 选择难度或按题号进入 → 本机生成题目 → 游戏 → 结算。数独验证唯一解；算术填字生成确定性的 `14×14` 关系网；格点建筑师以四阶段管线组合条件、地图特征、题面和独立求解验证。后两款只要求解数量 `>= 1`，允许数学上合理的多解。三款游戏都能通过题号和 seed 复现相同题目。

日历按已上线游戏生成当天可选任务，玩家任选一款并完整完成一局即可打卡或补签；选择日期本身不会改写记录，普通自由练习也不会绕过任务入口自动签到。自然月每天都完成签到后点亮全勤奖杯，按当月实际完成的补签天数分为金色（0–4 次）、银色（5–14 次）和铜色（15 次以上）。任务目标会随未完成棋局一同保留，刷新或退出后继续游戏仍记到原日期。

## 技术栈

- React 19
- TypeScript 5.9
- Vite 7
- pnpm workspace
- Capacitor 7（Android）
- Capacitor Haptics
- Electron（预留，首个版本暂不接入）

开发顺序遵循：

```text
纯 TypeScript 游戏核心
        ↓
React Web UI
        ↓
Capacitor Android App
        ↓
可选 Electron Desktop
```

Web、Android 和未来的 Desktop 共用同一套游戏规则与 UI，不为每个平台重写玩法。

## 项目结构

```text
mathGame/
├── apps/
│   ├── web/                 React Web 应用和共享 UI
│   └── mobile/              Capacitor Android 外壳
├── packages/
│   ├── game-core/           游戏目录、通用协议和视口常量
│   ├── sudoku-core/         数独规则、求解、提示和生成逻辑
│   ├── crossmath-core/      算术关系、精确有理数、求解和支流地图生成
│   └── grid-architect-core/ 离散几何、条件判定、求解和格点地图生成
├── docs/
│   ├── architecture.md      架构边界
│   └── ui-design.md         竖屏 UI 规范
└── plan/
    ├── README.md            计划索引和维护规则
    └── archive/             已完成的模块计划
```

## 本地开发

要求 Node.js 22+ 和 pnpm 10.33+。

```bash
pnpm install
pnpm dev
```

默认开发地址：

```text
http://127.0.0.1:5180
```

基础检查：

```bash
pnpm typecheck
pnpm build
pnpm test
```

开发环境需要单独检查复杂 UI 组件时，可打开：

```text
http://127.0.0.1:5180/?preview=1
```

## Android

移动端沿用经过验证的 Web → Capacitor 路线。第一次生成 Android 原生工程：

```bash
pnpm --filter @math-game/mobile cap:add:android
```

之后同步 Web 产物或构建 debug APK：

```bash
pnpm mobile:sync
pnpm mobile:android:debug
```

Android 原生工程已纳入仓库并锁定竖屏，应用 ID 为 `com.alexqfmm.mathgame`。推送 `v*` tag 会触发 GitHub Actions 构建 debug-signed 可安装 APK，并发布为 GitHub prerelease；应用商店发布前仍需另行配置私密的正式签名。

## 产品原则

- 离线优先：核心玩法、题目和存档不依赖服务器。
- 没有广告：提示不与广告、金币或等待时间绑定。
- 提示可解释：优先展示由当前盘面推导出的下一步和依据，而不是直接偷看答案。
- 规则与 UI 分离：游戏核心不访问 DOM、React、Capacitor 或 Electron。
- 为扩展留接口，不提前建设不存在的需求。
- 借鉴玩法，不复制其他应用的名称、素材和高度相似的视觉表达。

## 设计基线

逻辑视口固定为竖屏 `320 × 640`，正好与既有横屏项目的 `640 × 320` 相反。浏览器和 WebView 根据可用区域整体等比缩放，内部布局始终使用逻辑像素，避免每个页面各写一套媒体查询。

详见 [UI 设计规范](docs/ui-design.md)。

## 开发计划

- [架构说明](docs/architecture.md)
- [计划索引](plan/README.md)
- [格点建筑师 MVP 计划](plan/archive/grid-architect-mvp-plan.md)
- [已归档计划](plan/archive/)

## Git 仓库

项目使用 `main` 分支，远端为 `git@github.com:AlexQFMM2/mathGame.git`。日常提交与推送：

```bash
git add .
git commit -m "feat: describe the change"
git push -u origin main
```

# mathGame
