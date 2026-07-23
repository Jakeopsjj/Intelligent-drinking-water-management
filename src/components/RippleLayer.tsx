/**
 * 全局点击径向水波纹涟漪系统
 *
 * 工作原理：
 * 1. 监听 document 的 pointerdown 事件（覆盖 touch + mouse）
 * 2. 在点击坐标生成一个径向涟漪 DOM，CSS 动画扩散后自动移除
 * 3. 通过 Portal 渲染到 body，position:fixed 不受父级 containing block 影响
 *
 * 性能与兼容：
 * - 纯 DOM + CSS 动画，无 JS 每帧计算，60fps 稳定
 * - pointer-events:none，绝不拦截控件点击
 * - 仅在主要输入按钮（主键，非右键/中键）触发，避免误触
 * - 限制同时在屏涟漪数量，防止疯狂点击堆积
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const MAX_RIPPLES = 6;

export default function RippleLayer() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      // 仅主键触发（左键 / touch 都算主键）
      if (e.button !== undefined && e.button !== 0) return;

      const id = ++idRef.current;
      const ripple: Ripple = { id, x: e.clientX, y: e.clientY };
      setRipples((prev) => [...prev.slice(-(MAX_RIPPLES - 1)), ripple]);

      // 动画结束后移除（与 CSS 动画时长 700ms 对齐 + buffer）
      const timer = setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
        timersRef.current.delete(id);
      }, 720);
      timersRef.current.set(id, timer);
    };

    // capture 阶段监听，确保在控件 onClick 之前也能拿到坐标
    document.addEventListener('pointerdown', handler, { passive: true, capture: false });
    return () => {
      document.removeEventListener('pointerdown', handler);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="ripple-layer" aria-hidden>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple-dot"
          style={{ left: `${r.x}px`, top: `${r.y}px` }}
        />
      ))}
    </div>,
    document.body
  );
}
