import { useMemo, useState } from 'react';
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
  AlertTriangle,
  ClipboardCheck,
  ArrowUp,
  Minus,
  Bell,
  ShieldAlert,
  Info,
} from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import QuickRecordModal, { type RecordType } from '@/components/QuickRecordModal';
import RecordItem from '@/components/RecordItem';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatDateLong, getTodayKey } from '@/utils/date';
import { getProgressStatus, getDailyMetrics } from '@/utils/calc';
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

  const todayKey = getTodayKey();
  const todayMetrics = useMemo(
    () => getDailyMetrics(records, todayKey),
    [records, todayKey]
  );

  const userName = settings.userName?.trim() || '肾友';

  const [recordModal, setRecordModal] = useState<{ open: boolean; type: RecordType | null }>({
    open: false,
    type: null,
  });

  const openRecord = (type: RecordType) => setRecordModal({ open: true, type });
  const closeRecord = () => setRecordModal({ open: false, type: null });

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

  // 干体重 & 体液增长
  const dryWeight = settings.dryWeight > 0 ? settings.dryWeight : null;
  const fluidGain = dryWeight && todayMetrics.latestWeight > 0
    ? todayMetrics.latestWeight - dryWeight
    : null;
  const fluidGainWarning = fluidGain !== null && fluidGain >= 2;
  const fluidGainAlert = fluidGain !== null && fluidGain >= 3;

  // 健康指标智能预警
  const healthAlerts = useMemo(() => {
    const alerts: { title: string; message: string; severity: 'warning' | 'danger'; icon: React.ReactNode }[] = [];

    // 摄水量超限
    if (todayMetrics.water > settings.dailyWaterLimit) {
      alerts.push({
        title: '摄水量超标',
        message: `今日已摄入 ${todayMetrics.water} ml，超过限额 ${settings.dailyWaterLimit} ml`,
        severity: 'danger',
        icon: <Droplets className="h-4 w-4" />,
      });
    } else if (todayMetrics.water > settings.dailyWaterLimit * 0.85) {
      alerts.push({
        title: '摄水量接近限额',
        message: `已摄入 ${todayMetrics.water} ml，剩余 ${settings.dailyWaterLimit - todayMetrics.water} ml`,
        severity: 'warning',
        icon: <Droplets className="h-4 w-4" />,
      });
    }

    // 体重涨幅超标
    if (fluidGainAlert) {
      alerts.push({
        title: '体重严重超标',
        message: `体液增长 ${fluidGain!.toFixed(1)} kg，请立即联系医生`,
        severity: 'danger',
        icon: <ShieldAlert className="h-4 w-4" />,
      });
    } else if (fluidGainWarning) {
      alerts.push({
        title: '体重涨幅超标',
        message: `体液增长 ${fluidGain!.toFixed(1)} kg，请注意控水`,
        severity: 'warning',
        icon: <Scale className="h-4 w-4" />,
      });
    }

    // 血压异常
    if (todayMetrics.latestSystolic > 0 && todayMetrics.latestDiastolic > 0) {
      if (todayMetrics.latestSystolic >= 160 || todayMetrics.latestDiastolic >= 100) {
        alerts.push({
          title: '血压偏高（危险）',
          message: `血压 ${todayMetrics.latestSystolic}/${todayMetrics.latestDiastolic} mmHg，请及时就医`,
          severity: 'danger',
          icon: <Heart className="h-4 w-4" />,
        });
      } else if (todayMetrics.latestSystolic >= 140 || todayMetrics.latestDiastolic >= 90) {
        alerts.push({
          title: '血压偏高',
          message: `血压 ${todayMetrics.latestSystolic}/${todayMetrics.latestDiastolic} mmHg，请注意监测`,
          severity: 'warning',
          icon: <Heart className="h-4 w-4" />,
        });
      } else if (todayMetrics.latestSystolic < 90 || todayMetrics.latestDiastolic < 60) {
        alerts.push({
          title: '血压偏低',
          message: `血压 ${todayMetrics.latestSystolic}/${todayMetrics.latestDiastolic} mmHg，请注意休息`,
          severity: 'warning',
          icon: <Heart className="h-4 w-4" />,
        });
      }
    }

    // 钾摄入超标
    if (todayMetrics.potassium > settings.dailyPotassiumLimit) {
      alerts.push({
        title: '钾摄入超标',
        message: `今日钾摄入 ${todayMetrics.potassium} mg，超过限额 ${settings.dailyPotassiumLimit} mg`,
        severity: 'danger',
        icon: <HeartPulse className="h-4 w-4" />,
      });
    }

    // 磷摄入超标
    if (todayMetrics.phosphorus > settings.dailyPhosphorusLimit) {
      alerts.push({
        title: '磷摄入超标',
        message: `今日磷摄入 ${todayMetrics.phosphorus} mg，超过限额 ${settings.dailyPhosphorusLimit} mg`,
        severity: 'warning',
        icon: <Bone className="h-4 w-4" />,
      });
    }

    return alerts;
  }, [todayMetrics, settings, fluidGain, fluidGainWarning, fluidGainAlert]);

  const overviewItems = [
    { label: '饮水', value: todayMetrics.water, unit: 'ml', icon: <Droplets className="h-3 w-3" />, limit: settings.dailyWaterLimit, current: todayMetrics.water },
    { label: '超滤', value: todayMetrics.ultrafiltration, unit: 'ml', icon: <Gauge className="h-3 w-3" />, limit: 2500, current: todayMetrics.ultrafiltration },
    { label: '水果', value: gToKgNum(todayMetrics.fruit), unit: 'kg', icon: <Citrus className="h-3 w-3" />, limit: settings.dailyFruitLimit / 1000, current: todayMetrics.fruit / 1000 },
    { label: '钾', value: todayMetrics.potassium, unit: 'mg', icon: <HeartPulse className="h-3 w-3" />, limit: settings.dailyPotassiumLimit, current: todayMetrics.potassium },
    { label: '磷', value: todayMetrics.phosphorus, unit: 'mg', icon: <Bone className="h-3 w-3" />, limit: settings.dailyPhosphorusLimit, current: todayMetrics.phosphorus },
    { label: '钠', value: todayMetrics.sodium, unit: 'mg', icon: <Soup className="h-3 w-3" />, limit: settings.dailySodiumLimit, current: todayMetrics.sodium },
    { label: '体重', value: todayMetrics.latestWeight > 0 ? todayMetrics.latestWeight.toFixed(1) : '--', unit: 'kg', icon: <Scale className="h-3 w-3" />, limit: 0, current: 0 },
    { label: '血压', value: todayMetrics.latestSystolic > 0 && todayMetrics.latestDiastolic > 0 ? `${todayMetrics.latestSystolic}/${todayMetrics.latestDiastolic}` : '--/--', unit: '', icon: <Heart className="h-3 w-3" />, limit: 0, current: 0 },
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
        <div
          className={cn(
            'glass-card relative overflow-hidden rounded-[24px] p-4 cursor-pointer',
            fluidGainAlert && 'ring-2 ring-clay-400/60'
          )}
          onClick={() => openRecord('weight')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRecord('weight'); } }}
        >
          <div className={cn('glass-orb -right-4 -top-4 h-20 w-20', fluidGainAlert ? 'bg-clay-300/25' : 'bg-indigo-300/15')} />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-600/60">
              <Scale className="h-3.5 w-3.5" />
              体重
            </div>
            <div className="mt-1.5">
              <span className={cn('text-xl font-bold', fluidGainAlert ? 'text-clay-600' : 'text-indigo-700')}>
                {todayMetrics.latestWeight > 0 ? todayMetrics.latestWeight.toFixed(1) : '--'}
              </span>
              <span className="ml-0.5 text-xs text-indigo-600/40">kg</span>
            </div>
            {dryWeight && todayMetrics.latestWeight > 0 && fluidGain !== null && (
              <div className="mt-0.5">
                {fluidGain >= 3 ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-clay-600">
                    <AlertTriangle className="h-3 w-3" />
                    超干体重 {fluidGain.toFixed(1)} kg
                  </span>
                ) : fluidGain >= 2 ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                    <ArrowUp className="h-3 w-3" />
                    高于干体重 {fluidGain.toFixed(1)} kg
                  </span>
                ) : fluidGain > 0 ? (
                  <span className="text-[10px] text-indigo-600/50">
                    干体重 {dryWeight.toFixed(1)} kg
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[10px] text-sage-600">
                    <Minus className="h-3 w-3" />
                    已达干体重
                  </span>
                )}
              </div>
            )}
            {dryWeight && todayMetrics.latestWeight <= 0 && (
              <div className="mt-0.5 text-[10px] text-indigo-600/40">
                干体重 {dryWeight.toFixed(1)} kg
              </div>
            )}
          </div>
        </div>

        {/* 血压 */}
        <div
          className="glass-card relative overflow-hidden rounded-[24px] p-4 cursor-pointer"
          onClick={() => openRecord('bloodPressure')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRecord('bloodPressure'); } }}
        >
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

      {/* 透析日提醒 / 体液增长预警 */}
      {dialysisCountdown?.days === 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card relative overflow-hidden rounded-[24px] p-4"
        >
          <div className="glass-orb -right-6 -top-6 h-24 w-24 bg-teal-300/20" />
          <div className="glass-shimmer" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100/80 text-teal-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-sm font-semibold text-teal-700">今天是透析日</h3>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {['测量体重', '测量血压', '准备透析用品', '确认透析时间'].map((tip) => (
                  <span key={tip} className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-600">
                    {tip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {fluidGainWarning && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'glass-card relative overflow-hidden rounded-[24px] p-4',
            fluidGainAlert ? 'border-l-4 border-clay-400' : 'border-l-4 border-amber-400'
          )}
        >
          <div className={cn('glass-orb -right-4 -top-4 h-20 w-20', fluidGainAlert ? 'bg-clay-300/25' : 'bg-amber-300/20')} />
          <div className="glass-shimmer" />
          <div className="relative z-10 flex items-center gap-3">
            <AlertTriangle className={cn('h-5 w-5 flex-shrink-0', fluidGainAlert ? 'text-clay-500' : 'text-amber-500')} />
            <div>
              <p className={cn('text-sm font-medium', fluidGainAlert ? 'text-clay-700' : 'text-amber-700')}>
                {fluidGainAlert
                  ? `体液增长已达 ${fluidGain!.toFixed(1)} kg，请立即联系医生`
                  : `体液增长 ${fluidGain!.toFixed(1)} kg，请注意控水`}
              </p>
              <p className="mt-0.5 text-[11px] text-teal-600/50">
                干体重 {dryWeight!.toFixed(1)} kg · 当前 {todayMetrics.latestWeight.toFixed(1)} kg
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {/* 健康指标智能预警 */}
      {healthAlerts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card relative overflow-hidden rounded-[24px] p-4"
        >
          <div className="glass-orb -right-6 -top-6 h-24 w-24 bg-red-300/15" />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-amber-500" />
              <h2 className="font-serif text-sm font-semibold text-teal-700">健康预警</h2>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                {healthAlerts.length} 项
              </span>
            </div>
            <div className="space-y-2">
              {healthAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl p-3',
                    alert.severity === 'danger'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-amber-50 border border-amber-200'
                  )}
                >
                  <div className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
                    alert.severity === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  )}>
                    {alert.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'text-xs font-medium',
                      alert.severity === 'danger' ? 'text-red-700' : 'text-amber-700'
                    )}>
                      {alert.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-teal-600/60">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

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
          <p className="mt-1.5 text-[10px] text-teal-600/35">← 左右滑动查看全部 9 项指标 →</p>
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
          onClick={() => openRecord('water')}
        />
        <MetricCard
          title="超滤量"
          icon={<Gauge className="h-4 w-4" />}
          current={todayMetrics.ultrafiltration}
          limit={2500}
          unit="ml"
          theme="teal"
          description="透析当日累计"
          onClick={() => openRecord('ultrafiltration')}
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
          onClick={() => openRecord('fruit')}
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

      {/* 今日记录列表 */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative overflow-hidden rounded-[28px] p-5"
      >
        <div className="glass-orb -left-6 -bottom-6 h-24 w-24 bg-sage-300/18" style={{ animationDelay: '3s' }} />
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-semibold text-teal-700">今日记录</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openRecord('medication')}
                className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-600 hover:bg-teal-100 transition"
              >
                <Pill className="h-3 w-3" />
                记录服药
              </button>
              <span className="whitespace-nowrap rounded-full bg-sage-50 px-2.5 py-0.5 text-[11px] font-medium text-sage-600">
                {todayMetrics.records.length} 条
              </span>
            </div>
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
                <p className="mt-1 text-xs text-teal-600/40">点击指标卡片开始记录</p>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* 统一快速记录弹窗 */}
      <QuickRecordModal
        open={recordModal.open}
        type={recordModal.type}
        onClose={closeRecord}
      />
    </div>
  );
}