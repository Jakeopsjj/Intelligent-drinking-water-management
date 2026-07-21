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
  /** 显示值覆盖（如将 g 显示为 kg），不传则用 current */
  displayValue?: string;
  /** 显示单位覆盖（如把 g 改为 kg） */
  displayUnit?: string;
  /** 显示限额覆盖（如把 g 限额改为 kg 限额） */
  displayLimit?: string;
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
  displayValue,
  displayUnit,
  displayLimit,
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
  const colors = themeColors[theme];

  // 显示值 / 单位 / 限额的覆盖逻辑（用于 g → kg 转换等场景）
  const shownValue = displayValue ?? String(current);
  const shownUnit = displayUnit ?? unit;
  const shownRemaining = displayLimit != null ? undefined : `${remaining}`;
  const shownLimit = displayLimit ?? `${limit}`;
  const shownExceeded = displayLimit != null ? undefined : `${-remaining}`;

  const valueColor =
    status === 'exceeded' ? 'text-red-600' : status === 'warning' ? 'text-clay-500' : colors.text;

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-3xl border p-4 transition-all duration-300',
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
              colors.icon
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
      <div className="mt-3 flex flex-1 items-center">
        {variant === 'ring' && (
          <div className="flex w-full items-center gap-4">
            <div className="flex-shrink-0">
              <ProgressRing
                value={current}
                limit={limit}
                status={status}
                radius={34}
                strokeWidth={6}
              >
                <div className="text-center">
                  <div className={cn('text-xs font-medium', valueColor)}>{Math.round(ratio * 100)}%</div>
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
                <div className="mt-1 text-[10px] text-sage-600/60">{description}</div>
              )}
            </div>
          </div>
        )}

        {variant === 'numeric' && (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className={cn('font-serif text-4xl font-semibold leading-none', valueColor)}>
                  {shownValue}
                </span>
                <span className="text-sm text-teal-600/60">{shownUnit}</span>
              </div>
              {description && limit > 0 && (
                <div className="mt-1 text-[10px] text-sage-600/60">{description}</div>
              )}
            </div>
            <div className="text-right text-xs leading-relaxed text-teal-600/70">
              {limit > 0 ? (
                inverseProgress ? (
                  <>
                    <div>
                      目标 <span className={cn('font-medium', valueColor)}>{shownLimit}</span> {shownUnit}
                    </div>
                  </>
                ) : remaining > 0 ? (
                  <>
                    <div>
                      剩余 <span className={cn('font-medium', valueColor)}>{shownRemaining}</span> {shownUnit}
                    </div>
                    <div>
                      目标 <span className="font-medium text-teal-700/70">{shownLimit}</span> {shownUnit}
                    </div>
                  </>
                ) : (
                  <div className="text-red-500/80">
                    已超出 <span className="font-medium">{shownExceeded}</span> {shownUnit}
                  </div>
                )
              ) : (
                <div>{description}</div>
              )}
            </div>
          </div>
        )}

        {variant === 'split' && (
          <div className="flex w-full items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className={cn('font-serif text-3xl font-semibold leading-none', valueColor)}>
                  {shownValue}
                </span>
                <span className="text-sm text-teal-600/60">{shownUnit}</span>
              </div>
              <div className="mt-1 text-[11px] text-teal-600/50">已摄入</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-teal-600/50">剩余</div>
              <div className="mt-0.5 text-lg font-semibold text-teal-700/80">
                {remaining > 0 ? (
                  <>
                    {shownRemaining} <span className="text-xs font-normal text-teal-600/60">{shownUnit}</span>
                  </>
                ) : (
                  <span className="text-red-500/80">0 {shownUnit}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部进度条 */}
      {showProgress && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
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
