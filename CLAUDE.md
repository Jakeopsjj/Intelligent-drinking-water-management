# 肾友笔记 - 开发规则

## 强制规则 0：每次执行任务前必须先阅读本规则

**在任何代码修改任务开始前，必须先完整阅读 `CLAUDE.md`，理解所有构建步骤和注意事项。**
遇到错误时，必须将错误原因、解决方法、注意事项写入本规则文件，避免重复犯错。

## 强制规则 -1：主动使用技能（Skills）

**每次修改代码后，必须主动评估并使用以下可能相关的技能：**

| 触发条件 | 使用技能 |
|---------|---------|
| 修改代码后提交 | `git-commit` |
| 操作 GitHub（PR/Issue/Release/Repo） | `gh-cli` |
| 修改 React/Next.js 组件或页面 | `react-best-practices` |
| 部署/发布前端项目 | `iga-pages` |
| 构建 UI 页面/组件/落地页 | `frontend-skill` |
| 品牌/视觉风格相关 | `brand-guidelines` |
| 使用 shadcn/ui 组件 | `shadcn` |
| UI 审查/可访问性/设计审核 | `web-design-guidelines` |
| 测试前端应用 | `webapp-testing` |
| Redis 缓存/性能优化 | `redis-development` |

## 强制规则 1：代码修改后必须构建并推送

**每次修改代码后，必须按以下流程执行，不得跳过任何步骤：**

1. **代码检查**：运行 `npm run build` 检查 TypeScript 编译是否通过，修复所有编译错误
2. **构建 APK**：必须构建 Debug 和 Release 两个版本的 APK，并上传到 GitHub Release
3. **推送到 GitHub**：构建成功后，执行 git commit + push 到远程仓库
4. **创建 GitHub Release**：**必须执行此步骤，否则用户在发行版页面看不到任何更新！**
   - 使用 `gh release create vX.Y.Z` 创建 Release
   - 上传 `app-debug.apk` 和 `app-release.apk` 两个 APK 作为 Release Assets
   - 编写更新日志作为 Release Notes（区分新增功能、交互优化、缺陷修复）
   - 添加 `--latest` 标记为最新版本
   - APP 内置「检查更新」功能通过 GitHub API 读取 Release 信息，不创建 Release 则无法获取更新

### 完整构建流程（手动步骤，避免 build-apk.sh 自动递增版本号）

```bash
# 0. 确保依赖完整
cd /workspace && npm install

# 1. 构建 Web 资源（必须先于 cap sync）
npm run build

# 2. 同步 Capacitor
npx cap sync android

# 3. 修复 Java 版本兼容性（必须在 cap sync 之后）
export JAVA_HOME=/root/.local/share/mise/installs/java/17.0.2
export ANDROID_HOME=/opt/android-sdk
GRADLE=/root/.local/share/mise/installs/gradle/8.14.4/gradle-8.14.4/bin/gradle
for f in node_modules/@capacitor/android/capacitor/build.gradle \
         node_modules/@capacitor/app/android/build.gradle \
         node_modules/@capacitor/filesystem/android/build.gradle \
         node_modules/@capacitor/preferences/android/build.gradle \
         node_modules/@capacitor/share/android/build.gradle \
         node_modules/@capacitor/local-notifications/android/build.gradle \
         android/capacitor-cordova-android-plugins/build.gradle \
         android/app/capacitor.build.gradle; do
  [ -f "$f" ] && grep -q 'jvmToolchain(21)' "$f" 2>/dev/null && sed -i 's/jvmToolchain(21)/jvmToolchain(17)/g' "$f"
  [ -f "$f" ] && grep -q 'VERSION_21' "$f" 2>/dev/null && sed -i 's/VERSION_21/VERSION_17/g' "$f"
done

# 4. 构建 Debug + Release APK
cd android && "$GRADLE" assembleDebug --no-daemon -q && "$GRADLE" assembleRelease --no-daemon -q

# 5. 复制到 releases/
mkdir -p ../releases
cp app/build/outputs/apk/debug/app-debug.apk ../releases/
cp app/build/outputs/apk/release/app-release.apk ../releases/

# 6. Git 提交
cd /workspace
git add -A
git commit -m "chore: 构建vX.Y.Z正式版Debug+Release双APK"
git push origin $(git branch --show-current)

# 7. 创建 GitHub Release（上传两个 APK）——必须执行，否则用户看不到更新！
gh release create vX.Y.Z \
  --repo Jakeopsjj/Intelligent-drinking-water-management \
  --target $(git branch --show-current) \
  --title "vX.Y.Z - 版本标题" \
  --notes "更新内容描述（区分新增功能/交互优化/缺陷修复）" \
  --latest \
  releases/app-debug.apk releases/app-release.apk

# 8. 验证 Release 创建成功
gh release view vX.Y.Z
gh release list --limit 3
```

