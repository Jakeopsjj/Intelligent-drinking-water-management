import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Droplets, Citrus, HeartPulse, Activity, CalendarClock, Check, Trash2, Atom, Waves, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useFruitsStore } from '@/store/useFruitsStore';
import { exportAsJSON, exportAsCSV } from '@/utils/export';
import { cn } from '@/lib/utils';

export default function Settings() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const records = useRecordsStore((s) => s.records);
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const clearAllRecords = useRecordsStore((s) => s.clearAll);
  const recordCount = records.length;

  const [saved, setSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const [exportType, setExportType] = useState<'json' | 'csv' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);

  const handleSave = () => {
    updateSettings({ initialized: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleClear = () => {
    clearAllRecords();
    setShowClearConfirm(false);
  };

  const handleExportJSON = async () => {
    if (recordCount === 0 || exporting) return;
    setExporting('json');
    setExportError(null);
    try {
      const allFruits = [...customFruits, ...builtinFruits];
      await exportAsJSON(records, settings, allFruits);
      setExportType('json');
      setExportedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      setTimeout(() => {
        setExportType(null);
        setExportedAt(null);
      }, 3000);
    } catch (e: any) {
      setExportError(`JSON 导出失败：${e?.message || String(e)}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportCSV = async () => {
    if (recordCount === 0 || exporting) return;
    setExporting('csv');
    setExportError(null);
    try {
      await exportAsCSV(records);
      setExportType('csv');
      setExportedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      setTimeout(() => {
        setExportType(null);
        setExportedAt(null);
      }, 3000);
    } catch (e: any) {
      setExportError(`CSV 导出失败：${e?.message || String(e)}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl font-semibold text-teal-700">设置</h1>
        <p className="mt-1 text-sm text-teal-600/60">个性化你的健康限额</p>
      </motion.header>

      {/* 个人信息 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl border border-cream-300 bg-white/70 p-6 shadow-soft"
      >
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-teal-500" />
          <h2 className="font-serif text-lg font-semibold text-teal-700">个人信息</h2>
        </div>

        <div className="space-y-4">
          <Field label="昵称" hint="用于今日页面的称呼">
            <input
              value={settings.userName ?? ''}
              onChange={(e) => updateSettings({ userName: e.target.value })}
              placeholder="例如：肾友"
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
            />
          </Field>

          <Field label="透析日程" hint="记录每周透析日">
            <input
              value={settings.dialysisSchedule ?? ''}
              onChange={(e) => updateSettings({ dialysisSchedule: e.target.value })}
              placeholder="例如：周一 / 周三 / 周五"
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
            />
          </Field>
        </div>
      </motion.section>

      {/* 每日限额 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-cream-300 bg-white/70 p-6 shadow-soft"
      >
        <div className="mb-4 flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-teal-500" />
          <h2 className="font-serif text-lg font-semibold text-teal-700">每日限额</h2>
        </div>

        <div className="space-y-4">
          <Field
            label="摄水量限额"
            hint="医生建议的每日最大摄水量（含汤水）"
            icon={<Droplets className="h-3.5 w-3.5" />}
          >
            <NumberInput
              value={settings.dailyWaterLimit}
              onChange={(v) => updateSettings({ dailyWaterLimit: v })}
              unit="ml"
              step={50}
              min={0}
            />
          </Field>

          <Field
            label="超滤量目标"
            hint="每次透析的目标超滤量"
            icon={<Activity className="h-3.5 w-3.5" />}
          >
            <NumberInput
              value={settings.dailyUltrafiltrationTarget}
              onChange={(v) => updateSettings({ dailyUltrafiltrationTarget: v })}
              unit="ml"
              step={50}
              min={0}
            />
          </Field>

          <Field
            label="水果摄入限额"
            hint="每日水果总重量限额"
            icon={<Citrus className="h-3.5 w-3.5" />}
          >
            <NumberInput
              value={settings.dailyFruitLimit}
              onChange={(v) => updateSettings({ dailyFruitLimit: v })}
              unit="g"
              step={10}
              min={0}
            />
          </Field>

          <Field
            label="钾摄入限额"
            hint="每日钾元素摄入上限（一般 2000-3000mg）"
            icon={<HeartPulse className="h-3.5 w-3.5" />}
          >
            <NumberInput
              value={settings.dailyPotassiumLimit}
              onChange={(v) => updateSettings({ dailyPotassiumLimit: v })}
              unit="mg"
              step={100}
              min={0}
            />
          </Field>

          <Field
            label="磷摄入限额"
            hint="每日磷元素摄入上限（建议 800-1000mg）"
            icon={<Atom className="h-3.5 w-3.5" />}
          >
            <NumberInput
              value={settings.dailyPhosphorusLimit}
              onChange={(v) => updateSettings({ dailyPhosphorusLimit: v })}
              unit="mg"
              step={50}
              min={0}
            />
          </Field>

          <Field
            label="钠摄入限额"
            hint="每日钠元素摄入上限（约 5g 食盐 = 2000mg 钠）"
            icon={<Waves className="h-3.5 w-3.5" />}
          >
            <NumberInput
              value={settings.dailySodiumLimit}
              onChange={(v) => updateSettings({ dailySodiumLimit: v })}
              unit="mg"
              step={100}
              min={0}
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition',
              saved
                ? 'bg-sage-500 text-white'
                : 'bg-teal-500 text-white hover:bg-teal-600'
            )}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" /> 已保存
              </>
            ) : (
              '保存设置'
            )}
          </button>
        </div>
      </motion.section>

      {/* 数据管理 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-3xl border border-cream-300 bg-white/70 p-6 shadow-soft"
      >
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-teal-500" />
          <h2 className="font-serif text-lg font-semibold text-teal-700">数据管理</h2>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-cream-50 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-teal-700">记录总数</div>
            <div className="mt-0.5 text-xs text-teal-600/60">
              {recordCount} 条本地记录
            </div>
          </div>
          <span className="font-serif text-2xl font-semibold text-teal-600">{recordCount}</span>
        </div>

        {/* 数据导出 */}
        <div className="mt-3 rounded-2xl bg-teal-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-teal-500" />
            <div className="text-sm font-medium text-teal-700">数据导出</div>
          </div>
          <div className="mt-0.5 text-xs text-teal-600/70">
            将记录导出为可备份或分享的文件
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={handleExportJSON}
              disabled={recordCount === 0 || exporting !== null}
              className={cn(
                'flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition',
                exporting === 'json'
                  ? 'border border-teal-300 bg-teal-100 text-teal-600'
                  : exportType === 'json'
                  ? 'bg-sage-500 text-white'
                  : 'border border-teal-300 bg-white text-teal-600 hover:bg-teal-100 disabled:opacity-40'
              )}
            >
              {exporting === 'json' ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                  导出中
                </>
              ) : exportType === 'json' ? (
                <>
                  <Check className="h-3.5 w-3.5" /> 已导出
                </>
              ) : (
                <>
                  <FileJson className="h-3.5 w-3.5" /> JSON 备份
                </>
              )}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={recordCount === 0 || exporting !== null}
              className={cn(
                'flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition',
                exporting === 'csv'
                  ? 'border border-teal-300 bg-teal-100 text-teal-600'
                  : exportType === 'csv'
                  ? 'bg-sage-500 text-white'
                  : 'border border-teal-300 bg-white text-teal-600 hover:bg-teal-100 disabled:opacity-40'
              )}
            >
              {exporting === 'csv' ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                  导出中
                </>
              ) : exportType === 'csv' ? (
                <>
                  <Check className="h-3.5 w-3.5" /> 已导出
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV 表格
                </>
              )}
            </button>
          </div>
          {exportError && (
            <p className="mt-2 whitespace-nowrap text-[10px] text-red-500">
              {exportError}
            </p>
          )}
          {exportedAt && !exportError && (
            <p className="mt-2 whitespace-nowrap text-[10px] text-sage-600">
              文件已生成，请在弹出的分享菜单选择「保存到文件」或「保存到下载」
            </p>
          )}
          {recordCount === 0 && (
            <p className="mt-2 text-[10px] text-teal-600/50">
              暂无记录，无法导出
            </p>
          )}
        </div>

        <div className="mt-3 rounded-2xl bg-clay-50 px-4 py-3">
          <div className="text-sm font-medium text-clay-600">清空所有记录</div>
          <div className="mt-0.5 text-xs text-clay-600/70">
            此操作不可撤销，请谨慎操作
          </div>
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="mt-2 rounded-lg border border-clay-300 bg-white px-3 py-1.5 text-xs font-medium text-clay-600 hover:bg-clay-100"
            >
              清空记录
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleClear}
                className="rounded-lg bg-clay-400 px-3 py-1.5 text-xs font-medium text-white hover:bg-clay-500"
              >
                确认清空
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-cream-300 px-3 py-1.5 text-xs text-teal-600 hover:bg-cream-100"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* 关于 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-cream-300 bg-white/70 p-6 text-center shadow-soft"
      >
        <div className="font-serif text-sm text-teal-700">肾友笔记</div>
        <p className="mt-1 text-xs text-teal-600/60">
          一款专注透析患者健康管理的轻量应用
        </p>
        <p className="mt-3 text-[10px] text-teal-600/40">
          所有数据均存储在本地浏览器，注重隐私保护
        </p>
      </motion.section>
    </div>
  );
}

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon && <span className="text-teal-500">{icon}</span>}
        <label className="text-sm font-medium text-teal-700">{label}</label>
      </div>
      {children}
      {hint && <p className="mt-1 text-[10px] text-teal-600/50">{hint}</p>}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  unit,
  step = 1,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
  min?: number;
}) {
  const handleChange = (v: number) => {
    if (Number.isNaN(v) || v < min) v = min;
    onChange(Math.round(v));
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center rounded-xl border border-cream-300 bg-white">
        <button
          onClick={() => handleChange(value - step)}
          className="flex h-10 w-10 items-center justify-center text-teal-600 hover:bg-cream-100"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-full bg-transparent py-2.5 text-center text-sm font-medium text-teal-700 focus:outline-none"
        />
        <button
          onClick={() => handleChange(value + step)}
          className="flex h-10 w-10 items-center justify-center text-teal-600 hover:bg-cream-100"
        >
          +
        </button>
      </div>
      <span className="w-10 text-xs text-teal-600/60">{unit}</span>
    </div>
  );
}
