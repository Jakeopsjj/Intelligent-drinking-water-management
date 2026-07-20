import { Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sage-500 shadow-soft">
        <Droplets className="h-5 w-5 text-white" strokeWidth={2.2} />
        <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-clay-400 ring-2 ring-white" />
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-serif text-base font-semibold text-teal-600">
            肾友笔记
          </span>
          <span className="text-[10px] text-teal-500/70">透析健康追踪</span>
        </div>
      )}
    </div>
  );
}
