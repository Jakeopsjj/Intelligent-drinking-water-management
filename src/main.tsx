import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import LiquidGlassBackground from '@/components/LiquidGlassBackground'
import WeatherBackground from '@/components/WeatherBackground'
import RippleLayer from '@/components/RippleLayer'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 全局液态玻璃视觉层：覆盖所有页面（含引导页/权限页/加载页/二级页）
        通过 Portal 渲染到 body，z-index:-1 永远在最底层，pointer-events:none 不拦截交互 */}
    <LiquidGlassBackground />
    {/* 动态天气背景层：基于实时天气切换粒子效果（雨/雪/云/雾/晴/雷暴）
        渲染在 LiquidGlassBackground 之后，叠加在玻璃纹理之上
        内部 useWeather Hook 失败时不会渲染任何天气层，保留底层玻璃视觉 */}
    <WeatherBackground />
    <RippleLayer />
    <App />
  </StrictMode>,
)
