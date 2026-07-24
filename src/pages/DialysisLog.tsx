/**
 * 透析专项日志系统
 *
 * 支持录入每次透析相关信息：
 * - 透析日期、时长、血管通路类型、透析器型号
 * - 透析前后体重、超滤量
 * - 透析中血压、心率
 * - 不适症状登记（抽筋、低血压、胃痛、乏力等12种）
 * - 历史记录查看与症状趋势分析
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope, Plus, X, Calendar, Clock, Scale, Heart, Activity,
  ChevronRight, AlertTriangle, CheckCircle2, Trash2, TrendingUp,
  ClipboardList, Droplets, Timer, Zap, Syringe,
} from 'lucide-react';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatDateOnly, formatDateFriendly, getTodayKey, toDateKey } from '@/utils/date';
import { cn } from '@/lib/utils';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { DialysisLogRecord, DialysisSymptom } from '@/types';
import { SYMPTOM_LABELS, SYMPTOM_EMOJIS } from '@/types';

const ALL_SYMPTOMS: DialysisSymptom[] = [
  'cramps', 'hypotension', 'stomachPain', 'fatigue', 'headache', 'nausea',
  'chestTightness', 'dizziness', 'itching', 'musclePain', 'insomnia', 'other',
];

const ACCESS_TYPES = ['自体动静脉内瘘', '人造血管内瘘', '颈内静脉导管', '股静脉导管', '其他'];

export default function DialysisLog() {
  const records = useRecordsStore((s) => s.records);
  const deleteRecord = useRecordsStore((s) => s.deleteRecord);
  const settings = useSettingsStore((s) => s.settings);

  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<DialysisLogRecord | null>(null);

  // 筛选透析日志记录
  const dialysisLogs = useMemo(() => {
    return records
      .filter((r): r is DialysisLogRecord => r.type === 'dialysisLog')
      .sort((a, b) => b.dialysisDate - a.dialysisDate);
  }, [records]);

  // 症状统计
  const symptomStats = useMemo(() => {
    const stats: Record<DialysisSymptom, number> = {} as Record<DialysisSymptom, number>;
    ALL_SYMPTOMS.forEach((s) => (stats[s] = 0));
    dialysisLogs.forEach((log) => {
      log.symptoms.forEach((s) => {
        stats[s] = (stats[s] || 0) + 1;
      });
    });
    return stats;
  }, [dialysisLogs]);

  useLockBodyScroll(showForm || !!selectedLog);

  // 体重变化趋势数据
  const weightTrend = useMemo(() => {
    return [...dialysisLogs].reverse().map((log) => ({
      date: formatDateOnly(toDateKey(log.dialysisDate)),
      preWeight: log.preWeight,
      postWeight: log.postWeight,
      diff: Math.round((log.preWeight - log.postWeight) * 10) / 10,
    }));
  }, [dialysisLogs]);

  // 干体重比较
  const dryWeight = settings.dryWeight > 0 ? settings.dryWeight : null;
  const latestLog = dialysisLogs[0];

  return (
    <div className="space-y-5">
      {/* 页头 */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="glass-tile flex h-10 w-10 items-center justify-center rounded-2xl text-purple-600">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-semibold text-teal-700">透析日志</h1>
            <p className="text-xs text-teal-600/60">
              {dialysisLogs.length > 0
                ? `共 ${dialysisLogs.length} 次透析记录`
                : '记录每次透析情况'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="glass-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-teal-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          记录
        </button>
      </motion.header>

      {/* 最近一次透析概览 */}
      {latestLog && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card relative overflow-hidden rounded-[24px] p-5"
        >
          <div className="glass-orb -right-6 -top-6 h-24 w-24 bg-purple-300/15" />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <h2 className="font-serif text-base font-semibold text-teal-700">最近透析</h2>
            <p className="mt-0.5 text-xs text-teal-600/60">
              {formatDateFriendly(toDateKey(latestLog.dialysisDate))}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <LogStatCard
                icon={<Timer className="h-4 w-4" />}
                label="透析时长"
                value={`${latestLog.duration} 分钟`}
                color="text-teal-600"
              />
              <LogStatCard
                icon={<Scale className="h-4 w-4" />}
                label="体重变化"
                value={`${latestLog.preWeight}→${latestLog.postWeight} kg`}
                sub={`差值 ${(latestLog.preWeight - latestLog.postWeight).toFixed(1)} kg`}
                color="text-indigo-600"
              />
              <LogStatCard
                icon={<Droplets className="h-4 w-4" />}
                label="超滤量"
                value={`${latestLog.ultrafiltrationVolume} ml`}
                color="text-cyan-600"
              />
              <LogStatCard
                icon={<Heart className="h-4 w-4" />}
                label="透析中血压"
                value={`${latestLog.systolic}/${latestLog.diastolic}`}
                sub={`心率 ${latestLog.heartRate} bpm`}
                color="text-red-600"
              />
            </div>
            {latestLog.symptoms.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-amber-600">不适症状：</span>
                {latestLog.symptoms.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                  >
                    {SYMPTOM_EMOJIS[s]} {SYMPTOM_LABELS[s]}
                  </span>
                ))}
              </div>
            )}
            {dryWeight && (
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <span className="text-teal-600/50">干体重：{dryWeight} kg</span>
                <span className="text-teal-600/30">·</span>
                <span className={cn(
                  latestLog.postWeight > dryWeight ? 'text-amber-600' : 'text-sage-600'
                )}>
                  透析后体重{latestLog.postWeight > dryWeight ? '高于' : '已达到'}干体重
                </span>
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* 症状统计 */}
      {dialysisLogs.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card relative overflow-hidden rounded-[24px] p-5"
        >
          <div className="glass-orb -left-6 -bottom-6 h-20 w-20 bg-amber-300/15" />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <h2 className="font-serif text-base font-semibold text-teal-700">症状统计</h2>
              <span className="text-xs text-teal-600/50">（共 {dialysisLogs.length} 次）</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_SYMPTOMS.filter((s) => symptomStats[s] > 0).map((s) => {
                const count = symptomStats[s];
                const ratio = Math.round((count / dialysisLogs.length) * 100);
                return (
                  <div
                    key={s}
                    className={cn(
                      'glass-tile flex items-center gap-1.5 rounded-xl px-3 py-1.5',
                      ratio >= 50 ? 'bg-amber-50' : ''
                    )}
                  >
                    <span className="text-sm">{SYMPTOM_EMOJIS[s]}</span>
                    <span className="text-xs font-medium text-teal-700">{SYMPTOM_LABELS[s]}</span>
                    <span className={cn(
                      'text-[10px] font-medium',
                      ratio >= 50 ? 'text-amber-600' : 'text-teal-600/50'
                    )}>
                      {count}次 ({ratio}%)
                    </span>
                  </div>
                );
              })}
              {ALL_SYMPTOMS.every((s) => symptomStats[s] === 0) && (
                <p className="text-xs text-teal-600/50">暂无不适症状记录</p>
              )}
            </div>
          </div>
        </motion.section>
      )}

      {/* 体重变化趋势 */}
      {weightTrend.length >= 2 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card relative overflow-hidden rounded-[24px] p-5"
        >
          <div className="glass-orb -right-6 -top-6 h-20 w-20 bg-indigo-300/15" />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <h2 className="font-serif text-base font-semibold text-teal-700">体重变化趋势</h2>
            <p className="mt-0.5 text-xs text-teal-600/60">历次透析前后体重对比</p>
            <div className="mt-4 space-y-2">
              {weightTrend.map((item, i) => (
                <div key={i} className="glass-tile flex items-center gap-3 rounded-xl px-4 py-2.5">
                  <span className="w-20 text-xs font-medium text-teal-600">{item.date}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-xs text-teal-700 font-medium">{item.preWeight}</span>
                    <span className="text-[10px] text-teal-600/40">→</span>
                    <span className="text-xs text-teal-700 font-medium">{item.postWeight}</span>
                    <span className="text-[10px] text-teal-600/40">kg</span>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    item.diff >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-teal-50 text-teal-600'
                  )}>
                    -{item.diff} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* 历史记录列表 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card relative overflow-hidden rounded-[24px] p-5"
      >
        <div className="glass-orb -right-6 -bottom-6 h-20 w-20 bg-teal-300/15" />
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-teal-500" />
            <h2 className="font-serif text-base font-semibold text-teal-700">全部记录</h2>
          </div>

          {dialysisLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="glass-tile flex h-14 w-14 items-center justify-center rounded-2xl">
                <Stethoscope className="h-6 w-6 text-teal-600/25" />
              </div>
              <p className="mt-3 text-sm text-teal-600/60">暂无透析记录</p>
              <p className="mt-1 text-xs text-teal-600/40">点击右上角「记录」开始录入</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {dialysisLogs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="glass-tile group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:border-purple-300 hover:shadow-soft"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-teal-700">
                        {formatDateFriendly(toDateKey(log.dialysisDate))}
                      </span>
                      {log.symptoms.length > 0 && (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600">
                          {log.symptoms.length} 症状
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-teal-600/60">
                      <span>{log.duration}分钟</span>
                      <span>超滤{log.ultrafiltrationVolume}ml</span>
                      <span>体重{log.preWeight}→{log.postWeight}kg</span>
                      <span>BP {log.systolic}/{log.diastolic}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-teal-600/30 transition group-hover:translate-x-0.5 group-hover:text-teal-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* 录入表单 */}
      <AnimatePresence>
        {showForm && (
          <DialysisLogForm
            onClose={() => setShowForm(false)}
            dryWeight={dryWeight}
          />
        )}
      </AnimatePresence>

      {/* 详情抽屉 */}
      <AnimatePresence>
        {selectedLog && (
          <LogDetailDrawer
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
            onDelete={(id) => {
              deleteRecord(id);
              setSelectedLog(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
 * 录入表单
 * ================================================================ */
function DialysisLogForm({
  onClose,
  dryWeight,
}: {
  onClose: () => void;
  dryWeight: number | null;
}) {
  const addDialysisLogRecord = useRecordsStore((s) => s.addDialysisLogRecord);

  const today = new Date();
  const [dialysisDate, setDialysisDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [preWeight, setPreWeight] = useState('');
  const [postWeight, setPostWeight] = useState('');
  const [ultrafiltrationVolume, setUltrafiltrationVolume] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [symptoms, setSymptoms] = useState<DialysisSymptom[]>([]);
  const [symptomNote, setSymptomNote] = useState('');
  const [overallNote, setOverallNote] = useState('');
  const [accessType, setAccessType] = useState('');
  const [dialyzerModel, setDialyzerModel] = useState('');

  const toggleSymptom = (s: DialysisSymptom) => {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const calcDuration = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let mins = (eh - sh) * 60 + (em - sm);
    if (mins < 0) mins += 24 * 60;
    return mins;
  };

  const handleSubmit = () => {
    const dateTs = new Date(dialysisDate + 'T00:00:00').getTime();
    const duration = calcDuration();
    if (duration <= 0) return;

    addDialysisLogRecord({
      dialysisDate: dateTs,
      duration,
      preWeight: Number(preWeight) || 0,
      postWeight: Number(postWeight) || 0,
      ultrafiltrationVolume: Number(ultrafiltrationVolume) || 0,
      systolic: Number(systolic) || 0,
      diastolic: Number(diastolic) || 0,
      heartRate: Number(heartRate) || 0,
      symptoms,
      symptomNote: symptomNote.trim() || undefined,
      overallNote: overallNote.trim() || undefined,
      accessType: accessType || undefined,
      dialyzerModel: dialyzerModel.trim() || undefined,
    });
    onClose();
  };

  const isValid = dialysisDate && startTime && endTime && calcDuration() > 0;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[101] max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white/90 backdrop-blur-xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h3 className="text-lg font-semibold text-teal-700">记录透析</h3>
          <button
            onClick={onClose}
            className="glass-tile flex h-8 w-8 items-center justify-center rounded-full text-teal-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-3">
          {/* 透析日期 + 时间 */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="透析日期" icon={<Calendar className="h-3.5 w-3.5" />}>
              <input
                type="date"
                value={dialysisDate}
                onChange={(e) => setDialysisDate(e.target.value)}
                className="glass-tile w-full rounded-xl px-3 py-2.5 text-sm text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
              />
            </FormField>
            <FormField label="开始时间" icon={<Clock className="h-3.5 w-3.5" />}>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="glass-tile w-full rounded-xl px-3 py-2.5 text-sm text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="结束时间" icon={<Clock className="h-3.5 w-3.5" />}>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="glass-tile w-full rounded-xl px-3 py-2.5 text-sm text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
              />
            </FormField>
            <FormField label="时长" icon={<Timer className="h-3.5 w-3.5" />}>
              <div className="glass-tile rounded-xl px-3 py-2.5 text-sm font-medium text-teal-700">
                {calcDuration()} 分钟
              </div>
            </FormField>
          </div>

          {/* 体重 */}
          <div className="rounded-2xl bg-indigo-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium text-teal-700">体重记录</span>
              {dryWeight && (
                <span className="text-[10px] text-teal-600/50">干体重 {dryWeight} kg</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-teal-600/60">透析前 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={preWeight}
                  onChange={(e) => setPreWeight(e.target.value)}
                  placeholder="如 68.5"
                  className="glass-tile mt-1 w-full rounded-lg px-3 py-2 text-sm font-medium text-teal-700 placeholder:text-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                />
              </div>
              <div>
                <label className="text-[10px] text-teal-600/60">透析后 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={postWeight}
                  onChange={(e) => setPostWeight(e.target.value)}
                  placeholder="如 65.5"
                  className="glass-tile mt-1 w-full rounded-lg px-3 py-2 text-sm font-medium text-teal-700 placeholder:text-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                />
              </div>
              <div>
                <label className="text-[10px] text-teal-600/60">差值 (kg)</label>
                <div className="glass-tile mt-1 rounded-lg px-3 py-2 text-sm font-medium text-indigo-600">
                  {preWeight && postWeight
                    ? (Number(preWeight) - Number(postWeight)).toFixed(1)
                    : '--'}
                </div>
              </div>
            </div>
          </div>

          {/* 超滤量 */}
          <FormField label="超滤量" icon={<Droplets className="h-3.5 w-3.5" />}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={ultrafiltrationVolume}
                onChange={(e) => setUltrafiltrationVolume(e.target.value)}
                placeholder="如 2500"
                className="glass-tile flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-teal-700 placeholder:text-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
              />
              <span className="text-xs text-teal-600/60">ml</span>
            </div>
          </FormField>

          {/* 血压 + 心率 */}
          <div className="rounded-2xl bg-red-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-teal-700">透析中血压心率</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-teal-600/60">收缩压</label>
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="如 140"
                  className="glass-tile mt-1 w-full rounded-lg px-3 py-2 text-sm font-medium text-teal-700 placeholder:text-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                />
              </div>
              <div>
                <label className="text-[10px] text-teal-600/60">舒张压</label>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="如 85"
                  className="glass-tile mt-1 w-full rounded-lg px-3 py-2 text-sm font-medium text-teal-700 placeholder:text-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                />
              </div>
              <div>
                <label className="text-[10px] text-teal-600/60">心率</label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="如 72"
                  className="glass-tile mt-1 w-full rounded-lg px-3 py-2 text-sm font-medium text-teal-700 placeholder:text-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                />
              </div>
            </div>
          </div>

          {/* 血管通路 */}
          <FormField label="血管通路类型" icon={<Syringe className="h-3.5 w-3.5" />}>
            <div className="flex flex-wrap gap-2">
              {ACCESS_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setAccessType(accessType === t ? '' : t)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                    accessType === t
                      ? 'border-purple-400 bg-purple-100 text-purple-700'
                      : 'glass-tile text-teal-600 hover:scale-[1.02]'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </FormField>

          {/* 透析器型号 */}
          <FormField label="透析器型号" icon={<Zap className="h-3.5 w-3.5" />}>
            <input
              type="text"
              value={dialyzerModel}
              onChange={(e) => setDialyzerModel(e.target.value)}
              placeholder="如 FX80"
              className="glass-tile w-full rounded-xl px-3 py-2.5 text-sm text-teal-700 placeholder:text-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
            />
          </FormField>

          {/* 不适症状 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-teal-700">不适症状</span>
              <span className="text-[10px] text-teal-600/50">（可多选）</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_SYMPTOMS.map((s) => {
                const selected = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className={cn(
                      'flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                      selected
                        ? 'border-amber-400 bg-amber-100 text-amber-700'
                        : 'glass-tile text-teal-600 hover:scale-[1.02]'
                    )}
                  >
                    <span className="text-sm">{SYMPTOM_EMOJIS[s]}</span>
                    {SYMPTOM_LABELS[s]}
                  </button>
                );
              })}
            </div>
            {symptoms.includes('other') && (
              <input
                type="text"
                value={symptomNote}
                onChange={(e) => setSymptomNote(e.target.value)}
                placeholder="请描述其他症状..."
                className="glass-tile mt-2 w-full rounded-xl px-3 py-2.5 text-sm text-teal-700 placeholder:text-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
              />
            )}
          </div>

          {/* 总体备注 */}
          <FormField label="总体备注" icon={<ClipboardList className="h-3.5 w-3.5" />}>
            <textarea
              value={overallNote}
              onChange={(e) => setOverallNote(e.target.value)}
              placeholder="记录本次透析的总体感受或注意事项..."
              rows={2}
              className="glass-tile w-full rounded-xl px-3 py-2.5 text-sm text-teal-700 placeholder:text-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30 resize-none"
            />
          </FormField>

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 py-3.5 text-sm font-medium text-white shadow-lg shadow-teal-500/20 transition active:scale-[0.98] disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
          >
            保存记录
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ================================================================
 * 详情抽屉
 * ================================================================ */
function LogDetailDrawer({
  log,
  onClose,
  onDelete,
}: {
  log: DialysisLogRecord;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  useLockBodyScroll(true);
  const weightDiff = (log.preWeight - log.postWeight).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-teal-700/40 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card flex h-full w-full max-w-md flex-col overflow-hidden rounded-l-3xl shadow-2xl"
      >
        <div className="glass-shimmer" />
        <div className="relative z-10 flex items-center justify-between border-b border-cream-200 p-4">
          <div>
            <h3 className="font-serif text-lg font-semibold text-teal-700">
              {formatDateFriendly(toDateKey(log.dialysisDate))}
            </h3>
            <p className="text-xs text-teal-600/60">{log.duration} 分钟</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(log.id)}
              className="rounded-full p-1.5 text-red-400 hover:bg-red-50"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-teal-600 hover:bg-cream-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
          {/* 体重 */}
          <DetailSection title="体重变化" icon={<Scale className="h-4 w-4" />}>
            <div className="grid grid-cols-3 gap-2">
              <DetailItem label="透析前" value={`${log.preWeight} kg`} />
              <DetailItem label="透析后" value={`${log.postWeight} kg`} />
              <DetailItem label="差值" value={`-${weightDiff} kg`} highlight />
            </div>
          </DetailSection>

          {/* 超滤 + 血压 */}
          <DetailSection title="透析参数" icon={<Activity className="h-4 w-4" />}>
            <div className="grid grid-cols-2 gap-2">
              <DetailItem label="超滤量" value={`${log.ultrafiltrationVolume} ml`} />
              <DetailItem label="血压" value={`${log.systolic}/${log.diastolic} mmHg`} />
              <DetailItem label="心率" value={`${log.heartRate} bpm`} />
              <DetailItem label="时长" value={`${log.duration} 分钟`} />
            </div>
          </DetailSection>

          {/* 血管通路 + 透析器 */}
          {(log.accessType || log.dialyzerModel) && (
            <DetailSection title="设备信息" icon={<Zap className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-2">
                {log.accessType && <DetailItem label="血管通路" value={log.accessType} />}
                {log.dialyzerModel && <DetailItem label="透析器型号" value={log.dialyzerModel} />}
              </div>
            </DetailSection>
          )}

          {/* 症状 */}
          {log.symptoms.length > 0 && (
            <DetailSection title="不适症状" icon={<AlertTriangle className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {log.symptoms.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                  >
                    {SYMPTOM_EMOJIS[s]} {SYMPTOM_LABELS[s]}
                  </span>
                ))}
              </div>
              {log.symptomNote && (
                <p className="mt-2 text-sm text-teal-600/70">{log.symptomNote}</p>
              )}
            </DetailSection>
          )}

          {/* 备注 */}
          {log.overallNote && (
            <DetailSection title="备注" icon={<ClipboardList className="h-4 w-4" />}>
              <p className="text-sm text-teal-600/80">{log.overallNote}</p>
            </DetailSection>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ================================================================
 * 小组件
 * ================================================================ */
function LogStatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="glass-tile rounded-xl p-3">
      <div className={cn('flex items-center gap-1.5', color)}>
        {icon}
        <span className="text-[10px] font-medium text-teal-600/60">{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-teal-700">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-teal-600/50">{sub}</div>}
    </div>
  );
}

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        {icon && <span className="text-teal-500">{icon}</span>}
        <label className="text-xs font-medium text-teal-700">{label}</label>
      </div>
      {children}
    </div>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-tile rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-1.5 text-teal-600">
        {icon}
        <h4 className="text-sm font-medium text-teal-700">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function DetailItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/70 p-2.5">
      <div className="text-[10px] text-teal-600/60">{label}</div>
      <div className={cn('text-sm font-semibold', highlight ? 'text-indigo-600' : 'text-teal-700')}>
        {value}
      </div>
    </div>
  );
}