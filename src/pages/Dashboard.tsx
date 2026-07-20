import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Activity, Citrus, HeartPulse, Sparkles, TrendingUp, Atom, Waves } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import MetricCard from '@/components/MetricCard';
import {
  WaterQuickRecord,
  UltrafiltrationQuickRecord,
  FruitQuickRecord,
} from '@/components/QuickRecordCard';
import RecordItem from '@/components/RecordItem';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getGreeting, formatDateLong, getTodayKey } from '@/utils/date';
import { getProgressStatus, getDailyMetrics, getHourlyDistribution } from '@/utils/calc';

// 将克转为 kg 显示字符串
function gToKg(g: number): string {
  const kg = g / 1000;
  return `${kg.toFixed(2).replace(/\.?0+$/, '')} kg`;
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
  const hourlyDist = useMemo(
    () => getHourlyDistribution(records, todayKey),
    [records, todayKey]
  );

  const userName = settings.userName?.trim() || '肾友';
  const greeting = getGreeting();

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

  return (
    <div className="space-y-4">
      {/* 顶部欢迎区（紧凑） */}
      <motion.section
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-sage-600 p-5 text-white shadow-soft-lg"
      >
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-teal-100">
              <Sparkles className="h-3 w-3" />
              {greeting}
            </div>
            <h1 className="mt-1 font-serif text-2xl font-semibold leading-tight">
              你好，{userName}
            </h1>
            <p className="mt-0.5 text-xs text-teal-100/90">{formatDateLong()}</p>
          </div>
          {overallWarning ? (
            <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-clay-400/90 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              <HeartPulse className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">有指标超标</span>
            </div>
          ) : (
            <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">控制良好</span>
            </div>
          )}
        </div>
      </motion.section>

      {/* 指标卡片区（紧凑：6 列 → 移动端 2 列） */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
          icon={<Activity className="h-4 w-4" />}
          current={todayMetrics.ultrafiltration}
          limit={settings.dailyUltrafiltrationTarget}
          unit="ml"
          theme="clay"
          inverseProgress
          description="透析当日累计"
        />
        <MetricCard
          title="水果摄入"
          icon={<Citrus className="h-4 w-4" />}
          current={todayMetrics.fruit}
          limit={settings.dailyFruitLimit}
          unit="g"
          displayValue={gToKg(todayMetrics.fruit)}
          displayUnit="kg"
          displayLimit={gToKg(settings.dailyFruitLimit)}
          theme="sage"
          description={todayMetrics.fruitWater > 0 ? `贡献水分 ${todayMetrics.fruitWater} ml` : undefined}
        />
        <MetricCard
          title="钾摄入"
          icon={<HeartPulse className="h-4 w-4" />}
          current={todayMetrics.potassium}
          limit={settings.dailyPotassiumLimit}
          unit="mg"
          theme="clay"
          description="影响心律"
        />
        <MetricCard
          title="磷摄入"
          icon={<Atom className="h-4 w-4" />}
          current={todayMetrics.phosphorus}
          limit={settings.dailyPhosphorusLimit}
          unit="mg"
          theme="sage"
          description="过量致瘙痒"
        />
        <MetricCard
          title="钠摄入"
          icon={<Waves className="h-4 w-4" />}
          current={todayMetrics.sodium}
          limit={settings.dailySodiumLimit}
          unit="mg"
          theme="teal"
          description="影响血压"
        />
      </section>

      {/* 快速记录区（紧凑） */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <WaterQuickRecord />
        <UltrafiltrationQuickRecord />
        <FruitQuickRecord />
      </section>

      {/* 主体内容两栏（紧凑高度） */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* 时段分布图 */}
        <div className="lg:col-span-3 rounded-2xl border border-cream-300 bg-white/70 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base font-semibold text-teal-700">
                饮水时段分布
              </h2>
              <p className="mt-0.5 text-[11px] text-teal-600/60">查看今日饮水节奏</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="whitespace-nowrap rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-600">
                合计 {todayMetrics.water} ml
              </span>
              {todayMetrics.fruitWater > 0 && (
                <span className="whitespace-nowrap rounded-full bg-sage-50 px-2.5 py-0.5 text-[10px] font-medium text-sage-600">
                  含水果水 {todayMetrics.fruitWater} ml
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 h-48">
            {todayMetrics.water > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyDist} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis
                    dataKey="hour"
                    stroke="#9DB9A2"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#9DB9A2" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(45, 95, 93, 0.05)' }}
                    contentStyle={{
                      background: '#FDFBF7',
                      border: '1px solid #E8E0D5',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#234A48',
                    }}
                    formatter={(value: number) => [`${value} ml`, '饮水']}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {hourlyDist.map((entry, i) => {
                      const isPeak = entry.amount > 0 && entry.amount === Math.max(...hourlyDist.map((d) => d.amount));
                      return (
                        <Cell
                          key={i}
                          fill={isPeak ? '#2D5F5D' : '#7A9B7E'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="今日暂无饮水记录" />
            )}
          </div>
        </div>

        {/* 今日记录列表（紧凑高度） */}
        <div className="lg:col-span-2 rounded-2xl border border-cream-300 bg-white/70 p-5 shadow-soft">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100">
                  <Droplets className="h-5 w-5 text-teal-600/40" />
                </div>
                <p className="mt-2 text-xs text-teal-600/60">今日还没有记录</p>
                <p className="text-[10px] text-teal-600/40">点击上方卡片开始记录</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100">
        <TrendingUp className="h-6 w-6 text-teal-600/40" />
      </div>
      <p className="mt-3 text-sm text-teal-600/60">{message}</p>
    </div>
  );
}
