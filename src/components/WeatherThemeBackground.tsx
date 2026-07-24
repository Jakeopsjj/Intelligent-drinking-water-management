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
 * 字体颜色自适应：
 *   - iframe 加载背景后通过 postMessage 通知当前背景亮度（light/dark）
 *   - 本组件监听 message，在 documentElement 上设置 data-bg-theme
 *   - index.css 据此切换前景文字颜色与玻璃卡片底衬
 *
 * 层级（从底到顶）：
 *   1. WeatherThemeBackground (z-index: -1, 独占背景层)
 *   2. RippleLayer             (z-index: -1)
 *   3. App 内容                (z-index: 0+)
 */
import { useEffect } from 'react';
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
  // 监听 iframe 的亮度通知，驱动 APP 前景字体颜色自适应
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'weather-theme-brightness') return;
      const brightness = data.brightness === 'dark' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bg-theme', brightness);
    };
    window.addEventListener('message', handler);
    // 卸载时还原为默认亮色（避免残留暗色主题影响其他场景）
    return () => {
      window.removeEventListener('message', handler);
      document.documentElement.removeAttribute('data-bg-theme');
    };
  }, []);

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
