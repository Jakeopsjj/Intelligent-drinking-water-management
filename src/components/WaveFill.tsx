import { useEffect, useState, useRef } from 'react';
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
 * - 波浪每秒随机切换方向（向左/向右流动）
 */
const WaveFill: FC<WaveFillProps> = ({ ratio, status, theme = 'teal', inverse = false }) => {
  // 反向：超滤量，值越高水位越高
  const baseRatio = inverse ? Math.max(ratio, 0.15) : Math.min(Math.max(ratio, 0), 1);
  // 超额时水位全满
  const heightPercent = ratio >= 1 ? 100 : Math.max(baseRatio * 100, 5);

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

  // 每秒随机切换波浪方向
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDirection((prev) => (Math.random() > 0.5 ? 'left' : 'right'));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{ height: `${heightPercent}%`, transition: 'height 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}
      aria-hidden="true"
    >
      {/* 后层波浪：缓慢流动 */}
      <svg
        className="absolute -left-6 bottom-0 w-[calc(100%+48px)]"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        style={{
          height: '40px',
          animation:
            direction === 'left'
              ? 'wave-move-left 7s linear infinite'
              : 'wave-move-right 7s linear infinite',
        }}
      >
        <path
          d="M0,20 C30,35 60,5 100,20 C140,35 170,5 200,20 L200,40 L0,40 Z"
          fill={colors.fillLight}
        />
      </svg>

      {/* 前层波浪：中速流动 */}
      <svg
        className="absolute -left-6 bottom-0 w-[calc(100%+48px)]"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        style={{
          height: '32px',
          animation:
            direction === 'left'
              ? 'wave-move-left 5s linear infinite'
              : 'wave-move-right 5s linear infinite',
        }}
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
