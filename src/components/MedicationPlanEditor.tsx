/**
 * 服药计划编辑抽屉（新建 / 编辑）
 *
 * - 从底部弹出的抽屉，参考 DetailDrawer 的动画与结构
 * - 通过 createPortal 渲染到 document.body
 * - 表单：药物选择 / 名称 / emoji / 剂量 / 单位 / 时间列表 / 重复日 / 备注
 * - 保存时调用 addPlan 或 updatePlan，并重新调度通知
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import { useMedicationPlanStore } from '@/store/useMedicationPlanStore';
import { useMedicationsStore } from '@/store/useMedicationsStore';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import {
  scheduleMedicationReminder,
  rescheduleAllReminders,
} from '@/lib/notificationService';
import { cn } from '@/lib/utils';
import type { MedicationPlanItem } from '@/types';

interface MedicationPlanEditorProps {
  open: boolean;
  onClose: () => void;
  /** 编辑模式的计划 ID，为空时为新建 */
  planId?: string | null;
}

// 常用单位（仅供参考，也支持手动输入）
const UNIT_SUGGESTIONS = ['片', '粒', 'ml', '支', '喷', 'mg', '滴'];

// 周几显示字符（0=周日，1=周一...）
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
// 显示顺序：周一~周日（对应 1,2,3,4,5,6,0）
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function MedicationPlanEditor({
  open,
  onClose,
  planId,
}: MedicationPlanEditorProps) {
  // 注册到浮层栈：返回键 / 侧滑可关闭
  useOverlayBackHandler(open, onClose);
  // 锁定背景滚动
  useLockBodyScroll(open);

  const addPlan = useMedicationPlanStore((s) => s.addPlan);
  const updatePlan = useMedicationPlanStore((s) => s.updatePlan);
  const getPlanById = useMedicationPlanStore((s) => s.getPlanById);
  const allMedications = useMedicationsStore((s) => s.allMedications);

  // 表单状态
  const [medicationId, setMedicationId] = useState<string>('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💊');
  const [dosage, setDosage] = useState('1');
  const [unit, setUnit] = useState('片');
  const [times, setTimes] = useState<string[]>(['08:00']);
  // [] 表示每天
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!planId;

  // 打开时初始化表单（新建 or 编辑）
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (planId) {
      const plan = getPlanById(planId);
      if (plan) {
        setMedicationId(plan.medicationId);
        setName(plan.medicationName);
        setEmoji(plan.emoji || '💊');
        setDosage(String(plan.dosage));
        setUnit(plan.unit);
        setTimes(plan.times.length > 0 ? [...plan.times] : ['08:00']);
        setDaysOfWeek([...plan.daysOfWeek]);
        setNotes(plan.notes ?? '');
        return;
      }
    }
    // 新建：重置为默认值
    setMedicationId('');
    setName('');
    setEmoji('💊');
    setDosage('1');
    setUnit('片');
    setTimes(['08:00']);
    setDaysOfWeek([]);
    setNotes('');
  }, [open, planId, getPlanById]);

  // 从药物库选择某个药物时，自动填充字段
  const handleSelectFromLibrary = (id: string) => {
    if (!id) {
      // 选择"手动输入"，仅清空关联 ID，保留已有名称
      setMedicationId('');
      return;
    }
    const med = allMedications().find((m) => m.id === id);
    if (!med) return;
    setMedicationId(med.id);
    setName(med.name);
    setEmoji(med.emoji || '💊');
    setUnit(med.usage?.unit || '片');
    if (med.usage?.defaultDose) {
      setDosage(String(med.usage.defaultDose));
    }
  };

  // 名称手动编辑：取消药物库关联
  const handleNameChange = (v: string) => {
    setName(v);
    if (medicationId) setMedicationId('');
  };

  // 时间列表操作
  const addTime = () => setTimes((t) => [...t, '12:00']);
  const removeTime = (idx: number) =>
    setTimes((t) => t.filter((_, i) => i !== idx));
  const updateTime = (idx: number, v: string) =>
    setTimes((t) => t.map((time, i) => (i === idx ? v : time)));

  // 周几切换
  const toggleDay = (day: number) => {
    setDaysOfWeek((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  };

  // 点击"每天"预设：清空 daysOfWeek，等价于每天都提醒
  const selectEveryDay = () => setDaysOfWeek([]);

  // 校验 + 保存
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('请输入药物名称');
      return;
    }
    const validTimes = times.filter((t) => t);
    if (validTimes.length === 0) {
      setError('请至少添加一个服用时间');
      return;
    }
    const doseNum = Number(dosage);
    if (!dosage || Number.isNaN(doseNum) || doseNum <= 0) {
      setError('请输入有效的剂量');
      return;
    }

    const payload = {
      medicationId,
      medicationName: trimmedName,
      emoji: emoji || '💊',
      dosage: doseNum,
      unit: unit.trim() || '片',
      times: validTimes,
      daysOfWeek,
      notes: notes.trim() || undefined,
    };

    if (isEdit && planId) {
      // 编辑模式：保留原 enabled 状态
      const existing = getPlanById(planId);
      const enabled = existing?.enabled ?? true;
      updatePlan(planId, { ...payload, enabled });
      // 重新调度通知（构造完整 plan 对象传给调度服务）
      const updatedPlan: MedicationPlanItem = {
        id: planId,
        createdAt: existing?.createdAt ?? Date.now(),
        ...payload,
        enabled,
      };
      await scheduleMedicationReminder(updatedPlan);
    } else {
      // 新建：默认启用
      addPlan({ ...payload, enabled: true });
      // 新建后从 store 拿最新计划列表，整体重新调度
      const allPlans = useMedicationPlanStore.getState().plans;
      await rescheduleAllReminders(allPlans);
    }
    onClose();
  };

  const canSave = name.trim().length > 0 && times.some((t) => t);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-teal-700/40 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card relative max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl [will-change:transform] [transform:translateZ(0)]"
          >
            <div className="glass-shimmer" />
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              aria-label="关闭"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-teal-600 backdrop-blur-sm transition hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 max-h-[92dvh] overflow-y-auto">
              {/* 头部 */}
              <div className="border-b border-cream-200 p-4">
                <h3 className="font-serif text-lg font-semibold text-teal-700">
                  {isEdit ? '编辑服药计划' : '新建服药计划'}
                </h3>
                <p className="mt-0.5 text-[11px] text-teal-600/60">
                  设置服药时间，App 将自动提醒
                </p>
              </div>

              <div className="space-y-4 p-4">
                {/* 从药物库选择（可选） */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-teal-600">
                    从药物库选择（可选）
                  </label>
                  <select
                    value={medicationId}
                    onChange={(e) => handleSelectFromLibrary(e.target.value)}
                    className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 focus:border-teal-400"
                  >
                    <option value="">—— 手动输入 ——</option>
                    {allMedications().map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.emoji} {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* emoji + 名称 */}
                <div className="flex gap-3">
                  <input
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="w-14 rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-center text-xl"
                    maxLength={2}
                    aria-label="药物图标"
                  />
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-teal-600">
                      药物名称 <span className="text-clay-500">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="如：碳酸钙"
                      className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
                    />
                  </div>
                </div>

                {/* 剂量 + 单位 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-teal-600">
                      剂量
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      placeholder="如 1"
                      className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-teal-600">
                      单位
                    </label>
                    <input
                      list="med-plan-unit-options"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="片/粒/ml"
                      className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
                    />
                    <datalist id="med-plan-unit-options">
                      {UNIT_SUGGESTIONS.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* 时间列表 */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-teal-600">
                      服用时间 <span className="text-clay-500">*</span>
                    </label>
                    <button
                      onClick={addTime}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-600 transition hover:bg-teal-100"
                    >
                      <Plus className="h-3 w-3" /> 添加时间
                    </button>
                  </div>
                  <div className="space-y-2">
                    {times.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-teal-500" />
                        <input
                          type="time"
                          value={t}
                          onChange={(e) => updateTime(i, e.target.value)}
                          className="flex-1 rounded-xl border border-cream-300 bg-white px-4 py-2 text-sm text-teal-700 focus:border-teal-400"
                        />
                        {times.length > 1 && (
                          <button
                            onClick={() => removeTime(i)}
                            aria-label="删除时间"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-clay-500 hover:bg-clay-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 重复日 */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-teal-600">
                    重复日
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={selectEveryDay}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition',
                        daysOfWeek.length === 0
                          ? 'bg-gradient-to-br from-teal-500 to-sage-500 text-white shadow-soft'
                          : 'glass-tile text-teal-600 hover:bg-teal-50'
                      )}
                    >
                      每天
                    </button>
                    {WEEKDAY_ORDER.map((d) => {
                      const active = daysOfWeek.includes(d);
                      return (
                        <button
                          key={d}
                          onClick={() => toggleDay(d)}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition',
                            active
                              ? 'bg-teal-500 text-white shadow-soft'
                              : 'glass-tile text-teal-600 hover:bg-teal-50'
                          )}
                        >
                          {WEEKDAY_LABELS[d]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[10px] text-teal-600/50">
                    {daysOfWeek.length === 0
                      ? '每天提醒'
                      : `已选 ${daysOfWeek.length} 天`}
                  </p>
                </div>

                {/* 备注 */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-teal-600">
                    备注
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="如：饭后服用 / 空腹 / 与XXX同服"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
                  />
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="rounded-xl bg-clay-50 px-3 py-2 text-xs text-clay-600">
                    {error}
                  </div>
                )}

                {/* 底部按钮 */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onClose}
                    className="glass-tile flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-teal-600"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!canSave}
                    className="flex-1 rounded-xl bg-gradient-to-br from-teal-500 to-sage-500 px-4 py-2.5 text-sm font-medium text-white transition hover:shadow-soft disabled:opacity-40"
                  >
                    {isEdit ? '保存修改' : '创建计划'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
