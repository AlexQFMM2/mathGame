# MathGame Android App

这个目录只负责把 `apps/web/dist` 包装成 Android 应用，不维护第二套 UI 或游戏逻辑。

首次生成 Android 工程：

```bash
pnpm install
pnpm --filter @math-game/mobile cap:add:android
```

同步 Web 构建并打开 Android Studio：

```bash
pnpm mobile:sync
pnpm mobile:open
```

生成 debug APK：

```bash
pnpm mobile:android:debug
```

生成 Android 工程后，需要在 `AndroidManifest.xml` 中锁定 portrait，并验证状态栏、安全区域、返回键、休眠恢复和 Haptics。正式发布前还要将临时的 `com.mathgame.app` 替换成最终应用 ID，并配置 release signing。
