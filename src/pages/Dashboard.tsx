import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Droplets,
  Gauge,
  Citrus,
  HeartPulse,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Bone,
  Soup,
  Pill,
  Activity,
  Scale,
  Heart,
  Timer,
  Calendar,
} from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import {
  WaterQuickRecord,
  UltrafiltrationQuickRecord,
  FruitQuickRecord,
  MedicationQuickRecord,
  WeightQuickRecord,
  BloodPressureQuickRecord,
} from '@/components/QuickRecordCard';
import RecordItem from '@/components/RecordItem';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatDateLong, getTodayKey } from '@/utils/date';
import { getProgressStatus, getDailyMetrics } from '@/utils/calc';

function gToKgNum(g: number): string {
  if (!Number.isFinite(g)) return '0';
  const kg = g / 1000;
  return kg.toFixed(2).replace(/\.?0+$/, '') || '0';
}

export default function Dashboard() {
  const records = useRecordsStore((s) => s.records);
  const deleteRecord = useRecordsStore((s) => s.deleteRecord);
  const settings = useSettingsStore((s) => s.settings);

  const todayKey = getTodayKey();
  const todayMetrics = useMemo(
    () => getDailyMetrics(records, todayKey),
    [records, todayKey]
  );

  const userName = settings.userName?.trim() || '肾友';

  const waterStatus = getProgressStatus(todayMetrics.water, settings.dailyWaterLimit);
  const potassiumStatus = getProgressStatus(todayMetrics.potassium, settings.dailyPotassiumLimit);
  const phosphorusStatus = getProgressStatus(todayMetrics.phosphorus, settings.dailyPhosphorusLimit);
  const sodiumStatus = getProgressStatus(todayMetrics.sodium, settings.dailySodiumLimit);
  const fruitStatus = getProgressStatus(todayMetrics.fruit, settings.dailyFruitLimit);

  const overallWarning =
    waterStatus === 'exceeded' ||
    potassiumStatus === 'exceeded' ||
    phosphorusStatus === 'exceeded' ||
    sodiumStatus === 'exceeded' ||
    fruitStatus === 'exceeded';

  // 透析日倒计时
  const dialysisCountdown = useMemo(() => {
    if (!settings.dialysisSchedule) return null;
    const schedule = settings.dialysisSchedule.trim();
    const dayMap: Record<string, number> = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0 };
    const days = schedule.split(/[\/,，、\s]+/).filter(Boolean);
    const today = new Date();
    const todayDay = today.getDay(); // 0=周日
    let minDays = 7;
    for (const d of days) {
      const target = dayMap[d];
      if (target === undefined) continue;
      let diff = target - todayDay;
      if (diff < 0) diff += 7;
      if (diff === 0) diff = 0; // 今天就是透析日
      minDays = Math.min(minDays, diff);
    }
    if (minDays === 0) return { days: 0, label: '今天是透析日' };
    if (minDays === 1) return { days: 1, label: '明天是透析日' };
    return { days: minDays, label: `距下次透析 ${minDays} 天` };
  }, [settings.dialysisSchedule]);

  const overviewItems = [
    { label: '饮水', value: todayMetrics.water, unit: 'ml', icon: <Droplets className="h-3 w-3" />, limit: settings.dailyWaterLimit, current: todayMetrics.water },
    { label: '超滤', value: todayMetrics.ultrafiltration, unit: 'ml', icon: <Gauge className="h-3 w-3" />, limit: 2500, current: todayMetrics.ultrafiltration },
    { label: '水果', value: gToKgNum(todayMetrics.fruit), unit: 'kg', icon: <Citrus className="h-3 w-3" />, limit: settings.dailyFruitLimit / 1000, current: todayMetrics.fruit / 1000 },
    { label: '钾', value: todayMetrics.potassium, unit: 'mg', icon: <HeartPulse className="h-3 w-3" />, limit: settings.dailyPotassiumLimit, current: todayMetrics.potassium },
    { label: '磷', value: todayMetrics.phosphorus, unit: 'mg', icon: <Bone className="h-3 w-3" />, limit: settings.dailyPhosphorusLimit, current: todayMetrics.phosphorus },
    { label: '钠', value: todayMetrics.sodium, unit: 'mg', icon: <Soup className="h-3 w-3" />, limit: settings.dailySodiumLimit, current: todayMetrics.sodium },
    { label: '服药', value: todayMetrics.medicationCount, unit: '次', icon: <Pill className="h-3 w-3" />, limit: 0, current: 0 },
  ];

  return (
    <div className="space-y-5">
      {/* 顶部问候卡片 */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card-highlight relative overflow-hidden rounded-[28px] p-6"
      >
        <div className="glass-orb -right-8 -top-8 h-36 w-36 bg-teal-300/25" />
        <div className="glass-orb -bottom-12 -left-8 h-28 w-28 bg-sage-300/20" style={{ animationDelay: '1.5s' }} />
        <div className="glass-orb right-16 bottom-4 h-16 w-16 bg-lavender/15" style={{ animationDelay: '3s' }} />
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-teal-600/60">
                <Sparkles className="h-3 w-3" />
                今天也要轻松管理
              </div>
              <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-teal-800">
                你好，{userName}
              </h1>
              <p className="mt-1 text-xs text-teal-600/50">{formatDateLong()}</p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-2">
              {overallWarning ? (
                <div className="flex items-center gap-1.5 rounded-full bg-clay-100 px-3 py-1.5 text-xs font-medium text-clay-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">注意超标</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1.5 text-xs font-medium text-sage-600">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">控制良好</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] text-teal-600/40">
                <Activity className="h-3 w-3" />
                {todayMetrics.records.length} 条记录
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 核心体征卡片：体重 + 血压 + 透析倒计时 */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-3 gap-3"
      >
        {/* 体重 */}
        <div className="glass-card relative overflow-hidden rounded-[24px] p-4">
          <div className="glass-orb -right-4 -top-4 h-20 w-20 bg-indigo-300/15" />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-600/60">
              <Scale className="h-3.5 w-3.5" />
              体重
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-bold text-indigo-700">
                {todayMetrics.latestWeight > 0 ? todayMetrics.latestWeight.toFixed(1) : '--'}
              </span>
              <span className="ml-0.5 text-xs text-indigo-600/40">kg</span>
            </div>
          </div>
        </div>

        {/* 血压 */}
        <div className="glass-card relative overflow-hidden rounded-[24px] p-4">
          <div className="glass-orb -right-4 -top-4 h-20 w-20 bg-red-300/15" />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-[10px] text-red-600/60">
              <Heart className="h-3.5 w-3.5" />
              血压
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-bold text-red-700">
                {todayMetrics.latestSystolic > 0 && todayMetrics.latestDiastolic > 0
                  ? `${todayMetrics.latestSystolic}/${todayMetrics.latestDiastolic}`
                  : '--/--'}
              </span>
            </div>
            {todayMetrics.latestHeartRate > 0 && (
              <div className="mt-0.5 text-[10px] text-red-600/50">
                心率 {todayMetrics.latestHeartRate} bpm
              </div>
            )}
          </div>
        </div>

        {/* 透析倒计时 */}
        <div className="glass-card relative overflow-hidden rounded-[24px] p-4">
          <div className="glass-orb -right-4 -top-4 h-20 w-20 bg-teal-300/15" />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-[10px] text-teal-600/60">
              <Timer className="h-3.5 w-3.5" />
              透析
            </div>
            <div className="mt-1.5">
              {dialysisCountdown ? (
                <>
                  <span className="text-lg font-bold text-teal-700">
                    {dialysisCountdown.days === 0 ? '今天' : `${dialysisCountdown.days}天`}
                  </span>
                  <div className="mt-0.5 text-[10px] text-teal-600/50">
                    {dialysisCountdown.label}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-lg font-bold text-teal-400/60">--</span>
                  <div className="mt-0.5 text-[10px] text-teal-600/50">
                    未设置日程
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* 今日总览：指标横向滑动 */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative overflow-hidden rounded-[28px] p-5"
      >
        <div className="glass-orb -right-6 -top-6 h-24 w-24 bg-teal-300/18" />
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-semibold text-teal-700">今日总览</h2>
            {overallWarning ? (
              <span className="whitespace-nowrap rounded-full bg-clay-100 px-2.5 py-0.5 text-[10px] font-medium text-clay-600">
                注意
              </span>
            ) : (
              <span className="whitespace-nowrap rounded-full bg-sage-100 px-2.5 py-0.5 text-[10px] font-medium text-sage-600">
                正常
              </span>
            )}
          </div>
          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {overviewItems.map((item) => {
              const ratio = item.limit > 0 ? item.current / item.limit : 0;
              const isOver = ratio >= 1 && item.limit > 0;
              const isWarn = ratio >= 0.8 && item.limit > 0;
              return (
                <div
                  key={item.label}
                  className="glass-tile flex w-[76px] flex-shrink-0 flex-col items-center rounded-2xl p-3 text-center transition hover:scale-[1.03]"
                >
                  <div className="flex items-center justify-center gap-1 text-[10px] text-teal-600/60">
                    {item.icon}
                    {item.label}
                  </div>
                  <div className={`mt-1.5 text-sm font-semibold ${isOver ? 'text-clay-500' : isWarn ? 'text-amber-600' : 'text-teal-700'}`}>
                    {item.value}
                    <span className="text-[10px] font-normal text-teal-600/50"> {item.unit}</span>
                  </div>
                  {item.limit > 0 && (
                    <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-white/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-clay-400' : isWarn ? 'bg-amber-400' : 'bg-teal-400'}`}
                        style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-teal-600/35">← 左右滑动查看全部 7 项指标 →</p>
        </div>
      </motion.section>

      {/* 核心指标卡片：2列网格 */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
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

      {/* 快速记录区 */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 gap-3 lg:grid-cols-3"
      >
        <WaterQuickRecord />
        <UltrafiltrationQuickRecord />
        <WeightQuickRecord />
        <BloodPressureQuickRecord />
        <FruitQuickRecord />
        <MedicationQuickRecord />
      </motion.section>

      {/* 今日记录列表 */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative overflow-hidden rounded-[28px] p-5"
      >
        <div className="glass-orb -left-6 -bottom-6 h-24 w-24 bg-sage-300/18" style={{ animationDelay: '3s' }} />
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-semibold text-teal-700">今日记录</h2>
            <span className="whitespace-nowrap rounded-full bg-sage-50 px-2.5 py-0.5 text-[11px] font-medium text-sage-600">
              {todayMetrics.records.length} 条
            </span>
          </div>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
            {todayMetrics.records.length > 0 ? (
              todayMetrics.records.map((r) => (
                <RecordItem key={r.id} record={r} onDelete={deleteRecord} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="glass-tile flex h-14 w-14 items-center justify-center rounded-2xl">
                  <Droplets className="h-6 w-6 text-teal-600/30" />
                </div>
                <p className="mt-3 text-sm text-teal-600/60">今日还没有记录</p>
                <p className="mt-1 text-xs text-teal-600/40">点击上方卡片开始记录</p>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
}