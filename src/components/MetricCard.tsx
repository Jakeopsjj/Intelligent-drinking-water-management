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

  // 深色玻璃底色调（按主题区分玻璃色调），保证白色文字始终可读
  const glassTint =
    theme === 'sage'
      ? 'from-sage-900/75 to-sage-950/85'
      : theme === 'clay'
      ? 'from-clay-900/75 to-clay-950/85'
      : 'from-teal-900/75 to-teal-950/85';

  const borderColor =
    status === 'exceeded'
      ? 'border-red-300/40'
      : status === 'warning'
      ? 'border-clay-300/40'
      : 'border-white/20';

  return (
    <div
      className={cn(
        'relative flex min-h-[148px] flex-col overflow-hidden rounded-3xl border p-5 transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-soft-lg',
        // 深色透明玻璃：背景渐变 + backdrop-blur + 玻璃边框 + 内阴影厚度感
        'bg-gradient-to-br backdrop-blur-md',
        glassTint,
        borderColor,
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.25),0_10px_30px_-12px_rgba(0,0,0,0.4)]'
      )}
    >
      {/* 玻璃顶部高光：模拟反射光泽 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 50%, transparent 100%)',
        }}
        aria-hidden="true"
      />
      {/* 玻璃左侧高光：模拟立体边缘 */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-px"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        }}
        aria-hidden="true"
      />

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
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md',
                themeIcon[theme]
              )}
            >
              {icon}
            </div>
            <span className="truncate text-sm font-medium text-white/95 drop-shadow-sm">{title}</span>
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
              <span className="font-serif text-4xl font-semibold leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {shownValue}
              </span>
              <span className="text-sm font-medium text-white/80">{shownUnit}</span>
            </div>
            {description && (
              <div className="mt-1.5 text-[11px] text-white/70">{description}</div>
            )}
          </div>
        </div>

        {/* 底部进度条 */}
        {showProgress && limit > 0 && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-black/25">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/70 to-white transition-all duration-700"
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
