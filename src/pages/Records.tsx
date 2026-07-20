import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Calendar, TrendingUp, ChevronRight, X, Droplets, Activity } from 'lucide-react';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getRecentDays, formatDateFriendly, formatDateOnly } from '@/utils/date';
import { getRangeMetrics as calcRangeMetrics } from '@/utils/calc';
import RecordItem from '@/components/RecordItem';
import { cn } from '@/lib/utils';
import type { DailyMetrics } from '@/types';

type Range = 7 | 30;

export default function Records() {
  const [range, setRange] = useState<Range>(7);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const records = useRecordsStore((s) => s.records);
  const deleteRecord = useRecordsStore((s) => s.deleteRecord);
  const settings = useSettingsStore((s) => s.settings);

  const dateKeys = useMemo(() => getRecentDays(range), [range]);
  const metrics = useMemo(
    () => calcRangeMetrics(records, dateKeys),
    [records, dateKeys]
  );

  // 折线图数据
  const trendData = metrics.map((m) => ({
    date: formatDateFriendly(m.date),
    shortDate: m.date.slice(5).replace('-', '/'),
    water: m.water,
    ultrafiltration: m.ultrafiltration,
    potassium: m.potassium,
    phosphorus: m.phosphorus,
    sodium: m.sodium,
    fruit: m.fruit,
  }));

  // 选中日期
  const selectedMetrics = selectedDate
    ? metrics.find((m) => m.date === selectedDate)
    : null;

  // 倒序历史
  const historyMetrics = [...metrics].reverse();

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <h1 className="font-serif text-3xl font-semibold text-teal-700">记录中心</h1>
          <p className="mt-1 text-sm text-teal-600/60">查看历史数据与趋势</p>
        </div>

        {/* 时间范围切换 */}
        <div className="inline-flex rounded-2xl border border-cream-300 bg-cream-50 p-1">
          {[7, 30].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r as Range)}
              className={cn(
                'rounded-xl px-4 py-1.5 text-sm font-medium transition',
                range === r
                  ? 'bg-teal-500 text-white shadow-soft'
                  : 'text-teal-600 hover:bg-teal-100'
              )}
            >
              {r === 7 ? '近 7 天' : '近 30 天'}
            </button>
          ))}
        </div>
      </motion.header>

      {/* 趋势图：摄水量 vs 超滤量 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl border border-cream-300 bg-white/70 p-6 shadow-soft"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-teal-700">摄水量 vs 超滤量</h2>
            <p className="mt-1 text-xs text-teal-600/60">对比每日摄入与排出</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-teal-600">
              <span className="h-2 w-2 rounded-full bg-teal-500" />摄水量
            </span>
            <span className="flex items-center gap-1.5 text-clay-600">
              <span className="h-2 w-2 rounded-full bg-clay-400" />超滤量
            </span>
          </div>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid stroke="#E8E0D5" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="shortDate"
                stroke="#9DB9A2"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#9DB9A2" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#FDFBF7',
                  border: '1px solid #E8E0D5',
                  borderRadius: 12,
                  fontSize: 12,
                  color: '#234A48',
                }}
                formatter={(value: number, name: string) => [`${value} ml`, name]}
              />
              <ReferenceLine
                y={settings.dailyWaterLimit}
                stroke="#D97757"
                strokeDasharray="4 4"
                label={{
                  value: '限额',
                  position: 'right',
                  fill: '#D97757',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="water"
                name="摄水量"
                stroke="#2D5F5D"
                strokeWidth={2.5}
                dot={{ fill: '#2D5F5D', r: 3 }}
                activeDot={{ r: 5, fill: '#2D5F5D' }}
              />
              <Line
                type="monotone"
                dataKey="ultrafiltration"
                name="超滤量"
                stroke="#D97757"
                strokeWidth={2.5}
                dot={{ fill: '#D97757', r: 3 }}
                activeDot={{ r: 5, fill: '#D97757' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* 元素摄入柱状图（钾 / 磷 / 钠 切换） */}
      <ElementBarSection
        trendData={trendData}
        potassiumLimit={settings.dailyPotassiumLimit}
        phosphorusLimit={settings.dailyPhosphorusLimit}
        sodiumLimit={settings.dailySodiumLimit}
      />

      {/* 历史记录列表 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-3xl border border-cream-300 bg-white/70 p-6 shadow-soft"
      >
        <h2 className="font-serif text-lg font-semibold text-teal-700">历史记录</h2>
        <p className="mt-1 text-xs text-teal-600/60">点击查看每日详情</p>

        <div className="mt-4 space-y-2">
          {historyMetrics.map((m) => (
            <DayHistoryCard
              key={m.date}
              metrics={m}
              waterLimit={settings.dailyWaterLimit}
              potassiumLimit={settings.dailyPotassiumLimit}
              phosphorusLimit={settings.dailyPhosphorusLimit}
              sodiumLimit={settings.dailySodiumLimit}
              onClick={() => setSelectedDate(m.date)}
            />
          ))}
        </div>
      </motion.section>

      {/* 详情抽屉 */}
      {selectedMetrics && (
        <DayDetailDrawer
          metrics={selectedMetrics}
          onClose={() => setSelectedDate(null)}
          onDelete={deleteRecord}
        />
      )}
    </div>
  );
}

