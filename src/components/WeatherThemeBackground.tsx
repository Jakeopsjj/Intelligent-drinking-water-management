/**
 * WeatherThemeBackground 全局天气主题背景层
 *
 * 实现：通过 iframe 嵌入 /weather_theme/index.html 单文件主题，
 *       作为全局背景层（z-index: -1，pointer-events: none）。
 *
 * Pexels Key 传递：
 *   - 从 Vite 环境变量 import.meta.env.VITE_PEXELS_API_KEY 读取
 *   - 通过 URL fragment (#pexels_key=xxx) 传给 iframe
 *   - iframe 解析 fragment 并设置 CONFIG.pexelsApiKey
 *   - 这样打开应用就自动有真实风景图背景，无需手动启动
 *
 * 层级（从底到顶）：
 *   1. LiquidGlassBackground  (z-index: -1, DOM 先渲染)
 *   2. WeatherThemeBackground (z-index: -1, DOM 后渲染，覆盖玻璃纹理)
 *   3. RippleLayer             (z-index: -1)
 *   4. App 内容                (z-index: 0+)
 */
import { createPortal } from 'react-dom';

// 从 Vite 环境变量读取 Pexels API Key（构建时注入，不入 git）
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || '';

// 构建 iframe URL，通过 fragment 传递 Key（fragment 不会发送到服务器）
// 同时开启调试模式，便于排查（发布时可改为 false）
const DEBUG = true;
const iframeSrc = PEXELS_API_KEY
  ? `/weather_theme/index.html#pexels_key=${encodeURIComponent(PEXELS_API_KEY)}&debug=${DEBUG ? 1 : 0}`
  : `/weather_theme/index.html#debug=${DEBUG ? 1 : 0}`;

export default function WeatherThemeBackground() {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <iframe
      src={iframeSrc}
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
        opacity: 1, // 完全不透明，独占背景层
      }}
      allow="geolocation"
    />,
    document.body
  );
}
