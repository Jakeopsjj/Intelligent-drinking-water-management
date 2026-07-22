/**
 * 药物页
 *
 * - 顶部搜索 + 分类筛选
 * - 按分类分组的药物卡片
 * - 点击药物卡片 → 详情抽屉（大图 + 介绍 + 使用说明 + 成分）
 * - 浮动按钮：添加自定义药物
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Clock, Beaker, AlertCircle, Pill as PillIcon, Check } from 'lucide-react';
import { useMedicationsStore } from '@/store/useMedicationsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { MEDICATION_CATEGORIES } from '@/data/medications';
import { cn } from '@/lib/utils';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import DetailDrawer, { FieldIcons } from '@/components/DetailDrawer';
import type { Medication, MedicationCategory } from '@/types';

export default function Medications() {
  const builtinMedications = useMedicationsStore((s) => s.builtinMedications);
  const customMedications = useMedicationsStore((s) => s.customMedications);
  const addMedication = useMedicationsStore((s) => s.addMedication);
  const deleteMedication = useMedicationsStore((s) => s.deleteMedication);
  const addMedicationRecord = useRecordsStore((s) => s.addMedicationRecord);

  const allMedications = [...customMedications, ...builtinMedications];

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MedicationCategory | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Medication | null>(null);
  const [saved, setSaved] = useState(false);

  useOverlayBackHandler(showAdd, () => setShowAdd(false));

  const filtered = allMedications.filter((m) => {
    const matchQuery =
      !query.trim() ||
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.purpose?.toLowerCase().includes(query.toLowerCase());
    const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchQuery && matchCat;
  });

  // 分组
  const grouped: Record<MedicationCategory, Medication[]> = {
    'phosphate-binder': [],
    vitamin: [],
    antihypertensive: [],
    esa: [],
    iron: [],
    other: [],
  };
  for (const m of filtered) grouped[m.category].push(m);

  const handleQuickAdd = (med: Medication) => {
    addMedicationRecord({ medication: med });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl font-semibold text-teal-700">药物库</h1>
        <p className="mt-1 text-sm text-teal-600/60">
          共 {allMedications.length} 种药物，可添加自定义药物
        </p>
      </motion.header>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索药物名称或作用"
          className="glass-tile w-full rounded-2xl py-3 pl-11 pr-4 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-teal-600/40 hover:bg-cream-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <CategoryChip
          active={selectedCategory === 'all'}
          onClick={() => setSelectedCategory('all')}
          label="全部"
        />
        {(Object.keys(MEDICATION_CATEGORIES) as MedicationCategory[]).map((cat) => (
          <CategoryChip
            key={cat}
            active={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
            label={MEDICATION_CATEGORIES[cat].name}
          />
        ))}
      </div>

      {/* 分组列表 */}
      {(Object.keys(grouped) as MedicationCategory[]).map((cat) => {
        const list = grouped[cat];
        if (list.length === 0) return null;
        return (
          <motion.section
            key={cat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card relative overflow-hidden rounded-3xl p-6"
          >
            <div className="glass-orb -right-8 -top-8 h-28 w-28 bg-blue-300/20" />
            <div className="glass-shimmer" />
            <div className="relative z-10 mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-teal-700">
                {MEDICATION_CATEGORIES[cat].name}
              </h2>
              <span className="text-xs text-teal-600/60">{list.length} 种</span>
            </div>
            <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((med) => (
                <MedicationCard
                  key={med.id}
                  med={med}
                  onClick={() => setSelected(med)}
                />
              ))}
            </div>
          </motion.section>
        );
      })}

      {filtered.length === 0 && (
        <div className="glass-card rounded-3xl py-16 text-center">
          <p className="text-sm text-teal-600/60">未找到匹配的药物</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 text-sm font-medium text-teal-600 underline"
          >
            添加自定义药物
          </button>
        </div>
      )}

      {/* 浮动添加按钮 */}
      <button
        onClick={() => setShowAdd(true)}
        className="glass-btn fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-sage-500 text-white shadow-soft-lg transition hover:scale-105 active:scale-95 md:bottom-8"
        aria-label="添加药物"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* 详情抽屉 */}
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        image={selected?.image}
        name={selected?.name ?? ''}
        emoji={selected?.emoji ?? '💊'}
        subtitle={selected?.purpose}
        badges={
          selected ? (
            <>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium ring-1', MEDICATION_CATEGORIES[selected.category].bg, MEDICATION_CATEGORIES[selected.category].color, MEDICATION_CATEGORIES[selected.category].ring)}>
                {MEDICATION_CATEGORIES[selected.category].name}
              </span>
              {selected.usage.schedule?.map((t) => (
                <span key={t} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-600 ring-1 ring-teal-200">
                  {t}
                </span>
              ))}
            </>
          ) : null
        }
        description={selected?.description}
        fields={[
          {
            icon: FieldIcons.usage,
            label: '使用方法',
            content: selected ? (
              <div className="space-y-1">
                <div>剂量：每次 <span className="font-semibold">{selected.usage.defaultDose}</span> {selected.usage.unit}</div>
                <div>频次：{selected.usage.frequency}</div>
                <div>时间：{selected.usage.timing}</div>
                {selected.usageNotes && <div className="pt-1">{selected.usageNotes}</div>}
              </div>
            ) : null,
          },
          selected?.ingredients ? {
            icon: FieldIcons.ingredients,
            label: '主要成分',
            content: selected.ingredients,
          } : null,
          selected?.sideEffects ? {
            icon: FieldIcons.sideEffects,
            label: '常见副作用',
            content: selected.sideEffects,
          } : null,
        ].filter(Boolean) as any}
        footer={
          selected && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleQuickAdd(selected)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition',
                  saved
                    ? 'bg-sage-500 text-white'
                    : 'bg-gradient-to-br from-teal-500 to-sage-500 text-white hover:shadow-soft'
                )}
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" /> 已记录
                  </>
                ) : (
                  <>
                    <PillIcon className="h-4 w-4" /> 记录一次服药
                  </>
                )}
              </button>
              {selected.isCustom && (
                <button
                  onClick={() => {
                    deleteMedication(selected.id);
                    setSelected(null);
                  }}
                  className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                >
                  删除
                </button>
              )}
            </div>
          )
        }
      />

      {/* 添加药物抽屉 */}
      <AnimatePresence>
        {showAdd && (
          <AddMedicationDrawer
            onClose={() => setShowAdd(false)}
            onAdd={(med) => {
              addMedication(med);
              setShowAdd(false);
            }}
            customCount={customMedications.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'bg-teal-500 text-white shadow-soft'
          : 'glass-tile text-teal-600 hover:bg-teal-50'
      )}
    >
      {label}
    </button>
  );
}

