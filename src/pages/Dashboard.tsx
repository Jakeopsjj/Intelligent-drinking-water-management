import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Droplets,
  Gauge,
  Citrus,
  HeartPulse,
  Sparkles,
  TrendingUp,
  Bone,
  Soup,
} from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import {
  WaterQuickRecord,
  UltrafiltrationQuickRecord,
  FruitQuickRecord,
} from '@/components/QuickRecordCard';
import RecordItem from '@/components/RecordItem';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatDateLong, getTodayKey } from '@/utils/date';
import { getProgressStatus, getDailyMetrics } from '@/utils/calc';
import { getPageShellClass, getInnerCardClass } from '@/lib/theme';
import { cn } from '@/lib/utils';

function gToKgNum(g: number): string {
  if (!Number.isFinite(g)) return '0';
  const kg = g / 1000;
  return kg.toFixed(2).replace(/\.?0+$/, '') || '0';
}

export default function Dashboard() {
  const records = useRecordsStore((s) => s.records);
  const deleteRecord = useRecordsStore((s) => s.deleteRecord);
  const settings = useSettingsStore((s) => s.settings);
  const cardTheme = useSettingsStore((s) => s.settings.cardTheme || 'glass');

  const todayKey = getTodayKey();
  const todayMetrics = useMemo(
    () => getDailyMetrics(records, todayKey),
    [records, todayKey]
  );

  const userName = settings.userName?.trim() || '肾友';

  const waterStatus = getProgressStatus(todayMetrics.water, settings.dailyWaterLimit);
  const potassiumStatus = getProgressStatus(
    todayMetrics.potassium,
    settings.dailyPotassiumLimit
  );
  const phosphorusStatus = getProgressStatus(
    todayMetrics.phosphorus,
    settings.dailyPhosphorusLimit
  );
  const sodiumStatus = getProgressStatus(todayMetrics.sodium, settings.dailySodiumLimit);
  const fruitStatus = getProgressStatus(todayMetrics.fruit, settings.dailyFruitLimit);

  const overallWarning =
    waterStatus === 'exceeded' ||
    potassiumStatus === 'exceeded' ||
    phosphorusStatus === 'exceeded' ||
    sodiumStatus === 'exceeded' ||
    fruitStatus === 'exceeded';

  const overviewItems = [
    { label: '饮水', value: todayMetrics.water, unit: 'ml', icon: <Droplets className="h-3 w-3" /> },
    { label: '超滤', value: todayMetrics.ultrafiltration, unit: 'ml', icon: <Gauge className="h-3 w-3" /> },
    { label: '水果', value: gToKgNum(todayMetrics.fruit), unit: 'kg', icon: <Citrus className="h-3 w-3" /> },
    { label: '钾', value: todayMetrics.potassium, unit: 'mg', icon: <HeartPulse className="h-3 w-3" /> },
  ];

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn('relative overflow-hidden rounded-[28px] border p-6', getPageShellClass(cardTheme))}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm ring-1 ring-teal-100">
              {settings.userAvatar || '🧑'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-teal-600/70">
                <Sparkles className="h-3 w-3" />
                今天也要轻松管理
              </div>
              <h1 className="mt-1 font-serif text-2xl font-semibold leading-tight text-teal-800 sm:text-3xl">
                你好，{userName}
              </h1>
              <p className="mt-0.5 text-xs text-teal-600/60">{formatDateLong()}</p>
            </div>
          </div>
          {overallWarning ? (
            <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-clay-100 px-3 py-1.5 text-xs font-medium text-clay-600">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">注意</span>
            </div>
          ) : (
            <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1.5 text-xs font-medium text-sage-600">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">控制良好</span>
            </div>
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className={cn('rounded-[28px] border p-5', getPageShellClass(cardTheme))}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-teal-700">今日总览</h2>
          {overallWarning ? (
            <span className="whitespace-nowrap rounded-full bg-clay-100 px-2 py-0.5 text-[10px] font-medium text-clay-600">
              注意
            </span>
          ) : (
            <span className="whitespace-nowrap rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-medium text-sage-600">
              正常
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {overviewItems.map((item) => (
            <div
              key={item.label}
              className={cn('rounded-2xl border p-3 text-center', getInnerCardClass(cardTheme))}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] text-teal-600/60">
                {item.icon}
                {item.label}
              </div>
              <div className="mt-1.5 text-sm font-semibold text-teal-700">
                {item.value}
                <span className="text-[10px] font-normal text-teal-600/60"> {item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 gap-4"
      >
        <MetricCard
          title="摄水量"
          icon={<Droplets className="h-4 w-4" />}
          current={todayMetrics.water}
          limit={settings.dailyWaterLimit}
          unit="ml"
          theme="teal"
          description={todayMetrics.fruitWater > 0 ? `含水果水 ${todayMetrics.fruitWater} ml` : undefined}
        />
        <MetricCard
          title="超滤量"
          icon={<Gauge className="h-4 w-4" />}
          current={todayMetrics.ultrafiltration}
          limit={2500}
          unit="ml"
          theme="teal"
          description="透析当日累计"
        />
        <MetricCard
          title="水果摄入"
          icon={<Citrus className="h-4 w-4" />}
          current={todayMetrics.fruit}
          limit={settings.dailyFruitLimit}
          unit="g"
          displayValue={gToKgNum(todayMetrics.fruit)}
          displayUnit="kg"
          theme="sage"
          description={todayMetrics.fruitWater > 0 ? `贡献水分 ${todayMetrics.fruitWater} ml` : undefined}
        />
        <MetricCard
          title="钾摄入"
          icon={<HeartPulse className="h-4 w-4" />}
          current={todayMetrics.potassium}
          limit={settings.dailyPotassiumLimit}
          unit="mg"
          theme="sage"
          description="影响心律"
        />
        <MetricCard
          title="磷摄入"
          icon={<Bone className="h-4 w-4" />}
          current={todayMetrics.phosphorus}
          limit={settings.dailyPhosphorusLimit}
          unit="mg"
          theme="teal"
          description="过量致瘙痒"
        />
        <MetricCard
          title="钠摄入"
          icon={<Soup className="h-4 w-4" />}
          current={todayMetrics.sodium}
          limit={settings.dailySodiumLimit}
          unit="mg"
          theme="sage"
          description="影响血压"
        />
      </motion.section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <WaterQuickRecord />
        <UltrafiltrationQuickRecord />
        <FruitQuickRecord />
      </section>

      <section className={cn('rounded-[28px] border p-5', getPageShellClass(cardTheme))}>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-teal-700">今日记录</h2>
          <span className="whitespace-nowrap rounded-full bg-sage-50 px-2.5 py-0.5 text-[11px] font-medium text-sage-600">
            {todayMetrics.records.length} 条
          </span>
        </div>
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
          {todayMetrics.records.length > 0 ? (
            todayMetrics.records.map((r) => (
              <RecordItem key={r.id} record={r} onDelete={deleteRecord} cardTheme={cardTheme} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100">
                <Droplets className="h-5 w-5 text-teal-600/40" />
              </div>
              <p className="mt-2 text-xs text-teal-600/60">今日还没有记录</p>
              <p className="text-[10px] text-teal-600/40">点击上方卡片开始记录</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
