import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import LiquidGlassBackground from '@/components/LiquidGlassBackground'
import RippleLayer from '@/components/RippleLayer'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 全局液态玻璃视觉层：覆盖所有页面（含引导页/权限页/加载页/二级页）
        通过 Portal 渲染到 body，z-index:-1 永远在最底层，pointer-events:none 不拦截交互 */}
    <LiquidGlassBackground />
    <RippleLayer />
    <App />
  </StrictMode>,
)
