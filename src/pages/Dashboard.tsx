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
  Pill,
  Plus,
  Check,
} from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import WaterProgressRing from '@/components/WaterProgressRing';
import {
  WaterQuickRecord,
  UltrafiltrationQuickRecord,
  FruitQuickRecord,
  MedicationQuickRecord,
} from '@/components/QuickRecordCard';
import RecordItem from '@/components/RecordItem';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatDateLong, getTodayKey } from '@/utils/date';
import { getProgressStatus, getDailyMetrics, calculateSuggestedWaterLimit } from '@/utils/calc';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// 将克转为 kg 纯数字字符串（不含单位）
function gToKgNum(g: number): string {
  if (!Number.isFinite(g)) return '0';
  const kg = g / 1000;
  return kg.toFixed(2).replace(/\.?0+$/, '') || '0';
}

export default function Dashboard() {
  const records = useRecordsStore((s) => s.records);
  const deleteRecord = useRecordsStore((s) => s.deleteRecord);
  const addWaterRecord = useRecordsStore((s) => s.addWaterRecord);
  const settings = useSettingsStore((s) => s.settings);

  const [quickSaved, setQuickSaved] = useState<number | null>(null);

  const todayKey = getTodayKey();
  const todayMetrics = useMemo(
    () => getDailyMetrics(records, todayKey),
    [records, todayKey]
  );

  const userName = settings.userName?.trim() || '肾友';

  // 智能摄水限额：优先使用用户设置，其次根据体重自动计算建议值
  const waterLimit = useMemo(() => {
    if (settings.dailyWaterLimit > 0) return settings.dailyWaterLimit;
    const suggested = calculateSuggestedWaterLimit(settings.weight, settings.dialysisType);
    return suggested ?? 1000;
  }, [settings.dailyWaterLimit, settings.weight, settings.dialysisType]);

  const waterStatus = getProgressStatus(todayMetrics.water, waterLimit);
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

  const handleQuickAdd = (amount: number) => {
    addWaterRecord({ amount });
    setQuickSaved(amount);
    setTimeout(() => setQuickSaved(null), 1200);
  };

  const overviewItems = [
    { label: '饮水', value: todayMetrics.water, unit: 'ml', icon: <Droplets className="h-3 w-3" /> },
    { label: '超滤', value: todayMetrics.ultrafiltration, unit: 'ml', icon: <Gauge className="h-3 w-3" /> },
    { label: '水果', value: gToKgNum(todayMetrics.fruit), unit: 'kg', icon: <Citrus className="h-3 w-3" /> },
    { label: '钾', value: todayMetrics.potassium, unit: 'mg', icon: <HeartPulse className="h-3 w-3" /> },
    { label: '磷', value: todayMetrics.phosphorus, unit: 'mg', icon: <Bone className="h-3 w-3" /> },
    { label: '钠', value: todayMetrics.sodium, unit: 'mg', icon: <Soup className="h-3 w-3" /> },
    { label: '服药', value: todayMetrics.medicationCount, unit: '次', icon: <Pill className="h-3 w-3" /> },
  ];

  return (
    <div className="space-y-5">
      {/* 顶部问候卡片 */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative overflow-hidden rounded-[28px] p-6"
      >
        {/* 水滴光斑装饰 */}
        <div className="glass-orb -right-8 -top-8 h-32 w-32 bg-teal-300/30" />
        <div className="glass-orb -bottom-10 -left-6 h-24 w-24 bg-sage-300/25" style={{ animationDelay: '2s' }} />
        {/* 流动反光 */}
        <div className="glass-shimmer" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-teal-600/70">
              <Sparkles className="h-3 w-3" />
              今天也要轻松管理
            </div>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-teal-800">
              你好，{userName}
            </h1>
            <p className="mt-1 text-xs text-teal-600/60">{formatDateLong()}</p>
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

      {/* 饮水进度环 + 一键记录 */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className="glass-card relative overflow-hidden rounded-[28px] p-5"
      >
        <div className="glass-orb -right-10 -top-10 h-28 w-28 bg-teal-300/20" />
        <div className="glass-shimmer" />
        <div className="relative z-10 flex flex-col items-center">
          <WaterProgressRing current={todayMetrics.water} limit={waterLimit} />

          {/* 一键记录按钮 */}
          <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
            {[50, 100, 150, 200].map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAdd(amount)}
                className={cn(
                  'flex items-center gap-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition active:scale-95',
                  quickSaved === amount
                    ? 'border-sage-400 bg-sage-500 text-white'
                    : 'border-teal-200 bg-teal-50 text-teal-600 hover:border-teal-300 hover:bg-teal-100'
                )}
              >
                {quickSaved === amount ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {amount} ml
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-teal-600/40">
            {settings.weight
              ? `基于体重 ${settings.weight}kg${settings.dialysisType === 'pd' ? '（腹膜透析）' : ''} 建议每日 ${waterLimit}ml`
              : '请在设置中填写体重，自动计算建议摄水限额'}
          </p>
        </div>
      </motion.section>

      {/* 今日总览：7 个指标，横向滑动查看 */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative overflow-hidden rounded-[28px] p-5"
      >
        <div className="glass-orb -right-6 -top-6 h-24 w-24 bg-teal-300/20" />
        <div className="relative z-10 flex items-center justify-between">
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
        {/* 横向滑动区域：6 个指标卡片，超出可左右滑动 */}
        <div className="relative z-10 mt-4 flex gap-2.5 overflow-x-auto pb-1 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {overviewItems.map((item) => (
            <div
              key={item.label}
              className="glass-tile flex w-[72px] flex-shrink-0 flex-col items-center rounded-2xl p-3 text-center"
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
        <p className="relative z-10 mt-1.5 text-[10px] text-teal-600/40">← 左右滑动查看全部 7 项指标 →</p>
      </motion.section>

      {/* 核心指标卡片：2 列，增加间距 */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 gap-4"
      >
        <MetricCard
          title="摄水量"
          icon={<Droplets className="h-4 w-4" />}
          current={todayMetrics.water}
          limit={waterLimit}
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

      {/* 快速记录区 */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <WaterQuickRecord />
        <UltrafiltrationQuickRecord />
        <FruitQuickRecord />
        <MedicationQuickRecord />
      </section>

      {/* 今日记录列表 */}
      <section className="glass-card relative overflow-hidden rounded-[28px] p-5">
        <div className="glass-orb -left-6 -bottom-6 h-24 w-24 bg-sage-300/20" style={{ animationDelay: '3s' }} />
        <div className="relative z-10 flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-teal-700">今日记录</h2>
          <span className="whitespace-nowrap rounded-full bg-sage-50 px-2.5 py-0.5 text-[11px] font-medium text-sage-600">
            {todayMetrics.records.length} 条
          </span>
        </div>
        <div className="relative z-10 mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
          {todayMetrics.records.length > 0 ? (
            todayMetrics.records.map((r) => (
              <RecordItem key={r.id} record={r} onDelete={deleteRecord} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="glass-tile flex h-12 w-12 items-center justify-center rounded-2xl">
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
