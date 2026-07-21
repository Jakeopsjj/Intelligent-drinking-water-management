import type { FC, ReactNode } from 'react';
import ProgressRing from './ProgressRing';
import WaveFill from './WaveFill';
import { getProgressStatus } from '@/utils/calc';
import { cn } from '@/lib/utils';

type MetricVariant = 'ring' | 'numeric';

interface MetricCardProps {
  title: string;
  icon: ReactNode;
  current: number;
  limit: number;
  unit: string;
  /** 显示值覆盖（纯数字字符串，不含单位） */
  displayValue?: string;
  /** 显示单位覆盖（如把 g 改为 kg） */
  displayUnit?: string;
  /** 颜色主题 */
  theme?: 'teal' | 'sage' | 'clay';
  /** 子标题描述 */
  description?: string;
  /** 是否显示进度条 */
  showProgress?: boolean;
  /** 反向：值越高越好（如超滤量） */
  inverseProgress?: boolean;
  /** 展示模式 */
  variant?: MetricVariant;
  /** 是否显示波浪液位填充 */
  showWave?: boolean;
}

const themeIcon: Record<string, string> = {
  teal: 'bg-teal-500/10 text-teal-500',
  sage: 'bg-sage-400/10 text-sage-500',
  clay: 'bg-clay-400/10 text-clay-500',
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
  variant = 'numeric',
  showWave = true,
}) => {
  const ratio = limit > 0 ? current / limit : 0;
  const status = inverseProgress
    ? ratio >= 1
      ? 'normal'
      : 'warning'
    : getProgressStatus(current, limit);

  const shownValue = displayValue ?? String(current);
  const shownUnit = displayUnit ?? unit;

  // 颜色：正常状态统一用深青色，避免红色压迫感
  const valueColor =
    status === 'exceeded'
      ? 'text-red-600'
      : status === 'warning'
      ? 'text-clay-500'
      : 'text-teal-700';

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-3xl border p-5 transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-soft-lg',
        status === 'exceeded'
          ? 'border-red-100 bg-red-50/40'
          : status === 'warning'
          ? 'border-clay-100 bg-clay-50/30'
          : 'border-cream-200 bg-white/80'
      )}
    >
      {/* 底层：波浪液位填充（根据进度控制水位高度） */}
      {showWave && limit > 0 && (
        <WaveFill ratio={ratio} status={status} theme={theme} inverse={inverseProgress} />
      )}

      {/* 上层：图标、标题、数值文字（浮在水波之上，不被遮挡） */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* 头部：图标 + 标题 + 状态徽章 */}
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm',
                themeIcon[theme]
              )}
            >
              {icon}
            </div>
            <span className="truncate text-sm font-medium text-teal-700/80">{title}</span>
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

        {/* 中间内容：根据 variant 切换 */}
        <div className="mt-4 flex flex-1 items-center">
          {variant === 'ring' && (
            <div className="flex w-full items-center gap-4">
              <div className="flex-shrink-0">
                <ProgressRing
                  value={current}
                  limit={limit}
                  status={status}
                  radius={36}
                  strokeWidth={6}
                >
                  <div className="text-center">
                    <div className={cn('text-xs font-semibold', valueColor)}>
                      {Math.round(ratio * 100)}%
                    </div>
                  </div>
                </ProgressRing>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1">
                  <span className={cn('font-serif text-4xl font-semibold leading-none', valueColor)}>
                    {shownValue}
                  </span>
                  <span className="text-sm text-teal-600/60">{shownUnit}</span>
                </div>
                {description && (
                  <div className="mt-1.5 text-[11px] text-teal-600/50">{description}</div>
                )}
              </div>
            </div>
          )}

          {variant === 'numeric' && (
            <div className="w-full">
              <div className="flex items-baseline gap-1">
                <span className={cn('font-serif text-4xl font-semibold leading-none', valueColor)}>
                  {shownValue}
                </span>
                <span className="text-sm text-teal-600/60">{shownUnit}</span>
              </div>
              {description && (
                <div className="mt-1.5 text-[11px] text-teal-600/50">{description}</div>
              )}
            </div>
          )}
        </div>

        {/* 底部进度条 */}
        {showProgress && limit > 0 && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-cream-200/80">
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
        )}
      </div>
    </div>
  );
};

export default MetricCard;