> **重要提醒**：只推送代码到分支 ≠ 发布更新！用户和 APP 内置「检查更新」功能都通过 GitHub Release 获取更新信息。必须创建 Release 并上传 APK 才算完成交付。

---

## 强制规则 2：版本号同步

**每次发布新版本前，必须同步更新以下三处版本号：**

| 文件 | 字段 | 说明 |
|------|------|------|
| `package.json` | `version` | npm 包版本号 |
| `android/app/build.gradle` | `versionName` + `versionCode` | Android 原生版本号（CapacitorApp.getInfo() 读取此值） |
| `src/lib/updateChecker.ts` | `APP_VERSION` | 应用内版本检查常量（Web 环境回退值） |

**重要性**：`getCurrentVersion()` 优先调用 `CapacitorApp.getInfo()`，它返回的是 Android `versionName`。如果只更新 `package.json` 和 `updateChecker.ts` 而遗漏 `build.gradle`，应用内显示版本号将与实际发布版本不一致。

### 版本号校验

每次构建前会**自动执行**版本一致性检查（`prebuild` 脚本）。也可手动运行：

```bash
# 检查版本号是否一致
npm run check-version

# 自动将 android + updateChecker 同步到 package.json 的版本
npm run check-version:fix
```

校验脚本位置：`scripts/check-version.cjs`

三处版本号必须完全一致，否则构建会失败。

---

## 构建环境说明

### 不可删除的依赖

以下目录和文件是构建所必需的，**绝对不能删除**，否则需要重新下载（耗时很长）：

| 路径 | 说明 |
|------|------|
| `/opt/android-sdk/` | Android SDK（Platform 36 + Build Tools 36 + Platform Tools + cmdline-tools） |
| `/root/.android/debug.keystore` | Debug 签名密钥 |
| `/workspace/android/kidneynotes.keystore` | Release 签名密钥 |
| `/root/.local/share/mise/installs/java/17.0.2/` | JDK 17（Gradle 构建必需） |
| `/root/.local/share/mise/installs/gradle/8.14.4/` | Gradle 8.14.4 |
| `/workspace/node_modules/` | npm 依赖 |
| `/root/.gradle/caches/` | Gradle 依赖缓存 |
| `/tmp/cmdline-tools.zip` | Android SDK 命令行工具（备用，可重新下载） |

### 环境变量

构建脚本会自动设置以下环境变量：
- `JAVA_HOME=/root/.local/share/mise/installs/java/17.0.2`
- `ANDROID_HOME=/opt/android-sdk`
- `ANDROID_SDK_ROOT=/opt/android-sdk`
- `_JAVA_OPTIONS=-Djava.net.preferIPv4Stack=true -Djava.net.preferIPv6Addresses=false`（强制 IPv4）

### 构建配置文件

以下文件已提交到 git，不要删除或修改：

- `android/build.gradle` - 顶层构建脚本（含腾讯/阿里云/华为云/清华四组国内 Maven 镜像）
- `android/variables.gradle` - SDK 版本配置
- `scripts/build-apk.sh` - 自动化构建脚本
- `CLAUDE.md` - 本规则文件

以下文件被 gitignore 忽略（机器相关），需手动创建（参见错误记录 #14）：
- `android/gradle.properties` - Gradle 配置（代理、JDK 路径、内存、cgroup 修复、强制 IPv4）
- `android/local.properties` - Android SDK 路径（`sdk.dir=/opt/android-sdk`）

