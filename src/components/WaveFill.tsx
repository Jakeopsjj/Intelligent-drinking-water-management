import type { FC } from 'react';
import { cn } from '@/lib/utils';

interface WaveFillProps {
  /** 0-1 的进度比例 */
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
 * 根据进度控制水位高度，水波缓慢左右流动。
 * 底层放置，文字浮在上层不被遮挡。
 */
const WaveFill: FC<WaveFillProps> = ({ ratio, status, theme = 'teal', inverse = false }) => {
  // 反向：超滤量越高水位越高（始终满，但用不同色阶体现）
  const effectiveRatio = inverse ? Math.max(ratio, 0.15) : Math.min(Math.max(ratio, 0), 1);
  // 最低保留 5% 高度避免完全空白
  const heightPercent = Math.max(effectiveRatio * 100, 5);

  // 根据状态选择颜色
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
      teal: { fill: 'rgba(220, 38, 38, 0.18)', fillLight: 'rgba(248, 113, 113, 0.22)' },
      sage: { fill: 'rgba(220, 38, 38, 0.18)', fillLight: 'rgba(248, 113, 113, 0.22)' },
      clay: { fill: 'rgba(220, 38, 38, 0.18)', fillLight: 'rgba(248, 113, 113, 0.22)' },
    },
  };

  const colors = colorMap[status][theme];

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{ height: `${heightPercent}%` }}
      aria-hidden="true"
    >
      {/* 后层波浪：慢速向左流动 */}
      <svg
        className="absolute -left-6 bottom-0 w-[calc(100%+48px)]"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        style={{ height: '40px', animation: 'wave-move-left 7s linear infinite' }}
      >
        <path
          d="M0,20 C30,35 60,5 100,20 C140,35 170,5 200,20 L200,40 L0,40 Z"
          fill={colors.fillLight}
        />
      </svg>

      {/* 前层波浪：中速向右流动 */}
      <svg
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

      <style>{`
        @keyframes wave-move-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-24px); }
        }
        @keyframes wave-move-right {
          0% { transform: translateX(-24px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default WaveFill;
