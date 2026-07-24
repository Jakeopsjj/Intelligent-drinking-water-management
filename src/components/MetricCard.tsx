import type { FC, ReactNode } from 'react';
import WaveFill from './WaveFill';
import { getProgressStatus } from '@/utils/calc';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  icon: ReactNode;
  current: number;
  limit: number;
  unit: string;
  displayValue?: string;
  displayUnit?: string;
  theme?: 'teal' | 'sage' | 'clay';
  description?: string;
  showProgress?: boolean;
  inverseProgress?: boolean;
  showWave?: boolean;
  onClick?: () => void;
}

const themeIconBg: Record<string, string> = {
  teal: 'bg-teal-100/80 text-teal-700',
  sage: 'bg-green-100/80 text-green-700',
  clay: 'bg-orange-100/80 text-orange-700',
};

const themeProgressFill: Record<string, string> = {
  teal: 'bg-teal-400',
  sage: 'bg-green-400',
  clay: 'bg-orange-400',
};

const themeWaveTheme: Record<string, 'teal' | 'sage' | 'clay'> = {
  teal: 'teal',
  sage: 'sage',
  clay: 'clay',
};

const MetricCard: FC<MetricCardProps> = ({
  title,
  icon,
  current,
  limit,
  unit,
  displayValue,
  displayUnit,
  theme = 'teal',
  description,
  showProgress = true,
  inverseProgress = false,
  showWave = true,
  onClick,
}) => {
  const ratio = limit > 0 ? current / limit : 0;
  const status = inverseProgress
    ? ratio >= 1
      ? 'exceeded'
      : 'normal'
    : getProgressStatus(current, limit);

  const shownValue = displayValue ?? String(current);
  const shownUnit = displayUnit ?? unit;

  const waveTheme =
    status === 'exceeded' ? 'red' : status === 'warning' ? 'peach' : themeWaveTheme[theme];

  const iconBg =
    status === 'exceeded'
      ? 'bg-red-100/80 text-red-600'
      : status === 'warning'
      ? 'bg-orange-100/80 text-orange-600'
      : themeIconBg[theme];

  const progressFill =
    status === 'exceeded'
      ? 'bg-red-400'
      : status === 'warning'
      ? 'bg-orange-400'
      : themeProgressFill[theme];

  return (
    <div
      className={cn(
        'glass-card relative flex min-h-[148px] flex-col overflow-hidden rounded-[28px] p-5 transition-all duration-300',
        'hover:-translate-y-0.5',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {/* 流动反光 */}
      <div className="glass-shimmer" />

      {/* 底层：波浪液位填充（马卡龙色半透明水） */}
      {showWave && limit > 0 && (
        <WaveFill ratio={ratio} status={status} theme={waveTheme} inverse={inverseProgress} />
      )}

      {/* 上层：图标、标题、数值文字 */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* 头部：图标 + 标题 + 状态徽章 */}
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl backdrop-blur-sm',
                iconBg
              )}
            >
              {icon}
            </div>
            <span className="truncate text-[15px] font-semibold text-gray-700">{title}</span>
          </div>
          {status === 'exceeded' && (
            <span className="whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-600">
              超标
            </span>
          )}
          {status === 'warning' && (
            <span className="whitespace-nowrap rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
              注意
            </span>
          )}
        </div>

        {/* 中间内容：大号数值 */}
        <div className="mt-3 flex flex-1 items-center">
          <div className="w-full">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-[40px] font-bold leading-none tracking-tight text-gray-800">
                {shownValue}
              </span>
              <span className="text-base font-medium text-gray-500">{shownUnit}</span>
            </div>
            {description && (
              <div className="mt-1 text-[11px] text-gray-500">{description}</div>
            )}
          </div>
        </div>

        {/* 底部进度条 */}
        {showProgress && limit > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200/60">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                progressFill
              )}
              style={{
                width: `${Math.min(ratio * 100, 100)}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
