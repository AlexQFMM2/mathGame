# MathGame

MathGame 是一个离线优先、没有广告的数学小游戏集合。

项目不会被命名和架构限定为“数独 App”。数独是第一个游戏，也是用来验证棋盘交互、可解释提示、存档和 Android 封装的起点；后续可以在同一个应用中加入数织、算术谜题、华容式逻辑题等独立游戏。

## 当前状态

项目处于基础框架阶段：

- [x] pnpm workspace
- [x] React + TypeScript + Vite Web 基座
- [x] `320 × 640` 竖屏逻辑视口与等比缩放
- [x] 通用游戏目录 `game-core`
- [x] 独立数独领域包 `sudoku-core`
- [x] Capacitor Android 包装配置
- [ ] 数独棋盘与输入交互
- [ ] 候选数、求解、唯一解和可解释提示
- [ ] 本地存档、计时、撤销与结算
- [ ] Android 真机触觉反馈和生命周期验收

当前首页只是用来验证工程、视觉基线和竖屏缩放，不代表最终产品 UI。

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
- [数独 MVP 计划](plan/current/sudoku-mvp-plan.md)

## 创建 GitHub 仓库后

本目录目前不主动绑定远端。GitHub 仓库创建后，可在本目录执行：

```bash
git init
git add .
git commit -m "chore: bootstrap MathGame workspace"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```

# mathGame
