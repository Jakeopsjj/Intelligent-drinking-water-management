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

  return (
    <div
      className={cn(
        // 固定高度，统一卡片尺寸；使用 flex 列布局确保内部各层对齐
        'relative flex h-36 flex-col overflow-hidden rounded-2xl border p-4 transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-soft-lg',
        status === 'exceeded'
          ? 'border-red-200 bg-red-50/50'
          : status === 'warning'
          ? 'border-clay-200 bg-clay-50/40'
          : 'border-cream-300 bg-white/70'
      )}
    >
      {/* 第一层：左上图标+标题，右上状态徽章 */}
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            className={cn(
              'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
              colors.icon
            )}
          >
            {icon}
          </div>
          <span className="truncate text-xs font-medium text-teal-600/80">{title}</span>
        </div>
        {status === 'exceeded' && (
          <span className="whitespace-nowrap rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
            超标
          </span>
        )}
        {status === 'warning' && (
          <span className="whitespace-nowrap rounded-full bg-clay-100 px-1.5 py-0.5 text-[10px] font-medium text-clay-600">
            注意
          </span>
        )}
      </div>

      {/* 第二层：左侧环形进度 + 右侧大号数值+剩余阈值 */}
      <div className="mt-2 flex flex-1 items-center gap-3">
        {showProgress && (
          <ProgressRing
            value={current}
            limit={limit}
            status={status}
            radius={26}
            strokeWidth={4}
          >
            <div className="text-center">
              <div className="text-[9px] font-medium text-teal-600/70">
                {Math.round(ratio * 100)}%
              </div>
            </div>
          </ProgressRing>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'font-serif text-3xl font-semibold leading-none',
                status === 'exceeded'
                  ? 'text-red-600'
                  : status === 'warning'
                  ? 'text-clay-500'
                  : 'text-teal-600'
              )}
            >
              {shownValue}
            </span>
            <span className="text-xs text-teal-600/60">{shownUnit}</span>
          </div>
          {limit > 0 ? (
            <div className="mt-1 text-[10px] text-teal-600/50">
              {inverseProgress ? (
                <span>
                  目标 <span className="font-medium text-teal-700/80">{shownLimit}</span> {shownUnit}
                </span>
              ) : remaining > 0 ? (
                <span>
                  还可摄入 <span className="font-medium text-sage-600/80">{shownRemaining}</span> {shownUnit}
                </span>
              ) : (
                <span className="text-red-500/80">已超出 {shownExceeded} {shownUnit}</span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-[10px] text-teal-600/50">{description}</div>
          )}
          {description && limit > 0 && (
            <div className="mt-0.5 text-[10px] text-sage-600/50">{description}</div>
          )}
        </div>
      </div>

      {/* 第四层：底部进度条 */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-cream-200">
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
