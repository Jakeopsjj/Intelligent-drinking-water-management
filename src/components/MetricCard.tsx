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
  /** 是否显示波浪液位填充 */
  showWave?: boolean;
}

const themeIcon: Record<string, string> = {
  teal: 'text-teal-500',
  sage: 'text-sage-500',
  clay: 'text-clay-500',
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
}) => {
  const ratio = limit > 0 ? current / limit : 0;
  const status = inverseProgress
    ? ratio >= 1
      ? 'exceeded'
      : 'normal'
    : getProgressStatus(current, limit);

  const shownValue = displayValue ?? String(current);
  const shownUnit = displayUnit ?? unit;

  // 颜色：正常状态白色（透明卡片），warning 深色，超额 红色
  const valueColor =
    status === 'exceeded'
      ? 'text-white'
      : status === 'warning'
      ? 'text-white'
      : 'text-white';

  const titleColor =
    status === 'exceeded'
      ? 'text-white/90'
      : status === 'warning'
      ? 'text-white/90'
      : 'text-white/90';

  return (
    <div
      className={cn(
        'relative flex min-h-[140px] flex-col overflow-hidden rounded-3xl border p-5 transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-soft-lg',
        // 容器透明化，背景由 WaveFill 提供
        'border-white/40 bg-white/5 backdrop-blur-sm',
        status === 'exceeded' && 'border-red-200/60',
        status === 'warning' && 'border-clay-200/60'
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
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md',
                themeIcon[theme]
              )}
            >
              {icon}
            </div>
            <span className={cn('truncate text-sm font-medium', titleColor)}>{title}</span>
          </div>
          {status === 'exceeded' && (
            <span className="whitespace-nowrap rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white">
              超标
            </span>
          )}
          {status === 'warning' && (
            <span className="whitespace-nowrap rounded-full bg-clay-500 px-2 py-0.5 text-[10px] font-medium text-white">
              注意
            </span>
          )}
        </div>

        {/* 中间内容：大号数值 */}
        <div className="mt-4 flex flex-1 items-center">
          <div className="w-full">
            <div className="flex items-baseline gap-1">
              <span className={cn('font-serif text-4xl font-semibold leading-none drop-shadow-sm', valueColor)}>
                {shownValue}
              </span>
              <span className="text-sm text-white/70">{shownUnit}</span>
            </div>
            {description && (
              <div className="mt-1.5 text-[11px] text-white/60">{description}</div>
            )}
          </div>
        </div>

        {/* 底部进度条 */}
        {showProgress && limit > 0 && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                status === 'exceeded'
                  ? 'bg-white'
                  : status === 'warning'
                  ? 'bg-white'
                  : 'bg-white'
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
