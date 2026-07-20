import { getProgressStroke } from '@/utils/calc';
import type { FC } from 'react';

interface ProgressRingProps {
  /** 当前值 */
  value: number;
  /** 限额 */
  limit: number;
  /** 半径 */
  radius?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 中心元素 */
  children?: React.ReactNode;
  /** 状态：normal/warning/exceeded，自动推断 */
  status?: 'normal' | 'warning' | 'exceeded';
}

/**
 * 环形进度条，治愈风
 */
const ProgressRing: FC<ProgressRingProps> = ({
  value,
  limit,
  radius = 42,
  strokeWidth = 6,
  children,
  status,
}) => {
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const ratio = limit > 0 ? Math.min(value / limit, 1) : 0;
  const offset = circumference - ratio * circumference;

  // 自动推断状态
  const actualStatus = status
    ? status
    : limit > 0
    ? value >= limit
      ? 'exceeded'
      : value >= limit * 0.8
      ? 'warning'
      : 'normal'
    : 'normal';

  const stroke = getProgressStroke(actualStatus);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={radius * 2}
        height={radius * 2}
        className="-rotate-90"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* 背景圆 */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="#E8E0D5"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆 */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

export default ProgressRing;
