import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Droplets, Citrus, HeartPulse, Activity, CalendarClock, Check, Trash2, Atom, Waves, Download, FileJson, FileSpreadsheet, Image as ImageIcon, Upload } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useFruitsStore } from '@/store/useFruitsStore';
import { exportAsJSON, exportAsCSV, exportAsImage, parseBackupJSON, readFileAsText } from '@/utils/export';
import { cn } from '@/lib/utils';

type ExportKind = 'json' | 'csv' | 'image';

export default function Settings() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const records = useRecordsStore((s) => s.records);
  const replaceAllRecords = useRecordsStore((s) => s.replaceAll);
  const mergeRecords = useRecordsStore((s) => s.mergeRecords);
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const replaceCustomFruits = useFruitsStore((s) => s.replaceCustomFruits);
  const clearAllRecords = useRecordsStore((s) => s.clearAll);
  const recordCount = records.length;

  const [saved, setSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const [exportType, setExportType] = useState<ExportKind | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [importing, setImporting] = useState(false);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateSettings({ initialized: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleClear = () => {
    clearAllRecords();
    setShowClearConfirm(false);
  };

  const handleExport = async (kind: ExportKind) => {
    if (recordCount === 0 || exporting) return;
    setExporting(kind);
    setExportError(null);
    try {
      if (kind === 'json') {
        const allFruits = [...customFruits, ...builtinFruits];
        await exportAsJSON(records, settings, allFruits);
      } else if (kind === 'csv') {
        await exportAsCSV(records);
      } else {
        await exportAsImage({ records, settings });
      }
      setExportType(kind);
      setExportedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      setTimeout(() => {
        setExportType(null);
        setExportedAt(null);
      }, 3000);
    } catch (e: any) {
      setExportError(`导出失败：${e?.message || String(e)}`);
    } finally {
      setExporting(null);
    }
  };

  const handlePickFile = () => {
    if (importing) return;
    setImportInfo(null);
    setExportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空 input 以便重复选择同一文件
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportInfo(null);
    setExportError(null);
    try {
      const text = await readFileAsText(file);
      const result = parseBackupJSON(text);

      const mode = confirm(
        `检测到 ${result.records.length} 条记录${result.settings ? ' + 设置' : ''}${result.customFruits.length ? ` + ${result.customFruits.length} 个自定义水果` : ''}。\n\n点击「确定」：覆盖现有数据\n点击「取消」：合并到现有数据（保留已有记录）`
      );

      if (mode) {
        // 覆盖模式
        replaceAllRecords(result.records);
        if (result.settings) setSettings(result.settings);
        if (result.customFruits.length) replaceCustomFruits(result.customFruits);
        setImportInfo(`已恢复 ${result.records.length} 条记录（覆盖模式）`);
      } else {
        // 合并模式
        const added = mergeRecords(result.records);
        if (result.customFruits.length) {
          // 合并自定义水果：去重
          const existingIds = new Set(customFruits.map((f) => f.id));
          const newFruits = [...customFruits, ...result.customFruits.filter((f) => !existingIds.has(f.id))];
          replaceCustomFruits(newFruits);
        }
        setImportInfo(added > 0 ? `已合并 ${added} 条新记录` : '没有新记录需要合并');
      }
    } catch (err: any) {
      setExportError(`导入失败：${err?.message || String(err)}`);
    } finally {
      setImporting(false);
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
            hint="每日水果总重量限额（存储以 g 为单位，便于精确计算）"
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
            选择合适的格式导出，分享菜单里选「保存到文件」
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ExportButton
              kind="json"
              label="JSON 备份"
              hint="完整可恢复"
              icon={<FileJson className="h-3.5 w-3.5" />}
              exporting={exporting}
              exportType={exportType}
              disabled={recordCount === 0}
              onClick={() => handleExport('json')}
            />
            <ExportButton
              kind="csv"
              label="CSV 表格"
              hint="Excel 可打开"
              icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
              exporting={exporting}
              exportType={exportType}
              disabled={recordCount === 0}
              onClick={() => handleExport('csv')}
            />
            <ExportButton
              kind="image"
              label="图片报告"
              hint="排版美观可分享"
              icon={<ImageIcon className="h-3.5 w-3.5" />}
              exporting={exporting}
              exportType={exportType}
              disabled={recordCount === 0}
              onClick={() => handleExport('image')}
            />
          </div>
          {recordCount === 0 && (
            <p className="mt-2 text-[10px] text-teal-600/50">
              暂无记录，无法导出
            </p>
          )}
        </div>

        {/* 数据导入 */}
        <div className="mt-3 rounded-2xl bg-sky-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-sky-500" />
            <div className="text-sm font-medium text-sky-700">恢复数据</div>
          </div>
          <div className="mt-0.5 text-xs text-sky-600/70">
            从 JSON 备份文件恢复记录（覆盖或合并）
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={handlePickFile}
            disabled={importing}
            className={cn(
              'mt-3 flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition',
              importing
                ? 'border border-sky-300 bg-sky-100 text-sky-600'
                : 'border border-sky-300 bg-white text-sky-600 hover:bg-sky-100'
            )}
          >
            {importing ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                导入中
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" /> 选择备份文件
              </>
            )}
          </button>
          {importInfo && !exportError && (
            <p className="mt-2 whitespace-nowrap text-[10px] text-sage-600">
              {importInfo}
            </p>
          )}
        </div>

        {(exportError || (exportedAt && !exportError)) && (
          <div className="mt-2">
            {exportError && (
              <p className="whitespace-nowrap text-[10px] text-red-500">{exportError}</p>
            )}
            {exportedAt && !exportError && (
              <p className="whitespace-nowrap text-[10px] text-sage-600">
                文件已生成，请在弹出的分享菜单选择「保存到文件」或「保存到下载」
              </p>
            )}
          </div>
        )}

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

function ExportButton({
  kind,
  label,
  hint,
  icon,
  exporting,
  exportType,
  disabled,
  onClick,
}: {
  kind: ExportKind;
  label: string;
  hint: string;
  icon: React.ReactNode;
  exporting: ExportKind | null;
  exportType: ExportKind | null;
  disabled?: boolean;
  onClick: () => void;
}) {
  const isLoading = exporting === kind;
  const isDone = exportType === kind;
  return (
    <button
      onClick={onClick}
      disabled={disabled || exporting !== null}
      className={cn(
        'flex flex-col items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-xs font-medium transition',
        isLoading
          ? 'border border-teal-300 bg-teal-100 text-teal-600'
          : isDone
          ? 'border border-sage-400 bg-sage-500 text-white'
          : 'border border-teal-300 bg-white text-teal-600 hover:bg-teal-100 disabled:opacity-40'
      )}
    >
      {isLoading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
      ) : isDone ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        icon
      )}
      <span>{isLoading ? '导出中' : isDone ? '已导出' : label}</span>
      <span className={cn('text-[9px]', isDone ? 'text-white/80' : 'text-teal-600/50')}>{hint}</span>
    </button>
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
