#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# [构建铁律] 严禁违反，违反必导致代码修改不生效
# ============================================================
# 1. 必须先执行 `npm run build` 生成新的 dist/，再执行 `npx cap sync`
# 2. `npx cap sync` 只会把【已存在的】dist/ 复制进 Android，不会触发 Vite 构建
# 3. 若 dist/ 是旧的，APK 大小会字节级一致，打进去的 JS bundle 永远是旧代码
# 4. 验证：每次构建后用 `grep apihz.cn android/app/src/main/assets/public/assets/*.js`
#    确认新代码已进入 APK；APK 大小应有变化（若完全一致 = 没重新打包）
#
# 历史教训：曾因缺失 build_web 步骤，连续多个版本 APK 跑的全是旧 JS bundle，
#          用户反馈"代码一直没变"，实际是 Vite 从未重新构建。
# ============================================================

# ============================================================
# 肾友笔记 APK 自动构建脚本
# 功能：检查环境 → 构建 Web → 同步 Capacitor → 构建 Debug + Release APK
# ============================================================

PROJECT_ROOT="/workspace"
ANDROID_DIR="$PROJECT_ROOT/android"
ANDROID_SDK="/opt/android-sdk"
JAVA17="/root/.local/share/mise/installs/java/17.0.2"
GRADLE="/root/.local/share/mise/installs/gradle/8.14.4/gradle-8.14.4/bin/gradle"