### APK 下载

构建完成后，APK 会复制到 `releases/` 目录并提交到 GitHub：
- `releases/app-debug.apk` - Debug 版本（5.6M）
- `releases/app-release.apk` - Release 版本（4.4M，使用 debug 签名）

### 技术栈

- React 18 + TypeScript 5.8 + Vite 6.4
- Zustand 5 + persist 中间件
- Tailwind CSS + framer-motion
- Capacitor 8（Android 打包）
- compileSdkVersion = 36, minSdkVersion = 24, targetSdkVersion = 36

### 构建脚本说明

`scripts/build-apk.sh` 会自动完成：
1. 检查并安装 Android SDK（如果不存在）
2. 检查并创建 debug keystore（如果不存在）
3. 确保 Gradle 配置文件存在（gradle.properties + local.properties，如果不存在则自动创建）
4. 检查并安装 npm 依赖（如果不存在）
5. 同步 Capacitor 资源（npx cap sync）—— 必须在步骤6之前，因为 cap sync 会重新生成 capacitor.build.gradle
6. 修复 Capacitor 插件 Java 版本兼容性（jvmToolchain 21 → 17, VERSION_21 → VERSION_17）—— 必须在 cap sync 之后执行，否则修改会被覆盖
7. 构建 Debug APK
8. 构建 Release APK（无 release keystore 时自动回退 debug 签名）
9. 复制 APK 到 `releases/` 目录（用于提交到 GitHub 供下载）

### 注意事项

- **Java 版本**：必须使用 JDK 17 构建，不能用 JDK 25（Capacitor 插件不兼容）
- **Maven 镜像**：使用腾讯/阿里云/华为云/清华四组国内镜像加速依赖下载（见 build.gradle）
- **代理（必需）**：容器网络架构强制要求外网流量通过 `127.0.0.1:18080` 代理，**不能关闭**。JVM 直连外网会被网络策略阻止（5s 超时）。已在 gradle.properties 中配置 systemProp.https.proxyHost
- **强制 IPv4**：容器中 IPv6 不可达，需在 gradle.properties 中配置 `systemProp.java.net.preferIPv4Stack=true`，避免 "Network is unreachable" 错误
- **Cgroup bug**：JDK 17.0.2 在 cgroup v2 容器中有 bug，需在 jvmargs 中添加 `-XX:-UseContainerSupport`
- **Capacitor 插件**：所有 `@capacitor/*` 插件的 `jvmToolchain(21)` 需改为 `jvmToolchain(17)`，构建脚本会自动处理

---

## 错误记录与解决方案

### 1. `node_modules/@capacitor/` 缺失导致 Gradle 构建失败

**错误现象**：
```
No matching variant of project :capacitor-android was found.
- No variants exist.
```

**原因**：`node_modules` 被意外清空（如 git checkout 切换分支后）

**解决**：
```bash
cd /workspace && npm install
```

**预防**：每次构建前先执行 `npm install` 确保依赖完整。

---

### 2. `npx cap sync` 报错 `Could not find the web assets directory: ./dist`

**原因**：`cap sync` 需要 `dist/` 目录存在，必须先执行 `npm run build` 生成 Web 资源。

**解决**：严格按顺序执行：`npm run build` → `npx cap sync android`

**注意**：`cap sync` 会重新生成 `capacitor.build.gradle` 和 `capacitor.settings.gradle`，覆盖手动修改。因此 Java 版本修复必须在 `cap sync` 之后执行。

---

### 3. Gradle Wrapper 下载超时

**错误现象**：
```
Downloading https://services.gradle.org/distributions/gradle-8.14.4-all.zip failed: timeout
```

**原因**：容器网络环境不稳定，从外网下载 Gradle 超时（120s）

**解决**：跳过 Gradle Wrapper，直接使用系统已安装的 Gradle：
```bash
GRADLE=/root/.local/share/mise/installs/gradle/8.14.4/gradle-8.14.4/bin/gradle
"$GRADLE" assembleDebug --no-daemon -q
```

