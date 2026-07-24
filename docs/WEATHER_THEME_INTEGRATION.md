# 动态天气背景主题 - 打包部署指南

> 将单文件 HTML 天气主题集成到 Capacitor 安卓 APP，作为全局背景层。

## 一、文件结构

```
android/app/src/main/
├── assets/
│   └── weather_theme/
│       ├── index.html              # 单文件天气主题（核心）
│       ├── weather-keywords.js     # 关键词映射（参考用，已内嵌于 index.html）
│       └── offline/                # 离线素材目录（可选）
│           ├── clear-day.jpg
│           ├── rain-night.jpg
│           └── ... (共 36 张，见 OFFLINE_ASSETS_LIST.md)
└── java/com/dialysis/kidneynotes/weather/
    ├── WeatherThemeActivity.java   # WebView 承载 Activity
    └── LocationHelper.java         # 原生定位助手
```

## 二、网页放入 assets

**已完成的步骤**：HTML 主题文件已放在 `android/app/src/main/assets/weather_theme/index.html`。

Capacitor 会自动将 `assets/` 目录打包进 APK，WebView 通过 `file:///android_asset/weather_theme/index.html` 访问。

**验证**：构建 APK 后，用 `aapt dump resources app-release.apk | grep weather_theme` 可看到资源已打包。

## 三、AndroidManifest.xml 配置

在 `android/app/src/main/AndroidManifest.xml` 的 `<application>` 标签内添加 Activity 注册：

```xml
<!-- 天气主题 Activity（独立入口） -->
<activity
    android:name=".weather.WeatherThemeActivity"
    android:configChanges="orientation|keyboardHidden|screenSize|uiMode"
    android:screenOrientation="portrait"
    android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
    android:exported="false" />
```

确保已声明权限（项目已有，无需重复添加）：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## 四、缓存配置

### 4.1 WebView DOM 缓存（已配置）

`WeatherThemeActivity.java` 中已启用：
- `setDomStorageEnabled(true)` —— localStorage 缓存天气数据 + 图片 URL
- `setDatabaseEnabled(true)` —— IndexedDB 备用
- `setCacheMode(LOAD_DEFAULT)` —— 优先网络，无网络时用缓存

### 4.2 天气数据缓存策略

| 数据 | 缓存位置 | TTL | 说明 |
|------|----------|-----|------|
| 天气数据 | localStorage | 30 分钟 | Open-Meteo API 响应 |
| 图片 URL | localStorage | 6 小时 | Pexels 搜索结果 URL |
| 图片二进制 | HTTP 缓存 | 7 天 | Pexels CDN 图片 |
| 定位 | 内存 | 1 小时 | LocationHelper |

### 4.3 离线素材缓存

将图片放在 `assets/weather_theme/offline/` 目录，无网络时网页自动回退到本地资源：

```javascript
// index.html 中的回退逻辑
function getOfflineImagePath(weatherType, period) {
  return `offline/${weatherType}-${period}.jpg`;
}
```

## 五、性能优化方案

### 5.1 粒子数量自适应

`index.html` 内置设备性能检测，自动调整粒子数量：

| 设备等级 | CPU 核心 | 内存 | 粒子数 |
|----------|----------|------|--------|
| 低配 | ≤2 核 | ≤2 GB | 30 |
| 中配 | ≤4 核 | ≤4 GB | 60 |
| 高配 | >4 核 | >4 GB | 100 |

网页侧通过 `navigator.deviceMemory` 和 `navigator.hardwareConcurrency` 检测。

### 5.2 帧率自适应

Canvas 动画使用 `requestAnimationFrame`，自动跟随屏幕刷新率（60Hz/90Hz/120Hz）。
低端设备可手动降低帧率：

```javascript
// 将 60fps 降到 30fps
Particles.frameInterval = 1000 / 30;
```

### 5.3 图片预加载与淡入

- 新图片预加载完成后才切换（避免闪烁）
- 切换时使用 CSS `transition: opacity 1.2s` 淡入淡出
- 加载超时 5 秒自动回退到兜底渐变

### 5.4 内存优化

- Canvas 限制 DPR ≤ 2（避免 4K 屏幕过度渲染）
- 粒子对象复用（不频繁创建/销毁）
- 雷暴闪电用 CSS 而非 Canvas（减少重绘）

### 5.5 省电优化

- 页面不可见时（`visibilitychange`）暂停粒子动画
- 网络恢复时（`online` 事件）自动刷新天气
- 定位单次获取，不持续监听（省电）

## 六、集成到现有 APP（两种方案）

### 方案 A：独立 Activity 入口（推荐用于 Demo）

