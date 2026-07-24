/**
 * WeatherThemeBackground 全局天气主题背景层
 *
 * 实现：通过 iframe 嵌入 /weather_theme/index.html 单文件主题，
 *       作为全局背景层（z-index: -1，pointer-events: none）。
 *
 * 优势：
 *   - 复用 HTML 主题的所有逻辑（Canvas 粒子、Pexels、离线兜底、JSBridge）
 *   - 与原生 WebView Activity 共用同一份 HTML 资源
 *   - 不影响现有 LiquidGlassBackground 视觉
 *
 * 层级（从底到顶）：
 *   1. LiquidGlassBackground  (z-index: -1, DOM 先渲染)
 *   2. WeatherThemeBackground (z-index: -1, DOM 后渲染，覆盖玻璃纹理)
 *   3. RippleLayer             (z-index: -1)
 *   4. App 内容                (z-index: 0+)
 *
 * 注：iframe 与外层 document 是独立 JS 上下文，互不干扰。
 *     主题 HTML 内部已实现自主定位降级（Geolocation → IP 定位 → 默认）。
 */
import { createPortal } from 'react-dom';

export default function WeatherThemeBackground() {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <iframe
      src="/weather_theme/index.html"
      title="weather-theme-background"
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        border: 'none',
        pointerEvents: 'none',
        opacity: 0.85, // 略微透明，让底层 LiquidGlass 纹理若隐若现
      }}
      allow="geolocation"
    />,
    document.body
  );
}
