import type { FC, ReactNode } from 'react';
import ProgressRing from './ProgressRing';
import { getProgressStatus } from '@/utils/calc';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  icon: ReactNode;
  current: number;
  limit: number;
  unit: string;
  /** 颜色主题 */
  theme?: 'teal' | 'sage' | 'clay';
  /** 子标题描述 */
  description?: string;
  /** 是否显示进度条 */
  showProgress?: boolean;
  /** 反向：值越高越好（如超滤量） */
  inverseProgress?: boolean;
}

const themeColors: Record<string, { bg: string; text: string; icon: string }> = {
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'bg-teal-500/10 text-teal-500' },
  sage: { bg: 'bg-sage-50', text: 'text-sage-600', icon: 'bg-sage-400/10 text-sage-500' },
  clay: { bg: 'bg-clay-50', text: 'text-clay-600', icon: 'bg-clay-400/10 text-clay-500' },
};

const MetricCard: FC<MetricCardProps> = ({
  title,
  icon,
  current,
  limit,
  unit,
  theme = 'teal',
  description,
  showProgress = true,
  inverseProgress = false,
}) => {
  const ratio = limit > 0 ? current / limit : 0;
  const status = inverseProgress
    ? ratio >= 1
      ? 'normal'
      : 'warning'
    : getProgressStatus(current, limit);

  const remaining = limit - current;
  const colors = themeColors[theme];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-soft-lg',
        status === 'exceeded'
          ? 'border-red-200 bg-red-50/50'
          : status === 'warning'
          ? 'border-clay-200 bg-clay-50/40'
          : 'border-cream-300 bg-white/70'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              colors.icon
            )}
          >
            {icon}
          </div>
          <span className="text-sm font-medium text-teal-600/80">{title}</span>
        </div>
        {status === 'exceeded' && (
          <span className="whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
            超标
          </span>
        )}
        {status === 'warning' && (
          <span className="whitespace-nowrap rounded-full bg-clay-100 px-2 py-0.5 text-[10px] font-medium text-clay-600">
            注意
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        {showProgress && (
          <ProgressRing
            value={current}
            limit={limit}
            status={status}
            radius={36}
            strokeWidth={5}
          >
            <div className="text-center">
              <div className="text-[10px] text-teal-600/60">
                {Math.round(ratio * 100)}%
              </div>
            </div>
          </ProgressRing>
        )}

        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'font-serif text-2xl font-semibold',
                status === 'exceeded'
                  ? 'text-red-600'
                  : status === 'warning'
                  ? 'text-clay-500'
                  : 'text-teal-600'
              )}
            >
              {current}
            </span>
            <span className="text-xs text-teal-600/60">{unit}</span>
          </div>
          {limit > 0 ? (
            <div className="mt-1 text-xs text-teal-600/70">
              {inverseProgress ? (
                <span>
                  目标 <span className="font-medium text-teal-700">{limit}</span> {unit}
                </span>
              ) : remaining > 0 ? (
                <span>
                  还可摄入 <span className="font-medium text-sage-600">{remaining}</span> {unit}
                </span>
              ) : (
                <span className="text-red-500">已超出 {-remaining} {unit}</span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-xs text-teal-600/70">{description}</div>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            status === 'exceeded'
              ? 'bg-red-500'
              : status === 'warning'
              ? 'bg-clay-400'
              : 'bg-teal-500'
          )}
          style={{
            width: `${Math.min(ratio * 100, 100)}%`,
          }}
        />
      </div>
    </div>
  );
};

export default MetricCard;