在设置页或某个入口添加按钮，启动 WeatherThemeActivity：

```typescript
// React 组件中调用
import { Filesystem } from '@capacitor/filesystem';

// 通过 Capacitor Plugin 或自定义桥接启动 Activity
// 也可在 MainActivity 中添加方法
```

### 方案 B：全局背景层（替换现有 WeatherBackground）

将 HTML 主题通过 iframe 嵌入 React 层，作为全局背景：

1. 修改 `src/main.tsx`，用 iframe 替换现有 WeatherBackground：

```typescript
// src/components/WeatherThemeBackground.tsx
import { createPortal } from 'react-dom';

export default function WeatherThemeBackground() {
  return createPortal(
    <iframe
      src="/weather_theme/index.html"  // Vite 静态资源路径
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        border: 'none',
        pointerEvents: 'none',
      }}
      allow="geolocation"
    />,
    document.body
  );
}
```

2. 将 `assets/weather_theme/` 复制到 `public/weather_theme/`（Vite 静态资源目录）：

```bash
cp -r android/app/src/main/assets/weather_theme public/
```

3. 在 `main.tsx` 中替换：

```typescript
import WeatherThemeBackground from '@/components/WeatherThemeBackground';
// 替换原有 <WeatherBackground />
<WeatherThemeBackground />
```

### 方案 C：原生 WebView 全局背景层（最优性能）

在 `MainActivity` 中添加底层 WebView，Capacitor WebView 在上层透明：

```java
// MainActivity.java
public class MainActivity extends BridgeActivity {
    private WebView weatherWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 先创建天气 WebView（底层）
        weatherWebView = new WebView(this);
        // ... 配置 WebView
        weatherWebView.loadUrl("file:///android_asset/weather_theme/index.html");

        // 再调用 super.onCreate（创建 Capacitor WebView，上层透明）
        super.onCreate(savedInstanceState);
    }
}
```

> 注：方案 C 需要深入 Capacitor 源码修改，复杂度高，建议优先用方案 B。

## 七、构建与发布

按 CLAUDE.md 强制规则 1 执行：

```bash
# 1. 递增版本号（已递增到 2.24.1）
npm run check-version:fix

# 2. 构建 Web 资源
npm run build

# 3. 同步 Capacitor
npx cap sync android

# 4. 修复 Java 版本兼容性
# (见 CLAUDE.md 完整构建流程)

# 5. 构建 Debug + Release APK
#    【可选】启用 Pexels 在线模式：export PEXELS_API_KEY="你的Key"
#    未设置环境变量时，APP 自动降级到离线模式
cd android && $GRADLE assembleDebug assembleRelease --no-daemon

# 6. 复制到 releases/
cp app/build/outputs/apk/debug/app-debug.apk ../releases/
cp app/build/outputs/apk/release/app-release.apk ../releases/

# 7. Git 提交推送
git add -A && git commit -m "feat: ..." && git push

# 8. 创建 GitHub Release（必须！）
gh release create v2.24.1 --latest releases/app-debug.apk releases/app-release.apk
```

### 启用 Pexels 在线模式（可选）

Pexels API Key 通过环境变量注入，不硬编码到源码：

```bash
# 申请免费 Key：https://www.pexels.com/api/（每月 200 次/小时）

# 构建时设置环境变量
export PEXELS_API_KEY="你的Pexels_API_Key"
cd /workspace && npm run build && npx cap sync android
cd android && $GRADLE assembleDebug assembleRelease --no-daemon
```

**工作原理**：
- `build.gradle` 中 `buildConfigField` 从 `System.getenv('PEXELS_API_KEY')` 读取
- `WeatherThemeActivity.java` 通过 `BuildConfig.PEXELS_API_KEY` 访问
- Activity 启动时通过 JSBridge `setPexelsKey()` 注入到网页
- 网页 `fetchPexelsImage()` 检测到 Key 非空时调用 Pexels API，否则走离线模式

**未设置 Key 时**：APP 自动降级到离线模式，使用 `assets/weather_theme/offline/` 目录下的本地风景图（需提前用批量下载脚本下载，见 OFFLINE_ASSETS_LIST.md）。

## 八、验证清单

- [ ] APK 安装后，启动 WeatherThemeActivity 显示天气背景
- [ ] 不同天气下背景图正确切换
- [ ] 粒子动画流畅（雨/雪/云/雾/星光/闪电）
- [ ] 日夜时段正确划分（清晨/正午/傍晚/夜晚）
- [ ] 定位权限授予后立即获取天气
- [ ] 无网络时回退到离线素材或兜底渐变
- [ ] 低端设备粒子数量自动降低
- [ ] 页面不可见时暂停动画（省电）