**注意**：不要使用 `./gradlew`，直接用 `$GRADLE` 变量指向系统安装的 Gradle。

---

### 4. `gradle.properties` 缺失导致阿里云 Maven 连接超时

**错误现象**：
```
Connect to maven.aliyun.com:443 failed: Connect timed out
```

**原因**：`android/gradle.properties` 被 gitignore 忽略，切换分支后丢失。该文件包含代理配置（`127.0.0.1:18080`），没有代理无法访问外网 Maven 仓库。

**解决**：手动创建 `android/gradle.properties`：
```properties
android.useAndroidX=true
android.enableJetifier=false
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8 -XX:-UseContainerSupport
org.gradle.java.installations.paths=/root/.local/share/mise/installs/java/17.0.2
org.gradle.java.installations.auto-download=false
systemProp.http.proxyHost=127.0.0.1
systemProp.http.proxyPort=18080
systemProp.https.proxyHost=127.0.0.1
systemProp.https.proxyPort=18080
```

---

### 5. Git Push 认证失败

**错误现象**：
```
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

**原因**：Git 没有配置凭据助手

**解决**：
```bash
gh auth setup-git --hostname github.com
```

---

### 6. GitHub Release 创建失败 `target_commitish is invalid`

**原因**：`--target` 指定的 commit 必须存在于远程仓库。如果 commit 只存在于本地，需要先 push。

**解决**：先 `git push` 将 commit 推送到远程，再创建 Release。

---

### 7. `build-apk.sh` 自动递增版本号问题

**问题**：`build-apk.sh` 脚本的第一步就是 `bump_version`，会自动将版本号 +1（如 2.18.4 → 2.18.5）。如果只是想重新构建当前版本，不应该使用该脚本。

**解决**：使用手动构建步骤（见上方"完整构建流程"），跳过自动版本递增。

---

### 8. TypeScript 编译错误：导入路径错误

**错误现象**：
```
Module '"@/utils/calc"' has no exported member 'getTodayKey'
```

**原因**：`getTodayKey` 函数定义在 `@/utils/date` 中，不是 `@/utils/calc`。

**解决**：检查导入路径，确保从正确的模块导入：
```typescript
import { getTodayKey } from '@/utils/date';
```

---

### 9. Android `versionName` 未同步导致应用内版本号显示错误

**错误现象**：
- `package.json` 和 `updateChecker.ts` 已更新为 `2.19.0`
- 但安装应用后，设置页显示版本号仍为 `2.18.5`

**根因**：`getCurrentVersion()` 优先调用 `CapacitorApp.getInfo()`，它返回 Android 原生 `versionName`（`android/app/build.gradle`）。该文件未同步更新，仍为 `versionName "2.18.5"`。

**解决**：
1. 同步更新 `android/app/build.gradle` 中的 `versionName` 和 `versionCode`
2. 运行 `npm run check-version` 验证三处版本号一致
3. 所有版本号变更使用 `npm run check-version:fix` 自动同步

**预防**：构建前 `prebuild` 钩子会自动执行版本校验，不一致时构建失败。

---

### 10. 只推送代码未创建 GitHub Release，用户看不到更新 ⚠️

**错误现象**：
- 已执行 `git commit` + `git push` 推送代码到远程分支
- APK 已构建成功
- 但用户在 GitHub 仓库「Releases」发行版页面看不到任何新版本
- APP 内置「检查更新」功能无法获取到新版本信息

**根因**：**代码推送到分支 ≠ 发布更新**。GitHub 的代码分支推送和 Release 发行版发布是两个独立操作。APP 内置的 `fetchLatestRelease()` 通过 GitHub API `/releases/latest` 端点获取更新信息，该端点只返回已创建的 Release，与分支上的代码提交无关。

**解决**：在代码推送后，必须使用 `gh release create` 创建 GitHub Release 并上传 APK：
```bash
gh release create vX.Y.Z \
  --target $(git branch --show-current) \
  --title "vX.Y.Z - 版本标题" \
  --notes "更新内容描述" \
  --latest \
  app-debug.apk app-release.apk
