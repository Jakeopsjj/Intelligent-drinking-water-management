import { Trash2, Droplets, Activity, Citrus } from 'lucide-react';
import type { AnyRecord } from '@/types';
import { formatDateTime } from '@/utils/date';
import { formatWeightKg } from '@/utils/calc';
import { cn } from '@/lib/utils';

interface RecordItemProps {
  record: AnyRecord;
  onDelete?: (id: string) => void;
}

export default function RecordItem({ record, onDelete }: RecordItemProps) {
  const iconMap = {
    water: { icon: <Droplets className="h-4 w-4" />, bg: 'bg-teal-100', text: 'text-teal-600' },
    ultrafiltration: {
      icon: <Activity className="h-4 w-4" />,
      bg: 'bg-clay-100',
      text: 'text-clay-600',
    },
    fruit: {
      icon: <Citrus className="h-4 w-4" />,
      bg: 'bg-sage-100',
      text: 'text-sage-600',
    },
  }[record.type];

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-cream-200 bg-white/60 px-3 py-2.5 transition hover:border-cream-300 hover:bg-white">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', iconMap.bg, iconMap.text)}>
        {record.type === 'fruit' ? (
          <span className="text-base">
            {(record as any).fruitEmoji}
          </span>
        ) : (
          iconMap.icon
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-teal-700">
            {record.type === 'water'
              ? '饮水'
              : record.type === 'ultrafiltration'
              ? '超滤'
              : (record as any).fruitName}
          </span>
          <span className="text-xs text-teal-600/60">{formatDateTime(record.timestamp)}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-teal-600/70">
          <span className="whitespace-nowrap font-medium">
            {record.type === 'water'
              ? `${record.amount} ml`
              : record.type === 'ultrafiltration'
              ? `${record.amount} ml`
              : `${formatWeightKg((record as any).weight)}`}
          </span>
          {record.type === 'fruit' && (
            <>
              <span className="text-cream-400">·</span>
              <span className="whitespace-nowrap">钾 {(record as any).potassium} mg</span>
              <span className="text-cream-400">·</span>
              <span className="whitespace-nowrap">磷 {(record as any).phosphorus} mg</span>
              <span className="text-cream-400">·</span>
              <span className="whitespace-nowrap">钠 {(record as any).sodium} mg</span>
              <span className="text-cream-400">·</span>
              <span className="whitespace-nowrap text-sage-600/80">水 {(record as any).water} ml</span>
            </>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(record.id)}
          className="rounded-lg p-1.5 text-teal-600/40 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