// 单日历史卡片
function DayHistoryCard({
  metrics,
  waterLimit,
  potassiumLimit,
  phosphorusLimit,
  sodiumLimit,
  onClick,
}: {
  metrics: DailyMetrics;
  waterLimit: number;
  potassiumLimit: number;
  phosphorusLimit: number;
  sodiumLimit: number;
  onClick: () => void;
}) {
  const waterExceeded = metrics.water > waterLimit;
  const potExceeded = metrics.potassium > potassiumLimit;
  const phoExceeded = metrics.phosphorus > phosphorusLimit;
  const sodExceeded = metrics.sodium > sodiumLimit;

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-cream-200 bg-white/60 px-4 py-3.5 text-left transition hover:border-teal-300 hover:bg-white"
    >
      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-sage-50">
        <Calendar className="h-4 w-4 text-teal-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-teal-700">{formatDateOnly(metrics.date)}</span>
          {metrics.records.length === 0 && (
            <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] text-teal-600/60">
              无记录
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-teal-600/70">
          <span className={cn('flex items-center gap-0.5', waterExceeded && 'text-red-500')}>
            <Droplets className="h-3 w-3" />
            水 {metrics.water} ml
          </span>
          <span className="flex items-center gap-0.5 text-clay-600/80">
            <Activity className="h-3 w-3" />
            超滤 {metrics.ultrafiltration} ml
          </span>
          <span>果 {metrics.fruit} g</span>
          <span className={cn('flex items-center gap-0.5', potExceeded && 'text-red-500')}>
            钾 {metrics.potassium}
          </span>
          <span className={cn('flex items-center gap-0.5', phoExceeded && 'text-red-500')}>
            磷 {metrics.phosphorus}
          </span>
          <span className={cn('flex items-center gap-0.5', sodExceeded && 'text-red-500')}>
            钠 {metrics.sodium}
          </span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-teal-600/30 transition group-hover:translate-x-0.5 group-hover:text-teal-600" />
    </button>
  );
}