```

**验证**：创建后执行 `gh release view vX.Y.Z` 确认 Release 存在且 APK 已上传为 Assets。

**预防**：强制规则 1 已更新，创建 GitHub Release 为必须步骤，不可跳过。

---

### 11. 版本号递增遗漏导致同一版本号重复发布

**错误现象**：
- 完成代码修改后直接构建，未递增版本号
- 导致新构建的 APK 与上一个 Release 版本号相同
- 用户通过「检查更新」看不到新版本（版本号相同，`compareVersions` 返回 0）

**根因**：每次代码修改后必须递增版本号，否则 GitHub Release 新版本号与旧版本号相同，APP 内 `compareVersions(release.version, currentVersion)` 返回 0，判定为「已是最新版本」。

**解决**：
1. 查询 Git 最新版本号：`git log --oneline | grep -oE "v?[0-9]+\.[0-9]+\.[0-9]+"`
2. 递增版本号（patch/minor/major）
3. 使用 `npm run check-version:fix` 同步三处版本号
4. 构建并创建新版本 Release

**预防**：每次代码修改后，第一步就是递增版本号，确保版本号唯一可追溯。

---

### 12. JVM 在容器中无法直连外网，必须通过代理 ⚠️

**错误现象**：
- `curl` 能访问国内镜像（HTTP 200），但 Gradle JVM 报错 `Connect timed out`
- 错误信息：`Got socket exception during request. It might be caused by SSL misconfiguration > Network is unreachable`
- 添加 `systemProp.java.net.preferIPv4Stack=true` 后变为 `Connect to mirrors.cloud.tencent.com:443 failed: Connect timed out`

**根因**：
- 容器网络架构强制要求外网流量通过代理 `127.0.0.1:18080`
- JVM 的 Socket 直连会被网络策略阻止（5s 超时）
- `curl` 之所以能访问，是因为它自动读取了环境变量 `HTTP_PROXY`/`HTTPS_PROXY`，实际上也走了代理
- "全程关闭代理" 在当前容器中**无法实现**，关闭代理后 JVM 完全无法联网

**验证方法**：
```java
// JVM 直连外网 IP（超时）
Socket s = new Socket();
s.connect(new InetSocketAddress("111.161.120.105", 443), 5000); // 超时

// JVM 通过代理（成功，90ms）
Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress("127.0.0.1", 18080));
Socket s = new Socket(proxy);
s.connect(new InetSocketAddress("maven.aliyun.com", 443), 5000); // 成功
```

**解决**：保留代理配置 `systemProp.https.proxyHost=127.0.0.1:18080`，配合国内镜像使用。代理本身能正常访问国内镜像（HTTP 200, 0.04s），无超时问题。

**预防**：不要尝试关闭代理。容器网络架构决定了代理是必需的，不是可选的。

---

### 13. IPv6 不可达导致 Gradle 报 "Network is unreachable" ⚠️

**错误现象**：
- Gradle 报错：`Got socket exception during request. It might be caused by SSL misconfiguration > Network is unreachable`
- "Network is unreachable" 是 IPv6 错误（IPv4 错误是 "Connection refused" 或 "No route to host"）

**根因**：
- 容器中 `/proc/sys/net/ipv6/conf/all/disable_ipv6` 返回 `0`（IPv6 未禁用）
- 但 IPv6 实际不可达（容器网络命名空间限制）
- JVM 解析 DNS 时优先返回 IPv6 地址，连接 IPv6 失败后报 "Network is unreachable"

**解决**：在 `gradle.properties` 中添加：
```properties
# 强制 IPv4，避免 IPv6 不可达
systemProp.java.net.preferIPv4Stack=true
systemProp.java.net.preferIPv6Addresses=false
```

**注意**：
- `org.gradle.jvmargs` 中的 `-Djava.net.preferIPv4Stack=true` 只作用于 JVM 进程，不作用于 Gradle HTTP 客户端
- 必须用 `systemProp.` 前缀才能让 Gradle HTTP 客户端生效
- buildscript 解析时机很早，`systemProp` 可能还未加载，建议同时设置环境变量 `_JAVA_OPTIONS` 和 `GRADLE_OPTS`

---

### 14. Android SDK 全新环境需重新下载 ⚠️

**错误现象**：
- Gradle 报错：`SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable`
- 或：`WARNING: The following problems were found when resolving the SDK location: Directory does not exist`
- `/opt/android-sdk/` 目录不存在，备用文件 `/tmp/cmdline-tools.zip`、`/tmp/platform-36.zip` 也不存在

**根因**：全新容器环境，Android SDK 未预装

**解决**：从零下载安装 Android SDK
```bash
# 1. 下载 cmdline-tools（走代理）
mkdir -p /opt/android-sdk/cmdline-tools
curl -L -o /tmp/cmdline-tools.zip -x http://127.0.0.1:18080 \
  "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
