import type { FC, ReactNode } from 'react';
import ProgressRing from './ProgressRing';
import { getProgressStatus } from '@/utils/calc';
import { cn } from '@/lib/utils';

type MetricVariant = 'ring' | 'numeric' | 'split';

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
  /** 显示限额覆盖（纯数字字符串，不含单位） */
  displayLimit?: string;
  /** 显示剩余覆盖（纯数字字符串，不含单位）。不传则自动计算 */
  displayRemaining?: string;
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
  displayLimit,
  displayRemaining,
  theme = 'teal',
  description,
  showProgress = true,
  inverseProgress = false,
  variant = 'split',
}) => {
  const ratio = limit > 0 ? current / limit : 0;
  const status = inverseProgress
    ? ratio >= 1
      ? 'normal'
      : 'warning'
    : getProgressStatus(current, limit);

  const remaining = limit - current;

  // 显示值 / 单位 / 限额 / 剩余的覆盖逻辑
  // 重要：displayValue / displayLimit / displayRemaining 都是纯数字，不含单位
  const shownValue = displayValue ?? String(current);
  const shownUnit = displayUnit ?? unit;
  const shownLimit = displayLimit ?? String(limit);

  // 计算显示剩余
  let shownRemaining: string;
  if (displayRemaining != null) {
    shownRemaining = displayRemaining;
  } else if (displayLimit != null && displayValue != null) {
    // 从覆盖的数字字符串计算
    const dv = parseFloat(displayValue);
    const dl = parseFloat(displayLimit);
    shownRemaining = isNaN(dv) || isNaN(dl) ? String(remaining) : String(dl - dv);
  } else {
    shownRemaining = String(remaining);
  }

  // 颜色：正常状态统一用深青色，避免不同 theme 带来红色感
  // 只有 warning / exceeded 才用暖色
  const valueColor =
    status === 'exceeded'
      ? 'text-red-600'
      : status === 'warning'
      ? 'text-clay-500'
      : 'text-teal-700';

  const remainingColor =
    status === 'exceeded'
      ? 'text-red-500'
      : status === 'warning'
      ? 'text-clay-500'
      : 'text-sage-600';

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
      {/* 头部：图标 + 标题 + 状态徽章 */}
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl',
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
              {description && limit > 0 && (
                <div className="mt-1.5 text-[11px] text-teal-600/50">{description}</div>
              )}
            </div>
          </div>
        )}

        {variant === 'numeric' && (
          <div className="flex w-full items-end justify-between gap-3">
            <div className="min-w-0">
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
            <div className="text-right">
              <div className="text-[11px] text-teal-600/50">目标</div>
              <div className="mt-0.5 text-base font-semibold text-teal-700/80">
                {shownLimit}
                <span className="text-xs font-normal text-teal-600/60"> {shownUnit}</span>
              </div>
            </div>
          </div>
        )}

        {variant === 'split' && (
          <div className="flex w-full items-end justify-between gap-3">
            {/* 左侧：已摄入 */}
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-teal-600/50">已摄入</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className={cn('font-serif text-3xl font-semibold leading-none', valueColor)}>
                  {shownValue}
                </span>
                <span className="text-xs text-teal-600/60">{shownUnit}</span>
              </div>
            </div>
            {/* 右侧：剩余 */}
            <div className="text-right">
              <div className="text-[11px] font-medium text-teal-600/50">剩余</div>
              <div className="mt-1 flex items-baseline justify-end gap-1">
                <span className={cn('font-serif text-2xl font-semibold leading-none', remainingColor)}>
                  {Number(shownRemaining) > 0 ? shownRemaining : '0'}
                </span>
                <span className="text-xs text-teal-600/60">{shownUnit}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部进度条 */}
      {showProgress && (
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
      )}
    </div>
  );
};

export default MetricCard;
