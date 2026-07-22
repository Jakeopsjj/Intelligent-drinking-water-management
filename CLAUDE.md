# 肾友笔记 - 开发规则

## 强制规则：代码修改后必须构建并推送

**每次修改代码后，必须按以下流程执行，不得跳过任何步骤：**

1. **代码检查**：运行 `npm run build` 检查 TypeScript 编译是否通过，修复所有编译错误
2. **构建 APK**：运行 `bash /workspace/scripts/build-apk.sh`，该脚本会自动构建 Debug 和 Release 两个版本的 APK
3. **推送到 GitHub**：构建成功后，执行 git commit + push 到远程仓库

```bash
# 标准流程（每次修改后执行）
cd /workspace && npm run build && bash scripts/build-apk.sh && git add -A && git commit -m "描述修改内容" && git push
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
