# Architecture

## 目标

MathGame 是多个数学小游戏共存的离线应用。架构需要同时满足：

1. 数独逻辑可以独立测试，不依赖页面。
2. Web 是唯一 UI 主线，Android 和未来的 Desktop 直接复用。
3. 新增小游戏时增加独立模块，而不是继续扩大数独模块。
4. 第一版保持轻量，不引入服务器、账号、云同步和数据库服务。

## 依赖方向

```text
packages/game-core
    ↑             ↑
packages/sudoku-core
    ↑
apps/web
    ↑
apps/mobile (Capacitor，仅包装 apps/web/dist)

apps/desktop (未来可选，Electron，仅复用 apps/web UI)
```

具体约束：

- `game-core` 只放跨游戏协议、游戏目录和通用常量。
- `sudoku-core` 只放数独领域逻辑，不导入 React 或浏览器 API。
- `web` 负责 UI、路由、交互编排和平台能力适配；跨游戏产品能力放在 `features/`，单游戏实现放在 `games/<game>/`。
- `mobile` 不维护页面源码，只同步 `apps/web/dist`。
- 游戏包之间不能互相引用。
- 平台能力必须经 adapter 调用，业务组件不直接散落平台判断。

## 游戏模块边界

每个新游戏应至少拥有：

```text
packages/<game>-core/       规则、状态和算法
apps/web/src/games/<game>/  页面、组件和样式
```

游戏注册信息统一放进 `game-core` 的 catalog。catalog 只描述入口信息，不承载具体规则。

当真正加入第二个游戏时，再将路由、存档命名空间和游戏生命周期抽象成稳定的 `GameModule` 接口；第一阶段不为了假想扩展设计大型插件系统。

## 数独核心边界

`sudoku-core` 最终负责：

- 棋盘和单元格数据类型
- 行、列、宫合法性
- 候选数计算
- 普通输入和笔记输入规则
- 完成判断
- 求解器和解数量统计
- 题目唯一解验证
- 题目生成和难度评分
- 提示搜索及结构化推理证明

它不负责：

- 振动
- DOM 高亮
- 提示弹窗
- 计时器的真实时钟
- localStorage / IndexedDB
- Android 生命周期

当前实现已经按以下文件拆分：

```text
packages/sudoku-core/src/
├── types.ts       题目、难度和提示结构
├── board.ts       行列宫、冲突和候选数
├── solver.ts      求解与最多两个解的计数
├── generator.ts   带 seed 的终盘生成、挖空和复杂度选择
└── hints.ts       格内唯一与行、列、宫内唯一
```

生成器对每个难度生成多个唯一解候选，再结合提示数和求解搜索复杂度选择题面；同一 seed 和难度可复现。

提示引擎返回结构化结果，例如 technique、目标格、数字、缺失数字和排除理由。中文说明由 UI 模板生成，避免核心逻辑和文案耦合，也避免使用标准答案伪造推理过程。

## 应用状态

建议把状态分成三层：

### 领域状态

当前棋盘、初始题面、笔记、选中格、输入模式、错误次数、提示次数和撤销记录。领域状态的变更通过明确 action 完成，便于撤销和测试。

### 会话状态

开始时间、累计用时、暂停状态、题目 ID、难度、游戏是否完成。

### 用户设置

声音、振动、错误检查方式、自动清理笔记、主题等。

持久化数据必须带 `schemaVersion`。第一版可使用 localStorage；如果后续统计、题库和多游戏存档明显增大，再迁移 IndexedDB。不要在没有容量需求时先引入 SQLite。

当前 Web 会话通过纯 reducer 更新，存档使用 `schemaVersion: 1`，并在读取时校验题面、答案、笔记、历史和统计字段。页面退出或刷新后可以从主页继续。

### 活动记录

跨游戏的每日任务与完成记录位于 `apps/web/src/features/activity/`，由应用层在一局完整结束时按 `GameId` 写入；游戏核心和数独组件不感知日历。未完成退出、暂停或恢复存档都不会完成任务。

当前使用 `math-game:activity:v5` 本地存储，数据带 `schemaVersion: 5`。日期键按玩家本地日期保存为 `YYYY-MM-DD`；每天固化 `requiredGameIds`，每个游戏分别记录完成局数、最佳用时和最近完成时间。日历按钮只创建任务目标，游戏完成事件一次性把真实成绩写到目标日期，并根据任务模式写入 `checkIn.recordedAt` 或 `makeup.recordedAt`；没有完成游戏时不得产生签到记录。

正在执行的签到任务使用独立 `math-game:activity:pending-task:v1` 保存目标日期、打卡/补签模式和游戏 ID；退出、刷新和恢复棋局不会丢失归属，完成或放弃新开普通游戏时清理。读取活动记录时统一校验版本、真实日历日期、已知游戏 ID 和字段值域。v5 不存在时按 v4、v3、v2、v1 的顺序迁移；v4 中没有任何已完成游戏的误打卡/误补签会被删除，合法历史完成记录继续保留。月度全勤按自然月真实天数逐日判断，只有全部日期完成才解锁奖杯；解锁后的奖杯等级由该月合法 `makeup` 天数确定：少于 5 次金色、少于 15 次银色，其余铜色。

### 题目编号与再次挑战

数独题目编号为 `<difficulty>-<seed-base36>`，格式解析位于 `sudoku-core`。Web 只接收核心返回的结构化 `difficulty + seed`，再调用同一确定性生成器；同一编号必须得到相同题面、答案和难度。非法编号不会进入生成页，也不会覆盖现有未完成存档。

剪贴板由 `platform/clipboard.ts` 适配，优先使用 Clipboard API，并为不支持或拒绝权限的环境提供选区复制回退和明确失败反馈。种子开局入口属于数独 UI，位于 `games/sudoku/components/` 并由难度选择页组合；个人中心位于 `features/profile/`，只展示从活动存档派生的本地统计，不引入账号或第二份 profile 数据源。

## 平台能力

Web 层提供小型 adapter：

```ts
interface HapticsAdapter {
  selection(): Promise<void>;
  error(): Promise<void>;
  success(): Promise<void>;
}

interface SaveStore<T> {
  load(key: string): Promise<T | null>;
  save(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
```

浏览器使用 Web API 或空实现；Android 使用 Capacitor Haptics。页面只依赖接口。

## 测试策略

- `sudoku-core`：单元测试和固定题盘回归，是测试重点。
- `game-core`：catalog、存档版本迁移等小型测试。
- `web`：核心交互组件测试和少量端到端测试。
- Android：真机 smoke，覆盖振动、返回键、锁屏恢复、旋转锁定和离线启动。

任何提示算法都需要同时测试“结论”和“证明数据”，保证界面展示的原因确实与计算过程一致。

当前测试覆盖候选数、非法盘面、无解/唯一解/多解、可重复生成、编号解析与题面复现、提示 proof、严格输入、笔记冲突、撤销副作用、存档版本、完成判断，以及活动记录的 v1/v2/v3/v4→v5 迁移、任务目标恢复、任务完成后签到、补签边界、奖杯分级、同日多局、连续天数和非法数据恢复。Web 主流程需要在真实浏览器中验证主页、难度、输入、暂停、恢复、结算、每日任务，以及“选日→进入任务→完成游戏→签到成功”的完整路径。

## 暂不引入

- 后端服务
- 登录和云存档
- 广告及内购
- Electron Desktop
- 通用插件运行时
- 重型全局状态库
- 在线题库依赖

这些内容只有出现明确需求时才进入当前计划。