unzip -q /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools/
mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest

# 2. 创建 debug keystore
mkdir -p /root/.android
keytool -genkey -v -keystore /root/.android/debug.keystore -alias androiddebugkey \
  -dname "CN=Android Debug,O=Android,C=US" -storepass android -keypass android \
  -keyalg RSA -keysize 2048 -validity 10000

# 3. 接受 license + 安装 SDK 组件
export JAVA_HOME=/root/.local/share/mise/installs/java/17.0.2
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export _JAVA_OPTIONS="-Djava.net.preferIPv4Stack=true"
export HTTPS_PROXY=http://127.0.0.1:18080
PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
yes | sdkmanager --licenses --proxy=http --proxy_host=127.0.0.1 --proxy_port=18080
yes | sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" \
  --proxy=http --proxy_host=127.0.0.1 --proxy_port=18080

# 4. 创建 local.properties（被 gitignore 忽略，需手动创建）
echo "sdk.dir=/opt/android-sdk" > /workspace/android/local.properties
```

**预防**：每次构建前检查 `/opt/android-sdk/platforms/android-36/` 是否存在，不存在则按上述流程安装。

---

## 版本变更记录

### v2.24.0 (2026-07-24)

**新增功能：**
- **动态天气背景主题系统（WallpaperWeather 复刻版）**：完全复刻 WallpaperWeather 效果
  - 底层风景图（Pexels 在线 4K + 离线本地资源兜底）+ 上层 Canvas 粒子动画
  - 天气逻辑：Open-Meteo API + 日出日落时段划分（清晨/正午/傍晚/夜晚）
  - WMO 天气编码映射：覆盖晴/云/阴/雾/毛毛雨/雨/大雨/雪/雷暴 9 种天气
  - 背景素材两种模式：在线 Pexels API + 离线本地资源包（36 静态图 + 16 视频）
  - Canvas 粒子动画：云层/雨滴/雪花/雾气/星光/闪电，透明不遮挡 APP 控件
  - 安卓 WebView 承载主题：全屏无 HUD，原生定位通过 JSBridge 注入网页
  - 容错优化：API 失败→离线素材→兜底渐变三级降级
  - 设备性能自适应：粒子数量 30/60/100 三档（根据 CPU 核心数和内存）

**交付内容：**
- 单文件 HTML 天气主题（`android/app/src/main/assets/weather_theme/index.html`）
- 天气-关键词映射 JS 对象（`weather-keywords.js`，36 静态 + 16 视频）
- 安卓 WebView Activity（`WeatherThemeActivity.java` + `LocationHelper.java`）
- 离线素材下载关键词清单（`docs/OFFLINE_ASSETS_LIST.md`，含批量下载脚本）
- 打包部署步骤指南（`docs/WEATHER_THEME_INTEGRATION.md`，含三种集成方案）

**集成变更：**
- AndroidManifest 注册 WeatherThemeActivity + 新增定位权限
- React 层通过 iframe 嵌入 HTML 主题作为全局背景（WeatherThemeBackground 组件）

### v2.23.0 (2026-07-24)

**新增功能：**
- **实时天气动态背景**：基于位置的天气感知系统
  - 集成 Open-Meteo API（免费无需 Key）+ ipapi.co IP 定位，自动获取用户当前位置的实时天气数据
  - 根据天气类型（晴/云/阴/雾/毛毛雨/雨/大雨/雪/雷暴）切换不同的粒子动画
  - 晴天白天：太阳光晕 + 旋转光线；晴天夜晚：月亮 + 月光晕
  - 多云/阴天：漂浮云朵；雾天：多层雾带漂移
  - 雨/大雨：CSS 驱动雨滴下落（密度可调）；雪：旋转飘落的雪花；雷暴：大雨 + 闪电闪光
  - 日夜自适应：白天/夜晚氛围色调自动切换
  - 智能缓存：位置缓存 2 小时、天气缓存 30 分钟，减少 API 请求
  - 自动刷新：30 分钟定时刷新 + 页面可见性恢复刷新 + 网络恢复刷新
  - 完整支持 Open-Meteo WMO Weather Code 标准

**构建优化：**
- Gradle 国内镜像配置：新增腾讯云、阿里云、华为云、清华大学四组国内 Maven 镜像，按优先级依次尝试
- 末尾保留 google()/mavenCentral() 作为兜底，避免私有包缺失
- 强制 IPv4（systemProp.java.net.preferIPv4Stack=true），解决容器 IPv6 不可达问题
- 修复 Gradle 下载超时失败问题

**规则完善：**
- 新增错误记录 #12：JVM 在容器中无法直连外网，必须通过代理
- 新增错误记录 #13：IPv6 不可达导致 Gradle 报 "Network is unreachable"
- 新增错误记录 #14：Android SDK 全新环境需重新下载

### v2.20.0 (2026-07-24)

**新增功能：**
- 版本更新日志系统：APP 内置「检查更新」功能完整更新日志展示，支持本地 changelog 降级方案
- 透析数据统计分析模块：自动核算每日摄水量与剩余饮水限额，透析前后体重差值，趋势曲线图
- 透析专项日志系统：透析信息录入，不适症状登记，历史记录长期保存
- 健康指标智能预警：体重涨幅超标、摄水量超限、血压异常预警
- 饮食百科透析评估：钾/磷含量评估，透析人群食用建议
- 本地数据自动备份与恢复：定期自动备份，手动备份，备份管理

**交互优化：**
- 饮食百科图文加载容错逻辑优化
- 设置页面新增备份管理区域
- 版本号递增机制规范化

**缺陷修复：**
- 修复版本号打包不一致问题，新增版本号校验机制
- 修复检查更新网络失败时弹窗空白，新增本地日志降级
- 修复透析日志页面日期格式化函数参数类型错误

**规则完善：**
- 强制规则 1 新增第 4 步：创建 GitHub Release 为必须步骤
- 新增错误记录 #10：只推送代码未创建 Release 导致用户看不到更新
- 新增错误记录 #11：版本号递增遗漏导致同一版本号重复发布

### v2.19.0 (2026-07-24)

**UI 优化：**
- 移除 Dashboard 中冗余的快速记录区（6 个 QuickRecordCard），改为统一 QuickRecordModal 弹窗
- 点击摄水量/超滤量/水果摄入 MetricCard 弹出对应录入表单
- 点击体重/血压核心体征卡片弹出对应录入表单
- 服药记录入口移至「今日记录」标题栏

**新功能：干体重管理**
- 新增 `dryWeight` 设置项（Settings 页面），用于记录透析后目标体重
- Dashboard 体重卡片展示干体重对比（已达干体重/高于干体重/超干体重三档状态）
- 体液增长预警：≥2kg 显示注意事项，≥3kg 显示紧急提醒（红色边框+联系医生建议）
- 透析日当天显示准备清单卡片（测量体重、测量血压、准备透析用品、确认透析时间）

**版本管理修复：**
- 修复 `android/app/build.gradle` 版本号遗漏（versionName 2.18.5 → 2.19.0）
- 新增 `scripts/check-version.cjs` 版本号一致性校验脚本
- 新增 `prebuild` 钩子：构建前自动校验三处版本号一致
- 新增 `npm run check-version` / `check-version:fix` 命令
- 更新「强制规则 2」：版本号同步位置从 2 处扩展为 3 处
