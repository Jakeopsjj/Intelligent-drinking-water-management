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
    release_body="${release_body}- wikiService 新增 fetchWikiFullPage：基于 action=parse API 获取维基百科完整词条（首段 lead + 章节段落 + 信息框 + 图集）\\n"
    release_body="${release_body}- WikiSection 类型：暴露章节标题 + 段落列表，详情页按章节结构化渲染\\n"
    release_body="${release_body}- EntityInfo 接口扩展：新增 lead / sections / infobox 字段，详情页全字段渲染词条描述、品类属性、形态参数、图集\\n"
    release_body="${release_body}\\n## 逻辑修改\\n"
    release_body="${release_body}- 水果检索流程修复：去掉 searchWikiFruits 中附加的「 fruit 植物」后缀，改为只搜关键词本身（原后缀导致中英混合搜索命中率骤降）\\n"
    release_body="${release_body}- 药物检索逻辑修复：fetchBaikeInfo 不再持久化 null 到 localStorage，改为内存临时缓存（避免失败永久卡死，下次重启应用可重新联网尝试）\\n"
    release_body="${release_body}- 风控检测策略修复：isBlockedPage 由单关键词命中改为「强关键词单独命中 / 弱关键词对（百度安全验证 + 验证码）同时出现」二段式判定\\n"
    release_body="${release_body}- baikeService 失败缓存分离：成功结果落 localStorage（离线二次访问），失败结果仅存内存 Map\\n"
    release_body="${release_body}- doFetchFruit 改用 fetchWikiFullPage，summary API 降级为兜底\\n"
    release_body="${release_body}\\n## UI 调整\\n"
    release_body="${release_body}- 水果详情页结构重排：图集（横向滚动）→ 词条简介（lead）→ 基本信息（infobox）→ 详细内容（sections 按章节）→ 每100g元素含量 → 食用建议\\n"
    release_body="${release_body}- 信息框键值对从 8 项扩展至 10 项，新增 sm:grid-cols-2 双列布局\\n"
    release_body="${release_body}- 图集横向滚动卡片：h-40 w-64，主图 + 多图合并去重展示\\n"
    release_body="${release_body}- 段落渲染：维基章节带 h5 小标题 + 段落列表，结构层次清晰\\n"
    release_body="${release_body}\\n## 接口适配\\n"
    release_body="${release_body}- 维基百科 action=parse API（page={title}&prop=text|images|properties）适配完整词条解析\\n"
    release_body="${release_body}- 维基百科 search API 参数优化：srlimit 8→12，新增 srprop=snippet|sectiontitle，过滤 Help/Wikipedia/User 命名空间\\n"
    release_body="${release_body}- 百度百科 CORS 代理扩充：从 2 个增至 4 个（allorigins/corsproxy/thingproxy/codetabs 轮换）\\n"
    release_body="${release_body}- 百度百科 fetchHtml 超时：12s → 15s\\n"
    release_body="${release_body}\\n## 数据策略优化\\n"
    release_body="${release_body}- 水果详情页图文：维基百科完整章节段落（替代前 200 字摘要），按 H2/H3 标题划分，过滤参考文献/外部链接/参见等元章节\\n"
    release_body="${release_body}- 药物详情页正文：段落数量从 8 段提升至 20 段，覆盖药理/适应症/不良反应/注意事项等全量字段\\n"
    release_body="${release_body}- 药物摘要：从前 200 字扩展至前 400 字，信息密度翻倍\\n"
    release_body="${release_body}- 药物信息框解析选择器扩展：新增 .basic-info / .J-basic-info / .basicInfo-item-wrap 等\\n"
    release_body="${release_body}- 维基百科图片解析：优先 .thumb/figure/.thumbimage，兜底 upload.wikimedia.org 全量 img\\n"
    release_body="${release_body}\\n## 问题修复\\n"
    release_body="${release_body}- 问题1 修复：水果检索命中率异常——根因 searchWikiFruits 附加「 fruit 植物」后缀导致中英混合搜索命中率为 0，已移除\\n"
    release_body="${release_body}- 问题1 修复：水果详情页百科内容缺失——从 summary API（200 字摘要）升级为 parse API（完整章节段落+信息框+图集）\\n"
    release_body="${release_body}- 问题2 修复：药物详情图片加载失败——SmartImage 添加 referrerPolicy=no-referrer 解决 bkimg.cdn.bcebos.com 防盗链\\n"
    release_body="${release_body}- 问题2 修复：药物详情文本信息不全——正文段落数 8→20，摘要 200→400 字，多图 5→8 张\\n"
    release_body="${release_body}- 问题3 修复：药物检索误判为空——isBlockedPage 单关键词命中导致正常词条被风控误判，改为二段式判定\\n"
    release_body="${release_body}- 问题3 修复：null 持久化缓存导致永久失败——fetchBaikeInfo 失败仅存内存，重启应用后可重新尝试联网\\n"
    release_body="${release_body}- 维基百科消歧义页处理：尝试 name → name（水果）→ name（植物）→ name（食品）多个标题变体\\n"

    # 用 jq 构造 JSON body，避免 bash 字符串嵌套 JSON 时 body 被截断为空
    # （历史问题：双引号/反斜杠/换行符直接嵌入 -d JSON 字符串会破坏结构，导致 release body 为空）
    # release_body 里的 \\n 是字面字符，sed 转为真换行符后让 jq 当字符串传给 JSON body 字段
    local release_json
    release_json=$(jq -n \
        --arg tag "$tag" \
        --arg body "$(printf '%s' "$release_body" | sed 's/\\n/\n/g')" \
        '{tag_name: $tag, target_commitish: "main", name: ($tag + " Debug + Release APK"), body: $body, draft: false, prerelease: false}')

    local response=$(curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.github.com/repos/$repo/releases" --data "$release_json")

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