// 详情抽屉
function DayDetailDrawer({
  metrics,
  onClose,
  onDelete,
}: {
  metrics: DailyMetrics;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-teal-700/40 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-full w-full max-w-md flex-col bg-cream-50 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-cream-200 p-4">
          <div>
            <h3 className="font-serif text-lg font-semibold text-teal-700">
              {formatDateOnly(metrics.date)}
            </h3>
            <p className="text-xs text-teal-600/60">{metrics.records.length} 条记录</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-teal-600 hover:bg-cream-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 概览 */}
        <div className="grid grid-cols-2 gap-2 p-4">
          <SummaryItem label="摄水量" value={metrics.water} unit="ml" />
          <SummaryItem label="超滤量" value={metrics.ultrafiltration} unit="ml" />
          <SummaryItem label="水果摄入" value={metrics.fruit} unit="g" />
          <SummaryItem label="钾摄入" value={metrics.potassium} unit="mg" />
          <SummaryItem label="磷摄入" value={metrics.phosphorus} unit="mg" />
          <SummaryItem label="钠摄入" value={metrics.sodium} unit="mg" />
        </div>

        {/* 详情列表 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {metrics.records.length > 0 ? (
            <div className="space-y-2">
              {metrics.records.map((r) => (
                <RecordItem key={r.id} record={r} onDelete={onDelete} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-200">
                <TrendingUp className="h-6 w-6 text-teal-600/40" />
              </div>
              <p className="mt-3 text-sm text-teal-600/60">这一天没有记录</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white/70 p-3">
      <div className="text-[10px] text-teal-600/60">{label}</div>
      <div className="mt-0.5 font-medium text-teal-700">
        {value} <span className="text-[10px] text-teal-600/60">{unit}</span>
      </div>
    </div>
  );
}

// 元素柱状图（钾 / 磷 / 钠 切换）
type ElementKey = 'potassium' | 'phosphorus' | 'sodium';
const ELEMENT_META: Record<ElementKey, { label: string; color: string; unit: string }> = {
  potassium: { label: '钾', color: '#7A9B7E', unit: 'mg' },
  phosphorus: { label: '磷', color: '#D97757', unit: 'mg' },
  sodium: { label: '钠', color: '#3B7A7C', unit: 'mg' },
};

function ElementBarSection({
  trendData,
  potassiumLimit,
  phosphorusLimit,
  sodiumLimit,
}: {
  trendData: Array<{ shortDate: string; potassium: number; phosphorus: number; sodium: number }>;
  potassiumLimit: number;
  phosphorusLimit: number;
  sodiumLimit: number;
}) {
  const [active, setActive] = useState<ElementKey>('potassium');
  const limitMap: Record<ElementKey, number> = {
    potassium: potassiumLimit,
    phosphorus: phosphorusLimit,
    sodium: sodiumLimit,
  };
  const currentLimit = limitMap[active];
  const meta = ELEMENT_META[active];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-3xl border border-cream-300 bg-white/70 p-6 shadow-soft"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-teal-700">每日{meta.label}摄入量</h2>
          <p className="mt-1 text-xs text-teal-600/60">红色表示当日已超标</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-cream-100 p-0.5">
            {(Object.keys(ELEMENT_META) as ElementKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setActive(k)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  active === k
                    ? 'bg-white text-teal-700 shadow-soft'
                    : 'text-teal-600/60 hover:text-teal-700'
                )}
              >
                {ELEMENT_META[k].label}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-cream-50 px-3 py-1 text-xs font-medium text-teal-600">
            限额 {currentLimit} mg/日
          </span>
        </div>
      </div>
      <div className="mt-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <CartesianGrid stroke="#E8E0D5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="shortDate"
              stroke="#9DB9A2"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="#9DB9A2" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(217, 119, 87, 0.05)' }}
              contentStyle={{
                background: '#FDFBF7',
                border: '1px solid #E8E0D5',
                borderRadius: 12,
                fontSize: 12,
                color: '#234A48',
              }}
              formatter={(value: number) => [`${value} mg`, `${meta.label}摄入`]}
            />
            <ReferenceLine y={currentLimit} stroke="#EF4444" strokeDasharray="4 4" />
            <Bar dataKey={active} radius={[6, 6, 0, 0]}>
              {trendData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry[active] > currentLimit ? '#EF4444' : meta.color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

