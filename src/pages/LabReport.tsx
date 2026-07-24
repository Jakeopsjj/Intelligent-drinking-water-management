/**
 * 化验报告管理
 *
 * 透析患者血液化验报告录入与追踪：
 * - 录入历次化验报告（12项核心指标）
 * - 指标异常值自动标红预警
 * - 单指标趋势曲线图
 * - 历史报告列表与详情查看
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import {
  FlaskConical, Plus, X, Calendar, ChevronRight, Trash2,
  TrendingUp, AlertTriangle, CheckCircle2, FileText, Building2,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import { useLabReportStore } from '@/store/useLabReportStore';
import { formatDateFriendly, toDateKey, getTodayKey } from '@/utils/date';
import { cn } from '@/lib/utils';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { LabReport, LabMetric, LabMetricKey, LabMetricMeta } from '@/types';
import { LAB_METRICS } from '@/types';

/** 判断指标状态 */
function getMetricStatus(meta: LabMetricMeta, value: number): 'low' | 'normal' | 'high' {
  if (value < meta.min) return 'low';
  if (value > meta.max) return 'high';
  return 'normal';
}

const STATUS_CONFIG = {
  low: { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', icon: ArrowDown, label: '偏低' },
  normal: { color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle2, label: '正常' },
  high: { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', icon: ArrowUp, label: '偏高' },
};

export default function LabReportPage() {
  const reports = useLabReportStore((s) => s.reports);
  const addReport = useLabReportStore((s) => s.addReport);
  const deleteReport = useLabReportStore((s) => s.deleteReport);
  const getMetricTrend = useLabReportStore((s) => s.getMetricTrend);

  const [showForm, setShowForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [trendMetric, setTrendMetric] = useState<LabMetricKey | null>(null);

  useLockBodyScroll(showForm || !!selectedReport || !!trendMetric);

  // 按日期倒序
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => b.date - a.date);
  }, [reports]);

  // 最新报告
  const latestReport = sortedReports[0];

  // 异常指标统计
  const abnormalCount = useMemo(() => {
    if (!latestReport) return 0;
    return latestReport.metrics.filter((m) => {
      const meta = LAB_METRICS.find((l) => l.key === m.key);
      return meta && getMetricStatus(meta, m.value) !== 'normal';
    }).length;
  }, [latestReport]);

  // 趋势图数据
  const trendData = useMemo(() => {
    if (!trendMetric) return [];
    const trend = getMetricTrend(trendMetric);
    const meta = LAB_METRICS.find((l) => l.key === trendMetric);
    return trend.map((t) => ({
      date: toDateKey(t.date),
      shortDate: toDateKey(t.date).slice(5).replace('-', '/'),
      value: t.value,
      normalMin: meta?.min,
      normalMax: meta?.max,
    }));
  }, [trendMetric, getMetricTrend]);

  const trendMeta = trendMetric ? LAB_METRICS.find((l) => l.key === trendMetric) : null;

  return (
    <div className="space-y-5">
      {/* 页头 */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-serif text-2xl font-bold text-teal-700">化验报告</h1>
          <p className="mt-0.5 text-sm text-teal-600/60">血液指标追踪与趋势分析</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-teal-500 to-sage-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-teal-500/20 transition active:scale-95"
        >
          <Plus className="h-4 w-4" /> 录入报告
        </button>
      </motion.header>

      {/* 最新报告概览 */}
      {latestReport ? (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card relative overflow-hidden rounded-3xl p-4"
        >
          <div className="glass-orb -right-8 -top-8 h-28 w-28 bg-teal-300/20" />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-teal-500" />
                <h2 className="font-serif text-base font-semibold text-teal-700">最近化验</h2>
              </div>
              <button
                onClick={() => setSelectedReport(latestReport)}
                className="flex items-center gap-0.5 text-xs font-medium text-teal-500 transition hover:text-teal-600"
              >
                详情 <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mb-3 flex items-center gap-2 text-xs text-teal-600/60">
              <Calendar className="h-3 w-3" />
              {formatDateFriendly(toDateKey(latestReport.date))}
              {latestReport.hospital && (
                <>
                  <span className="text-teal-600/30">·</span>
                  <Building2 className="h-3 w-3" />
                  {latestReport.hospital}
                </>
              )}
            </div>

            {/* 异常指标统计 */}
            <div className={cn(
              'mb-3 flex items-center gap-2 rounded-2xl px-3 py-2',
              abnormalCount > 0 ? 'bg-amber-50' : 'bg-green-50'
            )}>
              {abnormalCount > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700">
                    {abnormalCount} 项指标异常，请关注并咨询医生
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium text-green-700">所有指标均在目标范围内</span>
                </>
              )}
            </div>

            {/* 指标网格 */}
            <div className="grid grid-cols-3 gap-2">
              {latestReport.metrics.slice(0, 9).map((m) => {
                const meta = LAB_METRICS.find((l) => l.key === m.key);
                if (!meta) return null;
                const status = getMetricStatus(meta, m.value);
                const config = STATUS_CONFIG[status];
                const StatusIcon = config.icon;
                return (
                  <div
                    key={m.key}
                    className={cn(
                      'rounded-2xl border px-2.5 py-2',
                      config.bg,
                      config.border
                    )}
                  >
                    <div className="text-[10px] text-teal-600/60">{meta.label}</div>
                    <div className={cn('flex items-baseline gap-0.5', config.color)}>
                      <span className="text-sm font-bold">{m.value}</span>
                      <span className="text-[9px] opacity-70">{m.unit}</span>
                    </div>
                    <div className={cn('flex items-center gap-0.5 text-[9px]', config.color)}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {config.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 查看趋势按钮 */}
            <button
              onClick={() => setTrendMetric('hemoglobin')}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-teal-50 py-2.5 text-xs font-medium text-teal-600 transition hover:bg-teal-100"
            >
              <TrendingUp className="h-3.5 w-3.5" /> 查看指标趋势
            </button>
          </div>
        </motion.section>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 text-center"
        >
          <FlaskConical className="mx-auto h-12 w-12 text-teal-300" />
          <p className="mt-3 text-sm font-medium text-teal-600">暂无化验报告</p>
          <p className="mt-1 text-xs text-teal-600/50">
            录入第一次化验报告，开始追踪血液指标变化
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-teal-500 to-sage-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition active:scale-95"
          >
            <Plus className="h-4 w-4" /> 录入首份报告
          </button>
        </motion.section>
      )}

      {/* 历史报告列表 */}
      {sortedReports.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-3xl p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-500" />
            <h2 className="font-serif text-base font-semibold text-teal-700">历史报告</h2>
            <span className="text-xs text-teal-600/50">({sortedReports.length} 份)</span>
          </div>

          <div className="space-y-2">
            {sortedReports.map((report) => {
              const abnormal = report.metrics.filter((m) => {
                const meta = LAB_METRICS.find((l) => l.key === m.key);
                return meta && getMetricStatus(meta, m.value) !== 'normal';
              }).length;

              return (
                <div
                  key={report.id}
                  className="glass-tile flex items-center justify-between rounded-2xl px-3 py-2.5 transition active:scale-[0.98]"
                >
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
                      <FlaskConical className="h-4 w-4 text-teal-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-teal-700">
                        {formatDateFriendly(toDateKey(report.date))}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-teal-600/50">
                        <span>{report.metrics.length} 项指标</span>
                        {abnormal > 0 && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-600">
                            {abnormal} 项异常
                          </span>
                        )}
                        {report.hospital && (
                          <span className="truncate">· {report.hospital}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-teal-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* 录入表单 */}
      <AnimatePresence>
        {showForm && (
          <LabReportForm
            onClose={() => setShowForm(false)}
            onSave={(data) => {
              addReport(data);
              setShowForm(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* 报告详情 */}
      <AnimatePresence>
        {selectedReport && (
          <LabReportDetail
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onDelete={() => {
              deleteReport(selectedReport.id);
              setSelectedReport(null);
            }}
            onViewTrend={(key) => {
              setSelectedReport(null);
              setTrendMetric(key);
            }}
          />
        )}
      </AnimatePresence>

      {/* 趋势曲线 */}
      <AnimatePresence>
        {trendMetric && trendMeta && (
          <MetricTrendModal
            metricKey={trendMetric}
            meta={trendMeta}
            data={trendData}
            onClose={() => setTrendMetric(null)}
            onSwitchMetric={(key) => setTrendMetric(key)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ 录入表单 ============

function LabReportForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<LabReport, 'id' | 'createdAt'>) => void;
}) {
  const [date, setDate] = useState(getTodayKey());
  const [hospital, setHospital] = useState('');
  const [metricValues, setMetricValues] = useState<Partial<Record<LabMetricKey, string>>>({});
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    const metrics: LabMetric[] = [];
    LAB_METRICS.forEach((meta) => {
      const raw = metricValues[meta.key];
      if (raw !== undefined && raw !== '') {
        const value = parseFloat(raw);
        if (!isNaN(value)) {
          metrics.push({ key: meta.key, value, unit: meta.unit });
        }
      }
    });

    if (metrics.length === 0) {
      return;
    }

    onSave({
      date: new Date(date).getTime(),
      hospital: hospital.trim() || undefined,
      metrics,
      note: note.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream-50 px-5 pb-8 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 拖拽指示器 */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-300" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-teal-700">录入化验报告</h2>
          <button onClick={onClose} className="rounded-full p-1.5 transition hover:bg-cream-200">
            <X className="h-5 w-5 text-teal-600/60" />
          </button>
        </div>

        {/* 日期与医院 */}
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-teal-600/70">化验日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-teal-700 outline-none focus:border-teal-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-teal-600/70">医院（可选）</label>
            <input
              type="text"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder="如：市中心医院"
              className="w-full rounded-2xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-teal-700 outline-none placeholder:text-cream-300 focus:border-teal-400"
            />
          </div>
        </div>

        {/* 指标录入 */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-teal-600/70">
            化验指标（填写有数据的项即可）
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LAB_METRICS.map((meta) => {
              const raw = metricValues[meta.key];
              const value = raw ? parseFloat(raw) : NaN;
              const status = !isNaN(value) ? getMetricStatus(meta, value) : null;
              const config = status ? STATUS_CONFIG[status] : null;

              return (
                <div
                  key={meta.key}
                  className={cn(
                    'rounded-2xl border p-2.5 transition',
                    config ? `${config.bg} ${config.border}` : 'border-cream-200 bg-white'
                  )}
                >
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-teal-700">{meta.label}</span>
                    <span className="text-[9px] text-teal-600/40">{meta.unit}</span>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={raw || ''}
                    onChange={(e) =>
                      setMetricValues((prev) => ({ ...prev, [meta.key]: e.target.value }))
                    }
                    placeholder={`${meta.min}-${meta.max}`}
                    className="w-full bg-transparent text-sm font-bold text-teal-700 outline-none placeholder:text-cream-300 placeholder:text-xs placeholder:font-normal"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 备注 */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-teal-600/70">备注（可选）</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="如：空腹抽血，透析前化验"
            rows={2}
            className="w-full resize-none rounded-2xl border border-cream-200 bg-white px-3 py-2 text-sm text-teal-700 outline-none placeholder:text-cream-300 focus:border-teal-400"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!Object.values(metricValues).some((v) => v && v !== '')}
          className="w-full rounded-2xl bg-gradient-to-br from-teal-500 to-sage-500 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition active:scale-[0.98] disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
        >
          保存报告
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============ 报告详情 ============

function LabReportDetail({
  report,
  onClose,
  onDelete,
  onViewTrend,
}: {
  report: LabReport;
  onClose: () => void;
  onDelete: () => void;
  onViewTrend: (key: LabMetricKey) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream-50 px-5 pb-8 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-300" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-teal-700">化验报告详情</h2>
          <button onClick={onClose} className="rounded-full p-1.5 transition hover:bg-cream-200">
            <X className="h-5 w-5 text-teal-600/60" />
          </button>
        </div>

        {/* 基本信息 */}
        <div className="mb-4 space-y-1.5 rounded-2xl bg-white p-3">
          <div className="flex items-center gap-2 text-sm text-teal-700">
            <Calendar className="h-4 w-4 text-teal-400" />
            {formatDateFriendly(toDateKey(report.date))}
          </div>
          {report.hospital && (
            <div className="flex items-center gap-2 text-sm text-teal-700">
              <Building2 className="h-4 w-4 text-teal-400" />
              {report.hospital}
            </div>
          )}
        </div>

        {/* 指标列表 */}
        <div className="mb-4 space-y-2">
          {report.metrics.map((m) => {
            const meta = LAB_METRICS.find((l) => l.key === m.key);
            if (!meta) return null;
            const status = getMetricStatus(meta, m.value);
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;

            return (
              <div
                key={m.key}
                className={cn('rounded-2xl border p-3', config.bg, config.border)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-teal-700">{meta.label}</span>
                    <span className={cn('flex items-center gap-0.5 text-[10px]', config.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                  <div className={cn('flex items-baseline gap-0.5', config.color)}>
                    <span className="text-base font-bold">{m.value}</span>
                    <span className="text-[10px] opacity-70">{m.unit}</span>
                  </div>
                </div>
                <div className="mt-1 text-[10px] text-teal-600/50">
                  目标范围：{meta.min} - {meta.max} {meta.unit}
                </div>
                {status !== 'normal' && (
                  <div className="mt-1.5 text-[10px] text-teal-600/70">
                    {status === 'low' ? meta.lowAdvice : meta.highAdvice}
                  </div>
                )}
                <button
                  onClick={() => onViewTrend(m.key)}
                  className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-teal-500 transition hover:text-teal-600"
                >
                  <TrendingUp className="h-3 w-3" /> 查看趋势
                </button>
              </div>
            );
          })}
        </div>

        {/* 备注 */}
        {report.note && (
          <div className="mb-4 rounded-2xl bg-white p-3">
            <div className="mb-1 text-[10px] font-medium text-teal-600/50">备注</div>
            <p className="text-xs text-teal-700">{report.note}</p>
          </div>
        )}

        {/* 删除按钮 */}
        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-2xl border border-cream-200 py-2.5 text-sm font-medium text-teal-600 transition hover:bg-cream-100"
            >
              取消
            </button>
            <button
              onClick={onDelete}
              className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-600"
            >
              确认删除
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-red-200 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> 删除报告
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============ 趋势曲线弹窗 ============

function MetricTrendModal({
  metricKey,
  meta,
  data,
  onClose,
  onSwitchMetric,
}: {
  metricKey: LabMetricKey;
  meta: LabMetricMeta;
  data: { shortDate: string; value: number; normalMin?: number; normalMax?: number }[];
  onClose: () => void;
  onSwitchMetric: (key: LabMetricKey) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream-50 px-5 pb-8 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-300" />

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-teal-700">{meta.label}趋势</h2>
            <p className="text-[10px] text-teal-600/50">{meta.description}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 transition hover:bg-cream-200">
            <X className="h-5 w-5 text-teal-600/60" />
          </button>
        </div>

        {/* 指标选择器 */}
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {LAB_METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => onSwitchMetric(m.key)}
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition',
                m.key === metricKey
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-teal-600/70 hover:bg-teal-50'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 趋势图 */}
        {data.length > 0 ? (
          <>
            <div className="mb-3 h-48 w-full rounded-2xl bg-white p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                  {meta.min > 0 && (
                    <ReferenceLine y={meta.min} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: '下限', fontSize: 9, fill: '#3b82f6' }} />
                  )}
                  <ReferenceLine y={meta.max} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '上限', fontSize: 9, fill: '#ef4444' }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    dot={{ fill: '#14b8a6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 目标范围说明 */}
            <div className="mb-3 rounded-2xl bg-teal-50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-teal-600/70">目标范围</span>
                <span className="font-medium text-teal-700">
                  {meta.min} - {meta.max} {meta.unit}
                </span>
              </div>
            </div>

            {/* 数据列表 */}
            <div className="space-y-1.5">
              {[...data].reverse().map((d, i) => {
                const status = getMetricStatus(meta, d.value);
                const config = STATUS_CONFIG[status];
                const StatusIcon = config.icon;
                const realIndex = data.length - 1 - i;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                  >
                    <span className="text-xs text-teal-600/70">{d.shortDate}</span>
                    <div className={cn('flex items-center gap-1', config.color)}>
                      <span className="text-sm font-bold">{d.value}</span>
                      <span className="text-[9px] opacity-70">{meta.unit}</span>
                      <StatusIcon className="h-3 w-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <TrendingUp className="mx-auto h-10 w-10 text-teal-300" />
            <p className="mt-2 text-sm text-teal-600/60">暂无该指标的历史数据</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
