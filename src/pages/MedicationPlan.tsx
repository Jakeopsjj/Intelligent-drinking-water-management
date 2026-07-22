/**
 * 服药计划列表页
 *
 * - 顶部标题"服药计划" + 返回按钮
 * - 列表展示每个计划项（药物 / 剂量 / 时间 / 重复日 / 备注 / 开关 / 编辑 / 删除）
 * - 右上角"+"按钮打开编辑抽屉（新建模式）
 * - 启用/禁用开关：调用 togglePlan 并重新调度通知
 * - 删除：内联二次确认，删除后重新调度所有通知
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Plus,
  Bell,
  BellOff,
  Pencil,
  Trash2,
  Clock,
  Calendar,
} from 'lucide-react';
import { useMedicationPlanStore } from '@/store/useMedicationPlanStore';
import {
  scheduleMedicationReminder,
  cancelMedicationReminder,
  rescheduleAllReminders,
} from '@/lib/notificationService';
import { cn } from '@/lib/utils';
import MedicationPlanEditor from '@/components/MedicationPlanEditor';
import type { MedicationPlanItem } from '@/types';

// 周几显示名（0=周日，1=周一...）
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 格式化重复日显示：空数组 → "每天"；否则按周一~周日顺序拼接
function formatDays(daysOfWeek: number[]): string {
  if (!daysOfWeek || daysOfWeek.length === 0) return '每天';
  const sorted = [...daysOfWeek].sort((a, b) => {
    // 周一(1) 排最前，周日(0) 排最后
    const orderA = a === 0 ? 7 : a;
    const orderB = b === 0 ? 7 : b;
    return orderA - orderB;
  });
  return sorted.map((d) => WEEKDAY_LABELS[d]).join('、');
}

export default function MedicationPlan() {
  const navigate = useNavigate();
  const plans = useMedicationPlanStore((s) => s.plans);
  const togglePlan = useMedicationPlanStore((s) => s.togglePlan);
  const deletePlan = useMedicationPlanStore((s) => s.deletePlan);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // 内联删除确认：当前进入确认态的计划 ID
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleOpenNew = () => {
    setEditingId(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  // 切换启用/禁用：先 toggle store，再依据新状态调度或取消通知
  const handleToggle = async (plan: MedicationPlanItem) => {
    togglePlan(plan.id);
    const newEnabled = !plan.enabled;
    if (newEnabled) {
      await scheduleMedicationReminder({ ...plan, enabled: true });
    } else {
      await cancelMedicationReminder(plan.id);
    }
  };

  // 删除计划：调用 store 删除后，重新调度所有通知
  const handleDelete = async (id: string) => {
    deletePlan(id);
    setConfirmDeleteId(null);
    const remaining = useMedicationPlanStore
      .getState()
      .plans.filter((p) => p.id !== id);
    await rescheduleAllReminders(remaining);
  };

  return (
    <div className="space-y-6">
      {/* 页头：返回按钮 + 标题 + 添加按钮 */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="返回"
            className="glass-tile flex h-9 w-9 items-center justify-center rounded-full text-teal-600 transition hover:bg-cream-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-teal-700">
              服药计划
            </h1>
            <p className="mt-1 text-sm text-teal-600/60">
              {plans.length > 0
                ? `共 ${plans.length} 条计划`
                : '设置每日服药提醒'}
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenNew}
          aria-label="添加计划"
          className="glass-tile flex h-10 w-10 items-center justify-center rounded-full text-teal-600 transition hover:bg-teal-50"
        >
          <Plus className="h-5 w-5" />
        </button>
      </motion.header>

      {/* 列表 / 空状态 */}
      {plans.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card relative overflow-hidden rounded-3xl py-16 text-center"
        >
          <div className="glass-orb -right-8 -top-8 h-28 w-28 bg-teal-300/20" />
          <div className="glass-shimmer" />
          <div className="relative z-10">
            <div className="text-5xl">💊</div>
            <p className="mt-3 text-sm text-teal-600/60">
              暂无服药计划，点击右上角添加
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.3) }}
            >
              <PlanCard
                plan={plan}
                onToggle={() => handleToggle(plan)}
                onEdit={() => handleOpenEdit(plan.id)}
                onDelete={() => setConfirmDeleteId(plan.id)}
                confirmingDelete={confirmDeleteId === plan.id}
                onConfirmDelete={() => handleDelete(plan.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* 编辑抽屉（新建 / 编辑共用） */}
      <MedicationPlanEditor
        open={editorOpen}
        onClose={handleCloseEditor}
        planId={editingId}
      />
    </div>
  );
}

