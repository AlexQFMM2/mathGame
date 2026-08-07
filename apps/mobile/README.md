# MathGame Android App

这个目录只负责把 `apps/web/dist` 包装成 Android 应用，不维护第二套 UI 或游戏逻辑。

Android 原生工程已经纳入仓库；首次安装依赖后可直接同步：

```bash
pnpm install
pnpm mobile:sync
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

GitHub Release 使用与 Pokémon 项目相同的首发策略：显式推送 `v*` tag 后，由 `.github/workflows/release-android.yml` 构建 debug-signed 可安装 APK，并作为 prerelease 资产发布。当前应用 ID 为 `com.alexqfmm.mathgame`，原生工程锁定 portrait。

```bash
git tag v0.1.0
git push origin v0.1.0
```

debug 签名只用于当前直接安装测试；正式上架或需要长期覆盖升级前，必须配置独立 release signing，不能把密钥提交到仓库。
