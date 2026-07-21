import { useEffect, useRef } from 'react';
import type { FC } from 'react';

interface WaveFillProps {
  /** 0-∞ 的进度比例，>1 表示已超额 */
  ratio: number;
  /** 状态色 */
  status: 'normal' | 'warning' | 'exceeded';
  /** 主题色 */
  theme?: 'teal' | 'sage' | 'clay';
  /** 是否反向（值越高水位越满，用于超滤量） */
  inverse?: boolean;
}

/**
 * 波浪液位填充
 * - 水位高度 = 完成百分比（0-100%）
 * - 超额时水位全满 100%
 * - 波浪持续流动，每秒随机切换方向（通过直接操作 DOM，不触发 React 重渲染）
 *
 * 关键：组件只在 ratio 变化时重渲染，保证水位实时更新。
 * 方向切换通过 ref 直接操作 DOM style，不影响 React 渲染周期。
 */
const WaveFill: FC<WaveFillProps> = ({ ratio, status, theme = 'teal', inverse = false }) => {
  // 水位高度：超额时 100%，否则按比例（最低 5%）
  const heightPercent = ratio >= 1 ? 100 : Math.max(Math.min(ratio, 1) * 100, 5);

  // 反向模式（超滤量）：值越高水位越高，最低 15%
  const finalHeight = inverse ? Math.max(ratio * 100, 15) : heightPercent;

  // 颜色映射
  const colorMap = {
    normal: {
      teal: { fill: 'rgba(45, 95, 93, 0.18)', fillLight: 'rgba(93, 168, 162, 0.22)' },
      sage: { fill: 'rgba(70, 107, 76, 0.18)', fillLight: 'rgba(122, 155, 126, 0.22)' },
      clay: { fill: 'rgba(217, 119, 87, 0.18)', fillLight: 'rgba(224, 142, 111, 0.22)' },
    },
    warning: {
      teal: { fill: 'rgba(217, 119, 87, 0.18)', fillLight: 'rgba(224, 142, 111, 0.22)' },
      sage: { fill: 'rgba(217, 119, 87, 0.18)', fillLight: 'rgba(224, 142, 111, 0.22)' },
      clay: { fill: 'rgba(217, 119, 87, 0.18)', fillLight: 'rgba(224, 142, 111, 0.22)' },
    },
    exceeded: {
      teal: { fill: 'rgba(220, 38, 38, 0.22)', fillLight: 'rgba(248, 113, 113, 0.26)' },
      sage: { fill: 'rgba(220, 38, 38, 0.22)', fillLight: 'rgba(248, 113, 113, 0.26)' },
      clay: { fill: 'rgba(220, 38, 38, 0.22)', fillLight: 'rgba(248, 113, 113, 0.26)' },
    },
  };

  const colors = colorMap[status][theme];

  // 每秒随机切换波浪方向（直接操作 DOM，不触发 React 重渲染）
  const frontWaveRef = useRef<SVGSVGElement>(null);
  const backWaveRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let currentDir: 'left' | 'right' = 'right';
    const timer = setInterval(() => {
      // 随机切换方向
      currentDir = Math.random() > 0.5 ? 'left' : 'right';
      const frontAnim =
        currentDir === 'left'
          ? 'wave-move-left 5s linear infinite'
          : 'wave-move-right 5s linear infinite';
      const backAnim =
        currentDir === 'left'
          ? 'wave-move-left 7s linear infinite'
          : 'wave-move-right 7s linear infinite';

      if (frontWaveRef.current) {
        frontWaveRef.current.style.animation = frontAnim;
      }
      if (backWaveRef.current) {
        backWaveRef.current.style.animation = backAnim;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{ height: `${finalHeight}%`, transition: 'height 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}
      aria-hidden="true"
    >
      {/* 后层波浪：缓慢流动 */}
      <svg
        ref={backWaveRef}
        className="absolute -left-6 bottom-0 w-[calc(100%+48px)]"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        style={{ height: '40px', animation: 'wave-move-right 7s linear infinite' }}
      >
        <path
          d="M0,20 C30,35 60,5 100,20 C140,35 170,5 200,20 L200,40 L0,40 Z"
          fill={colors.fillLight}
        />
      </svg>

      {/* 前层波浪：中速流动 */}
      <svg
        ref={frontWaveRef}
        className="absolute -left-6 bottom-0 w-[calc(100%+48px)]"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        style={{ height: '32px', animation: 'wave-move-right 5s linear infinite' }}
      >
        <path
          d="M0,20 C25,30 50,10 100,20 C150,30 175,10 200,20 L200,40 L0,40 Z"
          fill={colors.fill}
        />
      </svg>

      {/* 顶部薄边：水线高光 */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.fillLight}, transparent)`,
          opacity: 0.6,
        }}
      />
    </div>
  );
};

export default WaveFill;
