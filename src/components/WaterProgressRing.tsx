import { Droplets, AlertTriangle } from 'lucide-react';
import { getProgressStatus, getProgressStroke } from '@/utils/calc';
import { cn } from '@/lib/utils';

interface WaterProgressRingProps {
  current: number;
  limit: number;
  className?: string;
}

/**
 * 饮水进度环 - 仪表盘核心视觉组件
 *
 * SVG 环形进度条，直观展示今日摄水量占每日限额的比例。
 * 颜色编码：正常(teal) → 警告(orange, 80%) → 超标(red, 100%)
 */
export default function WaterProgressRing({ current, limit, className }: WaterProgressRingProps) {
  const status = limit > 0 ? getProgressStatus(current, limit) : 'normal';
  const ratio = limit > 0 ? Math.min(current / limit, 1) : 0;
  const percent = Math.round(ratio * 100);

  const strokeColor = getProgressStroke(status);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  const remaining = Math.max(0, limit - current);
  const bgClass = status === 'exceeded'
    ? 'bg-red-50'
    : status === 'warning'
    ? 'bg-orange-50'
    : 'bg-teal-50';

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative">
        {/* 背景装饰光晕 */}
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-2xl opacity-30',
            status === 'exceeded'
              ? 'bg-red-400'
              : status === 'warning'
              ? 'bg-orange-400'
              : 'bg-teal-400'
          )}
          style={{ transform: 'scale(0.85)' }}
        />

        {/* SVG 环形进度条 */}
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className="relative z-10 -rotate-90"
        >
          {/* 背景轨道 */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#E8E2D9"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* 进度弧 */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* 中心文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Droplets
            className={cn(
              'h-6 w-6 mb-1',
              status === 'exceeded'
                ? 'text-red-500'
                : status === 'warning'
                ? 'text-orange-500'
                : 'text-teal-500'
            )}
          />
          <span className="font-serif text-3xl font-bold text-teal-800">
            {current}
          </span>
          <span className="text-xs text-teal-600/60">
            / {limit} ml
          </span>
          {status === 'exceeded' && (
            <span className="mt-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
              已超标
            </span>
          )}
          {status === 'warning' && (
            <span className="mt-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
              注意 {percent}%
            </span>
          )}
        </div>
      </div>

      {/* 剩余可饮用量 */}
      <div className={cn('mt-4 rounded-2xl px-4 py-2.5 text-center', bgClass)}>
        {status === 'exceeded' ? (
          <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-red-600">
            <AlertTriangle className="h-4 w-4" />
            已超标 {Math.abs(remaining)} ml
          </div>
        ) : (
          <div className="text-sm font-medium text-teal-700">
            还可饮用 <span className="font-bold text-lg">{remaining}</span> ml
          </div>
        )}
        <div className="mt-0.5 text-[10px] text-teal-600/50">
          {status === 'normal' ? '进度良好' : status === 'warning' ? '接近上限，请控制饮水' : '请立即停止饮水'}
        </div>
      </div>
    </div>
  );
}