function MedicationCard({ med, onClick }: { med: Medication; onClick: () => void }) {
  const cat = MEDICATION_CATEGORIES[med.category];
  return (
    <button
      onClick={onClick}
      className="glass-tile group relative overflow-hidden rounded-2xl p-4 text-left transition hover:shadow-soft"
    >
      <div className="relative z-10 flex items-start gap-3">
        <div className="glass-tile flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl">
          {med.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-medium text-teal-700">{med.name}</h3>
            {med.isCustom && (
              <span className="rounded-full bg-sage-100 px-1.5 py-0.5 text-[9px] font-medium text-sage-600">自定义</span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-teal-600/60">{med.purpose}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-medium ring-1', cat.bg, cat.color, cat.ring)}>
              {cat.name}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-cream-100 px-2 py-0.5 text-[9px] text-teal-600/70">
              <Clock className="h-2.5 w-2.5" /> {med.usage.frequency}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function AddMedicationDrawer({
  onClose,
  onAdd,
  customCount,
}: {
  onClose: () => void;
  onAdd: (med: Omit<Medication, 'id' | 'isCustom'>) => void;
  customCount: number;
}) {
  useLockBodyScroll(true);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💊');
  const [category, setCategory] = useState<MedicationCategory>('other');
  const [purpose, setPurpose] = useState('');
  const [unit, setUnit] = useState('片');
  const [defaultDose, setDefaultDose] = useState('1');
  const [frequency, setFrequency] = useState('每日1次');
  const [timing, setTiming] = useState('饭后');
  const [description, setDescription] = useState('');
  const [usageNotes, setUsageNotes] = useState('');
  const [ingredients, setIngredients] = useState('');

  const canSave = name.trim() && unit.trim();

  const handleSave = () => {
    if (!canSave) return;
    onAdd({
      name: name.trim(),
      emoji: emoji || '💊',
      category,
      purpose: purpose.trim() || undefined,
      description: description.trim() || undefined,
      usageNotes: usageNotes.trim() || undefined,
      ingredients: ingredients.trim() || undefined,
      usage: {
        unit: unit.trim(),
        defaultDose: Number(defaultDose) || 1,
        frequency: frequency.trim() || '每日1次',
        timing: timing.trim() || '饭后',
      },
      level: 'medium',
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-teal-700/40 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl [will-change:transform] [transform:translateZ(0)]"
      >
        <div className="glass-shimmer" />
        <div className="relative z-10 flex items-center justify-between border-b border-cream-200 p-4">
          <h3 className="font-medium text-teal-700">添加自定义药物</h3>
          <button onClick={onClose} className="glass-tile rounded-full p-1.5 text-teal-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative z-10 max-h-[calc(90dvh-64px)] overflow-y-auto p-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-14 rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-center text-xl"
                maxLength={2}
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="药物名称（必填）"
                className="flex-1 rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MedicationCategory)}
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 focus:border-teal-400"
            >
              {(Object.keys(MEDICATION_CATEGORIES) as MedicationCategory[]).map((cat) => (
                <option key={cat} value={cat}>{MEDICATION_CATEGORIES[cat].name}</option>
              ))}
            </select>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="主要作用（如：磷结合剂，降血磷）"
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={defaultDose}
                onChange={(e) => setDefaultDose(e.target.value)}
                type="number"
                min={0}
                placeholder="单次剂量（如 1）"
                className="rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              />
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="单位（片/粒/ml）"
                className="rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              />
            </div>
            <input
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="频次（如：每日3次）"
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
            />
            <input
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              placeholder="服用时间（如：饭后/空腹）"
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="药物介绍（可选，留空将自动联网获取）"
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              rows={2}
            />
            <textarea
              value={usageNotes}
              onChange={(e) => setUsageNotes(e.target.value)}
              placeholder="使用说明 / 注意事项（可选）"
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              rows={2}
            />
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="主要成分（可选）"
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              rows={2}
            />
          </div>
          <div className="mt-4 flex gap-2">
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
              保存
            </button>
          </div>
          {customCount > 0 && (
            <p className="mt-3 text-center text-[10px] text-teal-600/40">
              已添加 {customCount} 种自定义药物
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
