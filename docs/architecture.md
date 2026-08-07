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
- `web` 负责 UI、路由、交互编排和平台能力适配。
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

## 暂不引入

- 后端服务
- 登录和云存档
- 广告及内购
- Electron Desktop
- 通用插件运行时
- 重型全局状态库
- 在线题库依赖

这些内容只有出现明确需求时才进入当前计划。

