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

# 7. 创建 GitHub Release（上传两个 APK）
gh release create vX.Y.Z \
  --repo Jakeopsjj/Intelligent-drinking-water-management \
  --target $(git branch --show-current) \
  --title "vX.Y.Z Debug + Release APK" \
  --notes "更新内容描述" \
  releases/app-debug.apk releases/app-release.apk
```

---

## 构建环境说明

### 不可删除的依赖

以下目录和文件是构建所必需的，**绝对不能删除**，否则需要重新下载（耗时很长）：

| 路径 | 说明 |
|------|------|
| `/opt/android-sdk/` | Android SDK（Platform 36 + Build Tools 36 + Platform Tools） |
| `/root/.android/debug.keystore` | Debug 签名密钥 |
| `/workspace/android/kidneynotes.keystore` | Release 签名密钥 |
| `/root/.local/share/mise/installs/java/17.0.2/` | JDK 17（Gradle 构建必需） |
| `/root/.local/share/mise/installs/gradle/8.14.4/` | Gradle 8.14.4 |
| `/workspace/node_modules/` | npm 依赖 |
| `/root/.gradle/caches/` | Gradle 依赖缓存 |
| `/tmp/cmdline-tools.zip` | Android SDK 命令行工具（备用） |
| `/tmp/platform-36.zip` | Android Platform 36（备用） |

### 环境变量

构建脚本会自动设置以下环境变量：
- `JAVA_HOME=/root/.local/share/mise/installs/java/17.0.2`
- `ANDROID_HOME=/opt/android-sdk`

### 构建配置文件

以下文件已提交到 git，不要删除或修改：

- `android/build.gradle` - 顶层构建脚本（含阿里云 Maven 镜像）
- `android/variables.gradle` - SDK 版本配置
- `scripts/build-apk.sh` - 自动化构建脚本
- `CLAUDE.md` - 本规则文件

以下文件被 gitignore 忽略（机器相关），由 `build-apk.sh` 自动创建：
- `android/gradle.properties` - Gradle 配置（代理、JDK 路径、内存、cgroup 修复）
- `android/local.properties` - Android SDK 路径

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
- **Maven 镜像**：使用阿里云镜像（maven.aliyun.com）加速依赖下载
- **代理**：容器内需要通过 `127.0.0.1:18080` 代理访问外网，已在 gradle.properties 中配置
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
