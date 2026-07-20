import { motion } from 'framer-motion';
import { Droplets, Activity, Citrus, HeartPulse, Sparkles, TrendingUp } from 'lucide-react';
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
import { getGreeting, formatDateLong } from '@/utils/date';
import { getProgressStatus } from '@/utils/calc';

export default function Dashboard() {
  const todayMetrics = useRecordsStore((s) => s.getTodayMetrics());
  const hourlyDist = useRecordsStore((s) => s.getHourlyDistribution(todayMetrics.date));
  const deleteRecord = useRecordsStore((s) => s.deleteRecord);
  const settings = useSettingsStore((s) => s.settings);

  const userName = settings.userName?.trim() || '肾友';
  const greeting = getGreeting();

  const waterStatus = getProgressStatus(todayMetrics.water, settings.dailyWaterLimit);
  const potassiumStatus = getProgressStatus(
    todayMetrics.potassium,
    settings.dailyPotassiumLimit
  );
  const fruitStatus = getProgressStatus(todayMetrics.fruit, settings.dailyFruitLimit);

  const overallWarning =
    waterStatus === 'exceeded' || potassiumStatus === 'exceeded' || fruitStatus === 'exceeded';

  return (
    <div className="space-y-6">
      {/* 顶部欢迎区 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-teal-600 to-sage-600 p-7 text-white shadow-soft-lg"
      >
        {/* 装饰性圆形 */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-clay-400/20 blur-2xl" />

        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-medium text-teal-100">
            <Sparkles className="h-3.5 w-3.5" />
            {greeting}
          </div>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            你好，{userName}
          </h1>
          <p className="mt-1 text-sm text-teal-100/90">{formatDateLong()}</p>

          {overallWarning ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-clay-400/90 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              <HeartPulse className="h-3.5 w-3.5" />
              今日有指标超标，请控制摄入
            </div>
          ) : (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <TrendingUp className="h-3.5 w-3.5" />
              今日指标控制良好，请继续保持
            </div>
          )}
        </div>
      </motion.section>

      {/* 指标卡片区 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <MetricCard
            title="摄水量"
            icon={<Droplets className="h-4 w-4" />}
            current={todayMetrics.water}
            limit={settings.dailyWaterLimit}
            unit="ml"
            theme="teal"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <MetricCard
            title="超滤量"
            icon={<Activity className="h-4 w-4" />}
            current={todayMetrics.ultrafiltration}
            limit={settings.dailyUltrafiltrationTarget}
            unit="ml"
            theme="clay"
            inverseProgress
            description="透析当日累计超滤量"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <MetricCard
            title="水果摄入"
            icon={<Citrus className="h-4 w-4" />}
            current={todayMetrics.fruit}
            limit={settings.dailyFruitLimit}
            unit="g"
            theme="sage"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <MetricCard
            title="钾摄入"
            icon={<HeartPulse className="h-4 w-4" />}
            current={todayMetrics.potassium}
            limit={settings.dailyPotassiumLimit}
            unit="mg"
            theme="clay"
            description="钾元素需严格控制"
          />
        </motion.div>
      </section>

      {/* 快速记录区 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WaterQuickRecord />
        <UltrafiltrationQuickRecord />
        <FruitQuickRecord />
      </section>

      {/* 主体内容两栏 */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 时段分布图 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="lg:col-span-3 rounded-3xl border border-cream-300 bg-white/70 p-6 shadow-soft"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-teal-700">
                饮水时段分布
              </h2>
              <p className="mt-1 text-xs text-teal-600/60">查看今日饮水节奏</p>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-600">
              合计 {todayMetrics.water} ml
            </span>
          </div>

          <div className="mt-6 h-64">
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
        </motion.div>

        {/* 今日记录列表 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="lg:col-span-2 rounded-3xl border border-cream-300 bg-white/70 p-6 shadow-soft"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-teal-700">今日记录</h2>
            <span className="rounded-full bg-sage-50 px-3 py-1 text-xs font-medium text-sage-600">
              {todayMetrics.records.length} 条
            </span>
          </div>

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
            {todayMetrics.records.length > 0 ? (
              todayMetrics.records.map((r) => (
                <RecordItem key={r.id} record={r} onDelete={deleteRecord} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100">
                  <Droplets className="h-6 w-6 text-teal-600/40" />
                </div>
                <p className="mt-3 text-sm text-teal-600/60">今日还没有记录</p>
                <p className="text-xs text-teal-600/40">点击上方卡片开始记录</p>
              </div>
            )}
          </div>
        </motion.div>
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
