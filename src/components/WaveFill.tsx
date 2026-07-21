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
 * 波浪液位填充 + 液态玻璃效果
 * - 容器自带半透明背景色 = 水的颜色，水位越高，填充面积越大
 * - 应用 backdrop-blur 模拟液态玻璃质感
 * - SVG 波浪位于水面上方，提供流动的波浪表面
 * - 超额时水位全满 100%，卡片被水色完全填满
 * - 波浪持续流动，每秒随机切换方向（通过 ref 操作 DOM，不触发 React 重渲染）
 */
const WaveFill: FC<WaveFillProps> = ({ ratio, status, theme = 'teal', inverse = false }) => {
  // 水位高度：超额时 100%，否则按比例（最低 5%）
  const heightPercent = ratio >= 1 ? 100 : Math.max(Math.min(ratio, 1) * 100, 5);

  // 反向模式（超滤量）：值越高水位越高，最低 15%
  const finalHeight = inverse ? Math.max(ratio * 100, 15) : heightPercent;

  // 液态玻璃水色映射：在深色玻璃底上使用亮色，让水位清晰可见
  const colorMap = {
    normal: {
      teal: {
        bg: 'rgba(20, 184, 166, 0.55)',
        surface: 'rgba(45, 212, 191, 0.65)',
        line: 'rgba(153, 246, 228, 0.75)',
        highlight: 'rgba(255, 255, 255, 0.35)',
      },
      sage: {
        bg: 'rgba(132, 204, 22, 0.50)',
        surface: 'rgba(163, 230, 53, 0.62)',
        line: 'rgba(190, 242, 100, 0.72)',
        highlight: 'rgba(255, 255, 255, 0.35)',
      },
      clay: {
        bg: 'rgba(234, 88, 12, 0.55)',
        surface: 'rgba(251, 146, 60, 0.65)',
        line: 'rgba(253, 186, 116, 0.75)',
        highlight: 'rgba(255, 255, 255, 0.35)',
      },
    },
    warning: {
      teal: {
        bg: 'rgba(234, 88, 12, 0.55)',
        surface: 'rgba(251, 146, 60, 0.65)',
        line: 'rgba(253, 186, 116, 0.75)',
        highlight: 'rgba(255, 255, 255, 0.35)',
      },
      sage: {
        bg: 'rgba(234, 88, 12, 0.55)',
        surface: 'rgba(251, 146, 60, 0.65)',
        line: 'rgba(253, 186, 116, 0.75)',
        highlight: 'rgba(255, 255, 255, 0.35)',
      },
      clay: {
        bg: 'rgba(234, 88, 12, 0.55)',
        surface: 'rgba(251, 146, 60, 0.65)',
        line: 'rgba(253, 186, 116, 0.75)',
        highlight: 'rgba(255, 255, 255, 0.35)',
      },
    },
    exceeded: {
      teal: {
        bg: 'rgba(220, 38, 38, 0.60)',
        surface: 'rgba(248, 113, 113, 0.70)',
        line: 'rgba(254, 202, 202, 0.80)',
        highlight: 'rgba(255, 255, 255, 0.38)',
      },
      sage: {
        bg: 'rgba(220, 38, 38, 0.60)',
        surface: 'rgba(248, 113, 113, 0.70)',
        line: 'rgba(254, 202, 202, 0.80)',
        highlight: 'rgba(255, 255, 255, 0.38)',
      },
      clay: {
        bg: 'rgba(220, 38, 38, 0.60)',
        surface: 'rgba(248, 113, 113, 0.70)',
        line: 'rgba(254, 202, 202, 0.80)',
        highlight: 'rgba(255, 255, 255, 0.38)',
      },
    },
  };

  const colors = colorMap[status][theme];

  // 每秒随机切换波浪方向（直接操作 DOM，不触发 React 重渲染）
  const frontWaveRef = useRef<SVGSVGElement>(null);
  const backWaveRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let currentDir: 'left' | 'right' = 'right';

    const setAnim = (dir: 'left' | 'right') => {
      const frontAnim =
        dir === 'left'
          ? 'wave-move-left 5s linear infinite'
          : 'wave-move-right 5s linear infinite';
      const backAnim =
        dir === 'left'
          ? 'wave-move-left 7s linear infinite'
          : 'wave-move-right 7s linear infinite';

      if (frontWaveRef.current) {
        frontWaveRef.current.style.animation = frontAnim;
      }
      if (backWaveRef.current) {
        backWaveRef.current.style.animation = backAnim;
      }
    };

    setAnim(currentDir);

    const timer = setInterval(() => {
      currentDir = Math.random() > 0.5 ? 'left' : 'right';
      setAnim(currentDir);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{
        height: `${finalHeight}%`,
        transition: 'height 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        background: `linear-gradient(180deg, ${colors.surface} 0%, ${colors.bg} 100%)`,
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
      aria-hidden="true"
    >
      {/* 液态玻璃高光：顶部白色光泽 */}
      <div
        className="absolute inset-x-0 top-0 h-1/3"
        style={{
          background: `linear-gradient(180deg, ${colors.highlight} 0%, transparent 100%)`,
          opacity: 0.6,
        }}
      />

      {/* 后层波浪：位于水面，向上填充 */}
      <svg
        ref={backWaveRef}
        className="absolute -left-6 top-0 w-[calc(100%+48px)]"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        style={{ height: '40px' }}
      >
        <path
          d="M0,32 C30,22 60,35 100,32 C140,29 170,20 200,32 L200,0 L0,0 Z"
          fill={colors.line}
        />
      </svg>

      {/* 前层波浪：位于水面，向上填充 */}
      <svg
        ref={frontWaveRef}
        className="absolute -left-6 top-0 w-[calc(100%+48px)]"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        style={{ height: '32px' }}
      >
        <path
          d="M0,28 C25,20 50,32 100,28 C150,24 175,18 200,28 L200,0 L0,0 Z"
          fill={colors.surface}
        />
      </svg>

      {/* 液态玻璃侧边高光 */}
      <div
        className="absolute left-0 top-0 h-full w-px"
        style={{ background: `linear-gradient(180deg, transparent, ${colors.highlight}, transparent)` }}
      />
    </div>
  );
};

export default WaveFill;