export JAVA_HOME="$JAVA17"
export ANDROID_HOME="$ANDROID_SDK"
export PATH="$JAVA17/bin:$ANDROID_SDK/platform-tools:$PATH"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================
# 0. 自动递增版本号
#    - patch 位 +1（如 2.15.0 → 2.15.1，2.15.9 → 2.16.0）
#    - 同步更新 package.json 的 version、build.gradle 的 versionName/versionCode
#    - 纯 bash/sed 实现，不依赖 node/python
# ============================================================
bump_version() {
    local pkg="$PROJECT_ROOT/package.json"
    local gradle="$ANDROID_DIR/app/build.gradle"

    # 读取当前版本号（package.json 的 "version" 字段）
    local cur
    cur=$(grep '"version"' "$pkg" | head -1 | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

    # 拆分为 major.minor.patch
    local major minor patch rest
    major=${cur%%.*}
    rest=${cur#*.}
    minor=${rest%%.*}
    patch=${rest#*.}

    # patch +1，超过 9 则归零并进位到 minor
    patch=$((patch + 1))
    if [ "$patch" -gt 9 ]; then
        patch=0
        minor=$((minor + 1))
    fi

    local new="$major.$minor.$patch"
    info "版本递增: $cur → $new"

    # 1. 同步 package.json 的 version 字段
    sed -i "s/\"version\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"version\": \"$new\"/" "$pkg"

    # 2. 同步 build.gradle 的 versionName（双引号字符串）
    sed -i "s/versionName[[:space:]]*\"[^\"]*\"/versionName \"$new\"/" "$gradle"

    # 3. 同步 build.gradle 的 versionCode（+1）
    local cur_code new_code
    cur_code=$(grep 'versionCode' "$gradle" | head -1 | sed 's/.*versionCode[[:space:]]*\([0-9][0-9]*\).*/\1/')
    new_code=$((cur_code + 1))
    sed -i "s/versionCode[[:space:]]*[0-9][0-9]*/versionCode $new_code/" "$gradle"
}

# ============================================================
# 1. 检查并安装 Android SDK
# ============================================================
ensure_android_sdk() {
    if [ -d "$ANDROID_SDK/platforms/android-36" ] && [ -d "$ANDROID_SDK/build-tools/36.0.0" ]; then
        info "Android SDK 已安装，跳过"
        return 0
    fi

    info "安装 Android SDK..."
    mkdir -p "$ANDROID_SDK/cmdline-tools"
    cd /tmp

    if [ ! -f cmdline-tools.zip ]; then
        curl -L -o cmdline-tools.zip --max-time 120 \
            "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    fi
    unzip -q cmdline-tools.zip -d "$ANDROID_SDK/cmdline-tools"
    rm -rf "$ANDROID_SDK/cmdline-tools/latest" 2>/dev/null
    mv "$ANDROID_SDK/cmdline-tools/cmdline-tools" "$ANDROID_SDK/cmdline-tools/latest"

    yes | "$ANDROID_SDK/cmdline-tools/latest/bin/sdkmanager" \
        "platforms;android-36" "build-tools;36.0.0" "platform-tools" 2>&1 | tail -5

    # sdkmanager 可能因网络失败，备用方案：直接下载 zip
    if [ ! -d "$ANDROID_SDK/platforms/android-36" ]; then
        warn "sdkmanager 下载失败，尝试直接下载 platform-36..."
        curl -L -o platform-36.zip --max-time 120 \
            "https://dl.google.com/android/repository/platform-36_r02.zip"
        unzip -q platform-36.zip -d "$ANDROID_SDK/platforms/"
    fi
    info "Android SDK 安装完成"
}

# ============================================================
# 2. 确保 debug keystore 存在
# ============================================================
ensure_debug_keystore() {
    if [ -f /root/.android/debug.keystore ]; then
        info "Debug keystore 已存在，跳过"
        return 0
    fi
    info "创建 debug keystore..."
    mkdir -p /root/.android
    "$JAVA17/bin/keytool" -genkey -v \
        -keystore /root/.android/debug.keystore \
        -storepass android -alias androiddebugkey -keypass android \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -dname "CN=Android Debug,O=Android,C=US" 2>&1 | tail -3
    info "Debug keystore 创建完成"
}

# ============================================================
# 3. 确保 Gradle 配置文件存在（gradle.properties + local.properties）
# ============================================================
ensure_gradle_config() {
    # local.properties - Android SDK 路径
    if [ ! -f "$ANDROID_DIR/local.properties" ]; then
        info "创建 local.properties..."
        echo "sdk.dir=$ANDROID_SDK" > "$ANDROID_DIR/local.properties"
    fi

    # gradle.properties - 构建配置（JDK17、代理、cgroup 修复）
    if [ ! -f "$ANDROID_DIR/gradle.properties" ]; then
        info "创建 gradle.properties..."
        cat > "$ANDROID_DIR/gradle.properties" << 'GPROP'
android.useAndroidX=true
android.enableJetifier=false
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8 -XX:-UseContainerSupport
org.gradle.java.installations.paths=/root/.local/share/mise/installs/java/17.0.2
org.gradle.java.installations.auto-download=false
systemProp.http.proxyHost=127.0.0.1
systemProp.http.proxyPort=18080
systemProp.https.proxyHost=127.0.0.1
systemProp.https.proxyPort=18080
systemProp.http.nonProxyHosts=localhost|127.0.0.1|.svc|.cluster.local|::1
systemProp.https.nonProxyHosts=localhost|127.0.0.1|.svc|.cluster.local|::1
systemProp.org.gradle.internal.http.connectionTimeout=30000
systemProp.org.gradle.internal.http.socketTimeout=30000
GPROP
    fi
    info "Gradle 配置文件已就绪"
}

# ============================================================
# 4. 确保 npm 依赖已安装
# ============================================================
ensure_npm_deps() {
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        info "npm 依赖已安装，跳过"
        return 0
    fi
    info "安装 npm 依赖..."
    cd "$PROJECT_ROOT"
    npm install 2>&1 | tail -5
    info "npm 依赖安装完成"
}

# ============================================================
# 4a. 构建 Web 资源 (Vite build → dist/)
#     必须在 cap sync 之前执行，否则 cap sync 会把旧的 dist 复制进 Android
# ============================================================
build_web() {
    info "构建 Web 资源 (tsc + vite build)..."
    cd "$PROJECT_ROOT"
    # 清理旧的 dist，避免遗留陈旧 chunk 文件
    rm -rf "$PROJECT_ROOT/dist"
    npm run build 2>&1 | tail -15
    if [ ! -d "$PROJECT_ROOT/dist" ] || [ ! -f "$PROJECT_ROOT/dist/index.html" ]; then
        error "Web 构建失败：dist/ 不存在或缺少 index.html"
        return 1
    fi
    info "Web 构建完成，dist/ 已更新"
}

# ============================================================
# 4b. 同步 Capacitor 资源（必须在修复 Java 版本之前执行，
#    因为 cap sync 会重新生成 capacitor.build.gradle）
# ============================================================
sync_capacitor() {
    info "同步 Capacitor 资源..."
    cd "$PROJECT_ROOT"
    npx cap sync android 2>&1 | tail -5
    info "Capacitor 同步完成"
}

# ============================================================
# 5. 修复 Capacitor 插件 Java 版本兼容性
#    （必须在 cap sync 之后执行，否则会被覆盖）
#    所有 jvmToolchain(21) 改为 jvmToolchain(17)
#    所有 VERSION_21 改为 VERSION_17
# ============================================================
fix_capacitor_java_version() {
    info "检查 Capacitor 插件 Java 版本兼容性..."
    cd "$PROJECT_ROOT"

    local changed=0
    for f in \
            node_modules/@capacitor/android/capacitor/build.gradle \
            node_modules/@capacitor/app/android/build.gradle \
            node_modules/@capacitor/filesystem/android/build.gradle \
            node_modules/@capacitor/preferences/android/build.gradle \
            node_modules/@capacitor/share/android/build.gradle \
            node_modules/@capacitor/local-notifications/android/build.gradle \
            android/capacitor-cordova-android-plugins/build.gradle \
            android/app/capacitor.build.gradle
        do
        if [ -f "$f" ] && grep -q 'jvmToolchain(21)' "$f" 2>/dev/null; then
            sed -i 's/jvmToolchain(21)/jvmToolchain(17)/g' "$f"
            info "  修复: $f"
            changed=1
        fi
        # 修复 compileOptions 中的 VERSION_21
        if [ -f "$f" ] && grep -q 'VERSION_21' "$f" 2>/dev/null; then
            sed -i 's/VERSION_21/VERSION_17/g' "$f"
            info "  修复 VERSION: $f"
            changed=1
        fi
    done

    if [ $changed -eq 0 ]; then
        info "  无需修复"
    fi
}

# ============================================================
# 6. 构建 APK
# ============================================================
build_apk() {
    local build_type="$1"
    info "开始构建 ${build_type} APK..."

    cd "$ANDROID_DIR"

    local task="assemble${build_type^}"
    local store_file_arg=""

    # Release 构建需要签名参数
    if [ "$build_type" = "release" ] && [ -f "$ANDROID_DIR/kidneynotes.keystore" ]; then
        # 从 git 配置或环境变量中读取签名信息
        # 如果没有配置则回退到 debug 签名
        store_file_arg="-PKIDNEYNOTES_STORE_FILE=../kidneynotes.keystore"
        info "  使用 release keystore 签名"
    else
        info "  使用 debug 签名"
    fi

    "$GRADLE" "$task" $store_file_arg --no-daemon --console=plain 2>&1 | tail -20

    local apk_path="$ANDROID_DIR/app/build/outputs/apk/${build_type}/app-${build_type}.apk"
    if [ -f "$apk_path" ]; then
        local size=$(du -h "$apk_path" | cut -f1)
        info "${build_type^} APK 构建成功: $apk_path ($size)"
    else
        error "${build_type^} APK 构建失败！"
        return 1
    fi
}

# ============================================================
# 7. 复制 APK 到 releases/ 目录（用于提交到 GitHub 供下载）
# ============================================================
copy_apks_to_releases() {
    info "复制 APK 到 releases/ 目录..."
    local releases_dir="$PROJECT_ROOT/releases"
    mkdir -p "$releases_dir"

    local debug_src="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
    local release_src="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"

    if [ -f "$debug_src" ]; then
        cp "$debug_src" "$releases_dir/app-debug.apk"
        info "  app-debug.apk 已复制"
    fi
    if [ -f "$release_src" ]; then
        cp "$release_src" "$releases_dir/app-release.apk"
        info "  app-release.apk 已复制"
    fi
}

# ============================================================
# 8. 创建 GitHub Release 并上传 APK（让 Releases 页面可下载）
# ============================================================
upload_to_github_release() {
    # 需要 GITHUB_TOKEN 环境变量
    if [ -z "${GITHUB_TOKEN:-}" ]; then
        # 尝试从 git credential 读取
        if git credential fill <<< "protocol=https
host=github.com" 2>/dev/null | grep -q "^password="; then
            GITHUB_TOKEN=$(git credential fill <<< "protocol=https
host=github.com" 2>/dev/null | grep "^password=" | cut -d= -f2-)
        fi
    fi

    if [ -z "${GITHUB_TOKEN:-}" ]; then
        warn "未设置 GITHUB_TOKEN，跳过 GitHub Release 上传"
        warn "设置方法: export GITHUB_TOKEN=ghp_xxxxxxxx"
        return 0
    fi

    local repo="Jakeopsjj/Intelligent-drinking-water-management"
    local tag="v$(grep versionName "$ANDROID_DIR/app/build.gradle" | head -1 | sed 's/.*"\(.*\)".*/\1/')"

    info "创建 GitHub Release ($tag)..."

    # 删除已有的同名 release（保留 tag）
    local existing_release_id=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$repo/releases/tags/$tag" 2>/dev/null | grep '"id"' | head -1 | grep -o '[0-9]*')
    if [ -n "$existing_release_id" ]; then
        curl -s -X DELETE -H "Authorization: token $GITHUB_TOKEN" \
            "https://api.github.com/repos/$repo/releases/$existing_release_id" >/dev/null 2>&1
        info "  删除旧 release"
    fi

    # 删除已有的 tag
    curl -s -X DELETE -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$repo/git/refs/tags/$tag" >/dev/null 2>&1

    # 创建新 release（body 必须量化罗列实质性改动明细，禁止笼统描述）
    local release_body="肾友笔记 $tag 更新明细\\n\\n"
    release_body="${release_body}## 功能新增\\n"
    release_body="${release_body}- 数据分层架构：水果（维基百科）与药物（百度百科）双模块采用「本地静态预置 + 在线网络兜底」二级加载策略\\n"
    release_body="${release_body}- 新增 SmartImage 智能图片组件：异步懒加载 + 加载中占位图 + 加载失败兜底视图 + 排版自适应\\n"
    release_body="${release_body}- 新增 useOnlineStatus 网络状态检测 hook：navigator.onLine + online/offline 事件监听\\n"
    release_body="${release_body}- 新增 PersistentCache 通用持久化缓存：LRU 淘汰 + 容量超限自动回收\\n"
    release_body="${release_body}\\n## 逻辑修改\\n"
    release_body="${release_body}- baikeService：内存缓存升级为 localStorage 持久化，离线二次访问直接读本地\\n"
    release_body="${release_body}- wikiService：EntityInfo 缓存 + 搜索结果缓存均持久化到 localStorage\\n"
    release_body="${release_body}- 水果搜索流程：本地库未命中 → 维基百科 search API 候选列表 → 用户选择 → 营养+维基并发获取\\n"
    release_body="${release_body}- 药物详情页：全部内容切换为百度百科数据源（摘要/基本信息/详细内容/配图）\\n"
    release_body="${release_body}- 水果详情页：除每100g元素含量板块（apihz.cn）外全部使用维基百科内容\\n"
    release_body="${release_body}\\n## UI 调整\\n"
    release_body="${release_body}- 水果/药物详情页抽屉：bg-white → bg-white/80 backdrop-blur-xl 玻璃材质，透出底层液态玻璃视觉层\\n"
    release_body="${release_body}- 水果候选选择浮层同步玻璃化\\n"
    release_body="${release_body}- 详情页配图：motion.img 替换为 SmartImage（三态：loading 旋转占位 / loaded 淡入 / error 兜底）\\n"
    release_body="${release_body}\\n## 数据策略优化\\n"
    release_body="${release_body}- 网络数据本地持久化：百度百科/维基百科/维基搜索结果均落地 localStorage，实现离线二次访问\\n"
    release_body="${release_body}- LRU 淘汰策略：百科缓存上限 80 条，搜索缓存上限 50 条，超出自动淘汰最旧\\n"
    release_body="${release_body}- 容量超限容错：localStorage QuotaExceededError 时自动回收一半条目重试\\n"
    release_body="${release_body}\\n## 问题修复\\n"
    release_body="${release_body}- 无网络时详情页不再卡在 loading：显示 WifiOff 提示 + 「仅展示已缓存数据」友好说明\\n"
    release_body="${release_body}- 图片加载失败不再显示空白：SmartImage error 态显示 ImageOff 图标 + 提示文字\\n"
    release_body="${release_body}- 长文本排版溢出：百科摘要/正文/维基介绍加 break-words 自适应换行\\n"
    release_body="${release_body}\\n## 接口适配\\n"
    release_body="${release_body}- 维基百科 search API（action=query&list=search）适配水果候选搜索\\n"
    release_body="${release_body}- 百度百科 HTML 页面 DOMParser 解析：摘要/正文/配图/信息框全字段提取\\n"
    release_body="${release_body}- apihz.cn 食物营养API 持续用于每100g钾磷钠水数据获取\\n"

    local response=$(curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.github.com/repos/$repo/releases" -d "{
        \"tag_name\": \"$tag\",
        \"target_commitish\": \"main\",
        \"name\": \"$tag Debug + Release APK\",
        \"body\": \"$release_body\",
        \"draft\": false,
        \"prerelease\": false
    }")

    local release_id=$(echo "$response" | grep '"id"' | head -1 | grep -o '[0-9]*')

    if [ -z "$release_id" ]; then
        error "创建 GitHub Release 失败"
        echo "$response" | head -5
        return 1
    fi
    info "  Release 创建成功 (ID: $release_id)"

    # 上传 debug APK
    local debug_src="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$debug_src" ]; then
        info "  上传 app-debug.apk..."
        curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
            -H "Content-Type: application/vnd.android.package-archive" \
            --data-binary @"$debug_src" \
            "https://uploads.github.com/repos/$repo/releases/$release_id/assets?name=app-debug.apk" >/dev/null 2>&1
        info "    完成"
    fi

    # 上传 release APK
    local release_src="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$release_src" ]; then
        info "  上传 app-release.apk..."
        curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
            -H "Content-Type: application/vnd.android.package-archive" \
            --data-binary @"$release_src" \
            "https://uploads.github.com/repos/$repo/releases/$release_id/assets?name=app-release.apk" >/dev/null 2>&1
        info "    完成"
    fi

    info "GitHub Release 上传完成: https://github.com/$repo/releases/tag/$tag"
}

# ============================================================
# 主流程
# ============================================================
main() {
    bump_version

    echo "=============================================="
    echo "  肾友笔记 APK 自动构建"
    echo "=============================================="

    ensure_android_sdk
    ensure_debug_keystore
    ensure_gradle_config
    ensure_npm_deps

    # 关键：先构建 Web (dist/)，再 cap sync 复制到 android
    # 之前缺失这一步，导致 APK 里跑的是旧 JS bundle，代码修改完全不生效
    build_web || { error "Web 构建失败，终止"; exit 1; }

    sync_capacitor
    fix_capacitor_java_version

    # 构建 Debug
    build_apk debug

    # 构建 Release
    build_apk release

    # 复制 APK 到 releases/ 目录
    copy_apks_to_releases

    # 创建 GitHub Release 并上传 APK
    upload_to_github_release

    echo ""
    echo "=============================================="
    info "所有 APK 构建完成！"
    echo "=============================================="
    echo ""
    echo "Debug APK:   $ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
    echo "Release APK: $ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
    echo "GitHub 下载: $PROJECT_ROOT/releases/"
}

main "$@"
