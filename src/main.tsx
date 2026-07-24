import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import WeatherThemeBackground from '@/components/WeatherThemeBackground'
import RippleLayer from '@/components/RippleLayer'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 全局天气主题背景层（WallpaperWeather 复刻版）：
        通过 iframe 嵌入 /weather_theme/index.html 单文件主题
        含底层风景图（Pexels 在线）+ Canvas 粒子动画（云/雨/雪/雾/星光/闪电）
        打开应用自动启动，无需手动触发
        z-index:-1 + pointer-events:none，不拦截交互 */}
    <WeatherThemeBackground />
    <RippleLayer />
    <App />
  </StrictMode>,
)