interface PlanCardProps {
  plan: MedicationPlanItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  confirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function PlanCard({
  plan,
  onToggle,
  onEdit,
  onDelete,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        'glass-card relative overflow-hidden rounded-3xl p-5 transition',
        !plan.enabled && 'opacity-60'
      )}
    >
      <div className="glass-orb -right-8 -top-8 h-24 w-24 bg-teal-300/20" />
      <div className="glass-shimmer" />
      <div className="relative z-10">
        {/* 顶部行：emoji + 名称 + 开关 */}
        <div className="flex items-start gap-3">
          <div className="glass-tile flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl">
            {plan.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-teal-700">
              {plan.medicationName}
            </h3>
            <p className="mt-0.5 text-xs text-teal-600/70">
              每次 <span className="font-semibold">{plan.dosage}</span>{' '}
              {plan.unit}
            </p>
          </div>
          <ToggleSwitch checked={plan.enabled} onChange={onToggle} />
        </div>

        {/* 时间列表 */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 flex-shrink-0 text-teal-500" />
          {plan.times.map((t) => (
            <span
              key={t}
              className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-600 ring-1 ring-teal-200"
            >
              {t}
            </span>
          ))}
        </div>

        {/* 重复日 */}
        <div className="mt-2 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-teal-500/80" />
          <span className="text-[11px] text-teal-600/80">
            {formatDays(plan.daysOfWeek)}
          </span>
        </div>

        {/* 备注 */}
        {plan.notes && (
          <p className="mt-2 rounded-xl bg-cream-100/60 px-3 py-1.5 text-[11px] text-teal-600/70">
            {plan.notes}
          </p>
        )}

        {/* 底部操作按钮 */}
        <div className="mt-3 flex items-center justify-end gap-2">
          {confirmingDelete ? (
            <>
              <span className="mr-1 text-[11px] text-clay-500">
                确认删除？
              </span>
              <button
                onClick={onConfirmDelete}
                className="rounded-lg bg-clay-400 px-3 py-1 text-xs font-medium text-white transition hover:bg-clay-500"
              >
                删除
              </button>
              <button
                onClick={onCancelDelete}
                className="rounded-lg border border-cream-300 px-3 py-1 text-xs text-teal-600 transition hover:bg-cream-100"
              >
                取消
              </button>
            </>
          ) : (
            <>
              <span
                className={cn(
                  'mr-1 inline-flex items-center gap-0.5 text-[11px]',
                  plan.enabled ? 'text-sage-600' : 'text-teal-600/50'
                )}
              >
                {plan.enabled ? (
                  <>
                    <Bell className="h-3 w-3" /> 已开启
                  </>
                ) : (
                  <>
                    <BellOff className="h-3 w-3" /> 已关闭
                  </>
                )}
              </span>
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1 rounded-lg border border-cream-300 px-3 py-1.5 text-xs font-medium text-teal-600 transition hover:bg-cream-100"
              >
                <Pencil className="h-3 w-3" /> 编辑
              </button>
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1 rounded-lg border border-clay-200 bg-clay-50 px-3 py-1.5 text-xs font-medium text-clay-600 transition hover:bg-clay-100"
              >
                <Trash2 className="h-3 w-3" /> 删除
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** iOS 风格开关 */
function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition',
        checked
          ? 'bg-gradient-to-br from-teal-500 to-sage-500'
          : 'bg-cream-300'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}
