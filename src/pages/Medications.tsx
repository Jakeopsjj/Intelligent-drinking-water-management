/**
 * 药物板块（重构版）
 *
 * 流程：
 * 1. 顶部搜索框，输入药物名称
 * 2. 关键词匹配自动判断分类（降压药/磷结合剂/铁剂等）
 * 3. 添加到列表，按分类分组展示
 * 4. 卡片：名称 + 分类标签 + 用法
 * 5. 详情页：完整药物信息
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, ChevronRight, BellRing, Clock, Pill as PillIcon, Check } from 'lucide-react';
import { useMedicationsStore } from '@/store/useMedicationsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useMedicationPlanStore } from '@/store/useMedicationPlanStore';
import { MEDICATION_CATEGORIES } from '@/data/medications';
import { cn } from '@/lib/utils';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEntityInfo } from '@/hooks/useEntityInfo';
import type { Medication, MedicationCategory } from '@/types';

export default function Medications() {
  const builtinMedications = useMedicationsStore((s) => s.builtinMedications);
  const customMedications = useMedicationsStore((s) => s.customMedications);
  const addMedication = useMedicationsStore((s) => s.addMedication);
  const deleteMedication = useMedicationsStore((s) => s.deleteMedication);
  const addMedicationRecord = useRecordsStore((s) => s.addMedicationRecord);
  const navigate = useNavigate();
  const enabledPlans = useMedicationPlanStore((s) => s.getEnabledPlans().length);

  const allMedications = [...customMedications, ...builtinMedications];

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MedicationCategory | 'all'>('all');
  const [selected, setSelected] = useState<Medication | null>(null);
  const [saved, setSaved] = useState(false);

  useOverlayBackHandler(!!selected, () => setSelected(null));
  useLockBodyScroll(!!selected);

  // 关键词分类
  const guessCategory = useCallback((name: string): MedicationCategory => {
    const n = name.toLowerCase();
    if (/碳酸钙|醋酸钙|司维拉姆|碳酸镧|氢氧化铝|磷结合|降磷/.test(n)) return 'phosphate-binder';
    if (/硝苯地平|氨氯地平|缬沙坦|氯沙坦|厄贝沙坦|替米沙坦|美托洛尔|比索洛尔|卡托普利|依那普利|培哚普利|降压|地平|沙坦|洛尔|普利/.test(n)) return 'antihypertensive';
    if (/促红|红细胞生成素|达依泊汀|epo|esa/.test(n)) return 'esa';
    if (/蔗糖铁|多糖铁|硫酸亚铁|琥珀酸亚铁|富马酸亚铁|铁剂|补铁/.test(n)) return 'iron';
    if (/维生素|叶酸|骨化三醇|维生素d|vitamin|b族/.test(n)) return 'vitamin';
    return 'other';
  }, []);

  const handleSearch = useCallback(async () => {
    const keyword = query.trim();
    if (!keyword || searching) return;
    setSearching(true);
    setError(null);
    try {
      const category = guessCategory(keyword);

      addMedication({
        name: keyword,
        emoji: '💊',
        category,
        usage: {
          unit: '片',
          defaultDose: 1,
          frequency: '每日1次',
          timing: '饭后',
        },
        level: 'medium',
      });

      const latest = useMedicationsStore.getState().customMedications;
      const newMed = [...latest].reverse().find((m) => m.name === keyword);
      if (newMed) {
        setSelected(newMed);
        setQuery('');
      }
    } catch {
      setError('添加失败，请重试');
    } finally {
      setSearching(false);
    }
  }, [query, searching, addMedication, guessCategory]);

  const handleQuickAdd = (med: Medication) => {
    addMedicationRecord({ medication: med });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  // 过滤
  const filtered = allMedications.filter((m) => {
    const matchQuery = !query.trim() || m.name.toLowerCase().includes(query.toLowerCase());
    const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchQuery && matchCat;
  });

  // 分组
  const grouped: Record<MedicationCategory, Medication[]> = {
    'phosphate-binder': [],
    'vitamin': [],
    'antihypertensive': [],
    'esa': [],
    'iron': [],
    'other': [],
  };
  for (const m of filtered) grouped[m.category].push(m);

  return (
    <div className="space-y-4">
      {/* 服药计划入口 */}
      <button
        onClick={() => navigate('/medication-plan')}
        className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-left transition hover:shadow-sm"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-medium text-teal-700">服药计划</h2>
          <p className="text-xs text-teal-600/60">
            {enabledPlans > 0 ? `${enabledPlans} 个启用中的提醒` : '点击设置服药提醒'}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-teal-600/40" />
      </button>

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索药物名称（如：硝苯地平缓释片）"
            className="w-full rounded-xl border border-cream-300 bg-white py-2.5 pl-10 pr-4 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="flex-shrink-0 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-600 disabled:opacity-40"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : '搜索'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition',
            selectedCategory === 'all'
              ? 'bg-teal-500 text-white'
              : 'bg-cream-100 text-teal-600'
          )}
        >
          全部
        </button>
        {(Object.keys(MEDICATION_CATEGORIES) as MedicationCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              selectedCategory === cat
                ? 'bg-teal-500 text-white'
                : 'bg-cream-100 text-teal-600'
            )}
          >
            {MEDICATION_CATEGORIES[cat].name}
          </button>
        ))}
      </div>

      {/* 药物列表 */}
      {(Object.keys(grouped) as MedicationCategory[]).map((cat) => {
        const meds = grouped[cat];
        if (meds.length === 0) return null;
        return (
          <div key={cat}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  MEDICATION_CATEGORIES[cat].bg,
                  MEDICATION_CATEGORIES[cat].color
                )}
              >
                {MEDICATION_CATEGORIES[cat].name}
              </span>
              <span className="text-xs text-teal-600/50">{meds.length} 种</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {meds.map((med) => (
                <MedicationCard
                  key={med.id}
                  med={med}
                  onClick={() => setSelected(med)}
                  onQuickAdd={() => handleQuickAdd(med)}
                  onDelete={med.isCustom ? () => deleteMedication(med.id) : undefined}
                  saved={saved && selected?.id === med.id}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* 详情弹层 */}
      <AnimatePresence>
        {selected && (
          <MedicationDetail
            med={selected}
            onClose={() => setSelected(null)}
            onQuickAdd={() => handleQuickAdd(selected)}
            saved={saved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** 药物卡片 */
function MedicationCard({
  med,
  onClick,
  onQuickAdd,
  onDelete,
  saved,
}: {
  med: Medication;
  onClick: () => void;
  onQuickAdd: () => void;
  onDelete?: () => void;
  saved: boolean;
}) {
  const cat = MEDICATION_CATEGORIES[med.category];
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <button onClick={onClick} className="flex flex-1 items-center gap-3 text-left">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-cream-50 text-2xl">
            {med.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-teal-700">{med.name}</h3>
            {med.purpose && (
              <p className="mt-0.5 truncate text-xs text-teal-600/60">{med.purpose}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', cat.bg, cat.color)}>
                {cat.name}
              </span>
              <span className="text-[10px] text-teal-600/50">
                {med.usage.defaultDose}{med.usage.unit} · {med.usage.frequency}
              </span>
            </div>
          </div>
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onQuickAdd}
          className="flex items-center gap-1.5 rounded-lg bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-600 transition hover:bg-sage-100"
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <PillIcon className="h-3.5 w-3.5" />}
          {saved ? '已记录' : '记录服药'}
        </button>
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 rounded-lg bg-cream-100 px-3 py-1.5 text-xs font-medium text-teal-600 transition hover:bg-cream-200"
        >
          详情
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto text-xs text-red-400 hover:text-red-600"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}

/** 药物详情弹层 */
function MedicationDetail({
  med,
  onClose,
  onQuickAdd,
  saved,
}: {
  med: Medication;
  onClose: () => void;
  onQuickAdd: () => void;
  saved: boolean;
}) {
  const cat = MEDICATION_CATEGORIES[med.category];
  const { images, description, loading } = useEntityInfo(
    med.name,
    'medication',
    med.image,
    med.description
  );
  const fields: { label: string; value?: string }[] = [
    { label: '主要作用', value: med.purpose },
    { label: '药物介绍', value: med.description },
    { label: '适应症', value: med.indications },
    { label: '用法用量', value: `${med.usage.defaultDose}${med.usage.unit}，${med.usage.frequency}，${med.usage.timing}` },
    { label: '使用说明', value: med.usageNotes },
    { label: '主要成分', value: med.ingredients },
    { label: '不良反应', value: med.sideEffects },
    { label: '禁忌症', value: med.contraindications },
    { label: '药理毒理', value: med.pharmacology },
    { label: '药物相互作用', value: med.drugInteractions },
    { label: '贮藏', value: med.storage },
  ];

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[101] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{med.emoji}</span>
            <div>
              <h3 className="text-lg font-semibold text-teal-700">{med.name}</h3>
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-medium', cat.bg, cat.color)}>
                {cat.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-100 text-teal-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-4">
          {/* 药盒配图 */}
          {images && images.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <motion.img
                  key={i}
                  src={img}
                  alt={`${med.name} ${i + 1}`}
                  className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ))}
            </div>
          ) : loading ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-cream-100">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600/40" />
            </div>
          ) : null}

          {/* 介绍（联网获取；静态介绍由下方"药物介绍"字段展示，避免重复） */}
          {description && !med.description && (
            <div className="rounded-2xl border border-cream-200 p-4">
              <h4 className="mb-1.5 text-sm font-medium text-teal-700">介绍</h4>
              <p className="text-sm leading-relaxed text-teal-600/80">{description}</p>
            </div>
          )}

          {/* 用法用量 */}
          <div className="rounded-2xl bg-cream-50 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-teal-700">
              <Clock className="h-4 w-4" /> 用法用量
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xs text-teal-600/60">剂量</div>
                <div className="mt-1 text-base font-bold text-teal-700">{med.usage.defaultDose}<span className="ml-0.5 text-xs font-normal text-teal-600/40">{med.usage.unit}</span></div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xs text-teal-600/60">频次</div>
                <div className="mt-1 text-sm font-bold text-teal-700">{med.usage.frequency}</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xs text-teal-600/60">时间</div>
                <div className="mt-1 text-sm font-bold text-teal-700">{med.usage.timing}</div>
              </div>
            </div>
          </div>

          {/* 详细信息 */}
          {fields.filter((f) => f.value).map((f, i) => (
            <div key={i} className="rounded-2xl border border-cream-200 p-4">
              <h4 className="mb-1.5 text-sm font-medium text-teal-700">{f.label}</h4>
              <p className="text-sm leading-relaxed text-teal-600/80">{f.value}</p>
            </div>
          ))}

          {/* 快速记录 */}
          <button
            onClick={onQuickAdd}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white transition',
              saved ? 'bg-sage-400' : 'bg-sage-500 hover:bg-sage-600'
            )}
          >
            {saved ? <Check className="h-4 w-4" /> : <PillIcon className="h-4 w-4" />}
            {saved ? '已记录服药' : `记录服药 ${med.usage.defaultDose}${med.usage.unit}`}
          </button>
        </div>
      </motion.div>
    </>
  );
}
