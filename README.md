# MathGame

MathGame 是一个离线优先、没有广告的数学小游戏集合。

项目不会被命名和架构限定为“数独 App”。数独是第一个游戏，也是用来验证棋盘交互、可解释提示、存档和 Android 封装的起点；后续可以在同一个应用中加入数织、算术谜题、华容式逻辑题等独立游戏。

## 当前状态

Web 端数独 MVP 已经可以完整游玩：

- [x] pnpm workspace
- [x] React + TypeScript + Vite Web 基座
- [x] `320 × 640` 竖屏逻辑视口与等比缩放
- [x] 通用游戏目录 `game-core`
- [x] 独立数独领域包 `sudoku-core`
- [x] Capacitor Android 包装配置
- [x] 数独棋盘、严格输入、笔记、撤销与擦除
- [x] 候选数、求解、唯一解生成和基础可解释提示
- [x] 三档难度选择、计时、暂停、本地存档恢复与结算
- [x] Web 端从主页到完成一局的完整流程
- [x] 首页 / 日历 / 我的底部导航与本地个人统计
- [x] 按游戏类型生成每日任务，支持历史日期补打卡并参与自然月全勤奖杯
- [x] 结算页复制题目编号，并通过编号再次挑战同一道数独
- [ ] Android 真机触觉反馈和生命周期验收

当前 Web 主流程为：主页 → 数独 → 选择难度 → 本机生成唯一解题目 → 游戏 → 结算。结算页可以复制题目种子，在数独难度选择页通过“按种子进入”，用原难度与 seed 重新生成完全相同的题目。

日历按已上线游戏生成每日任务，每种游戏一天一条。点击今天的“打卡”或过去日期的“补签”会进入对应任务游戏，只有完整完成游戏后才记录任务完成与签到成功；选择日期本身不会改写记录。自然月每天都完成签到后点亮全勤奖杯，按当月实际完成的补签任务次数分为金色（0–4 次）、银色（5–14 次）和铜色（15 次以上）。任务目标会随未完成棋局一同保留，刷新或退出后继续游戏仍记到原日期。

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
│   └── sudoku-core/         数独规则、求解、提示和生成逻辑
├── docs/
│   ├── architecture.md      架构边界
│   └── ui-design.md         竖屏 UI 规范
└── plan/
    ├── README.md            计划索引和维护规则
    └── current/
        ├── profile-daily-challenge-plan.md
        └── sudoku-mvp-plan.md
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

Android 工程生成后需要锁定竖屏。应用 ID `com.mathgame.app` 目前是占位值，正式签名发布前再确定最终 ID，避免过早绑定域名或商店身份。

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
- [每日任务、个人中心与编号挑战计划](plan/current/profile-daily-challenge-plan.md)
- [数独 MVP 计划](plan/current/sudoku-mvp-plan.md)

## Git 仓库

项目使用 `main` 分支，远端为 `git@github.com:AlexQFMM2/mathGame.git`。日常提交与推送：

```bash
git add .
git commit -m "feat: describe the change"
git push -u origin main
```

# mathGame
