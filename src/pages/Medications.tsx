/**
 * 药物页
 *
 * - 顶部搜索 + 分类筛选
 * - 按分类分组的药物卡片
 * - 点击药物卡片 → 详情抽屉（大图 + 介绍 + 使用说明 + 成分）
 * - 浮动按钮：添加自定义药物
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Clock, Beaker, AlertCircle, BookOpen, Pill as PillIcon, Check, Activity, Baby, UserCheck, ShieldAlert, ClipboardList, Loader2, ChevronRight, BellRing } from 'lucide-react';
import { useMedicationsStore } from '@/store/useMedicationsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useMedicationPlanStore } from '@/store/useMedicationPlanStore';
import { MEDICATION_CATEGORIES } from '@/data/medications';
import { cn } from '@/lib/utils';
import { fetchBaikeDetail, type BaikeDetail } from '@/lib/baikeService';
import { fetchWikiDetail, type WikiDetail } from '@/lib/wikiSearchService';
import { findMedicationBaike } from '@/data/baikeDatabase';
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
  const navigate = useNavigate();
  const enabledPlans = useMedicationPlanStore((s) => s.getEnabledPlans().length);

  const allMedications = [...customMedications, ...builtinMedications];

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MedicationCategory | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Medication | null>(null);
  const [saved, setSaved] = useState(false);
  const [baikeSearching, setBaikeSearching] = useState(false);
  const [baikeError, setBaikeError] = useState<string | null>(null);

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

  // 从离线百科或百度百科搜索并自动添加药物
  const handleBaikeSearch = async () => {
    const keyword = query.trim();
    if (!keyword) return;
    setBaikeSearching(true);
    setBaikeError(null);
    try {
      let medName = '';

      // 1. 先查离线百科数据库
      const offlineBaike = findMedicationBaike(keyword);
      if (offlineBaike) {
        medName = keyword;
        addMedication({
          name: keyword,
          emoji: offlineBaike.emoji,
          category: offlineBaike.category,
          description: offlineBaike.description,
          indications: offlineBaike.indications,
          pharmacokinetics: offlineBaike.pharmacokinetics,
          contraindications: offlineBaike.contraindications,
          sideEffects: offlineBaike.sideEffects,
          warnings: offlineBaike.warnings,
          useInPregnancy: offlineBaike.useInPregnancy,
          useInChildren: offlineBaike.useInChildren,
          useInElderly: offlineBaike.useInElderly,
          drugInteractions: offlineBaike.drugInteractions,
          storage: offlineBaike.storage,
          overdose: offlineBaike.overdose,
          image: offlineBaike.image,
          usage: {
            unit: '片',
            defaultDose: 1,
            frequency: '每日1次',
            timing: '饭后',
          },
          level: 'medium',
        });
      } else {
        // 2. 离线库没有，联网搜索百度百科（CORS 代理）
        const baike: BaikeDetail | null = await fetchBaikeDetail(keyword);
        if (baike) {
          medName = keyword;
          addMedication({
            name: keyword,
            emoji: '💊',
            category: 'other',
            purpose: baike.description,
            description: baike.summary,
            image: baike.image,
            indications: baike.indications,
            pharmacokinetics: baike.pharmacokinetics,
            contraindications: baike.contraindications,
            sideEffects: baike.sideEffects,
            warnings: baike.warnings,
            useInPregnancy: baike.useInPregnancy,
            useInChildren: baike.useInChildren,
            useInElderly: baike.useInElderly,
            drugInteractions: baike.drugInteractions,
            storage: baike.storage,
            overdose: baike.overdose,
            usage: {
              unit: '片',
              defaultDose: 1,
              frequency: '每日1次',
              timing: '饭后',
            },
            level: 'medium',
          });
        } else {
          // 3. 百度百科也失败，回退到维基百科
          const wiki: WikiDetail | null = await fetchWikiDetail(keyword);
          if (!wiki) {
            setBaikeError('未找到相关内容');
            return;
          }
          medName = keyword;
          addMedication({
            name: keyword,
            emoji: '💊',
            category: 'other',
            description: wiki.summary,
            image: wiki.image,
            usage: {
              unit: '片',
              defaultDose: 1,
              frequency: '每日1次',
              timing: '饭后',
            },
            level: 'medium',
          });
        }
      }
      // 从最新 store 状态中找到新添加的药物并打开详情抽屉
      const latest = useMedicationsStore.getState().customMedications;
      const newMed = [...latest].reverse().find((m) => m.name === medName);
      if (newMed) {
        setSelected(newMed);
        setQuery('');
      }
    } catch {
      setBaikeError('未找到相关内容');
    } finally {
      setBaikeSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="font-serif text-3xl font-semibold text-teal-700">药物库</h1>
        <p className="mt-1 text-sm text-teal-600/60">
          共 {allMedications.length} 种药物，可添加自定义药物
        </p>
      </motion.header>

      {/* 服药计划入口 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate('/medication-plan')}
        className="glass-card relative w-full overflow-hidden rounded-3xl p-4 text-left transition hover:shadow-soft"
      >
        <div className="glass-orb -right-8 -top-8 h-28 w-28 bg-amber-300/20" />
        <div className="glass-shimmer" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-soft">
            <BellRing className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-lg font-semibold text-teal-700">服药计划</h2>
            <p className="text-xs text-teal-600/60">
              {enabledPlans > 0 ? `${enabledPlans} 个启用中的提醒` : '点击设置服药提醒'}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-teal-600/40" />
        </div>
      </motion.button>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setBaikeError(null); }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
        <div className="glass-card space-y-4 rounded-3xl py-12 text-center">
          <p className="text-sm text-teal-600/60">未找到匹配的药物</p>
          {query.trim() && !baikeSearching && !baikeError && (
            <button
              onClick={handleBaikeSearch}
              className="inline-flex items-center gap-2 rounded-xl glass-tile px-4 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50"
            >
              🌐 搜索百科 '{query}'
            </button>
          )}
          {baikeSearching && (
            <div className="inline-flex items-center gap-2 text-sm text-teal-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在搜索百科...
            </div>
          )}
          {baikeError && (
            <p className="text-sm text-clay-500">{baikeError}</p>
          )}
          <div>
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm font-medium text-teal-600 underline"
            >
              添加自定义药物
            </button>
          </div>
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
        kind="medication"
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
            label: '用法用量',
            content: selected ? (
              <div className="space-y-1">
                <div>剂量：每次 <span className="font-semibold">{selected.usage.defaultDose}</span> {selected.usage.unit}</div>
                <div>频次：{selected.usage.frequency}</div>
                <div>时间：{selected.usage.timing}</div>
                {selected.usageNotes && <div className="pt-1 text-teal-600/60">{selected.usageNotes}</div>}
              </div>
            ) : null,
          },
          selected?.ingredients ? {
            icon: FieldIcons.ingredients,
            label: '主要成分',
            content: selected.ingredients,
          } : null,
          selected?.contraindications ? {
            icon: <AlertCircle className="h-3.5 w-3.5" />,
            label: '禁忌症',
            content: selected.contraindications,
          } : null,
          selected?.sideEffects ? {
            icon: FieldIcons.sideEffects,
            label: '不良反应',
            content: selected.sideEffects,
          } : null,
          selected?.pharmacology ? {
            icon: <Beaker className="h-3.5 w-3.5" />,
            label: '药理毒理',
            content: selected.pharmacology,
          } : null,
          selected?.drugInteractions ? {
            icon: <BookOpen className="h-3.5 w-3.5" />,
            label: '药物相互作用',
            content: selected.drugInteractions,
          } : null,
          selected?.indications ? {
            icon: <ClipboardList className="h-3.5 w-3.5" />,
            label: '适应症',
            content: selected.indications,
          } : null,
          selected?.pharmacokinetics ? {
            icon: <Activity className="h-3.5 w-3.5" />,
            label: '药代动力学',
            content: selected.pharmacokinetics,
          } : null,
          selected?.warnings ? {
            icon: <ShieldAlert className="h-3.5 w-3.5" />,
            label: '警告与注意事项',
            content: selected.warnings,
          } : null,
          selected?.overdose ? {
            icon: <AlertCircle className="h-3.5 w-3.5" />,
            label: '药物过量',
            content: selected.overdose,
          } : null,
          selected?.useInPregnancy ? {
            icon: <Baby className="h-3.5 w-3.5" />,
            label: '孕妇及哺乳期妇女用药',
            content: selected.useInPregnancy,
          } : null,
          selected?.useInChildren ? {
            icon: <Baby className="h-3.5 w-3.5" />,
            label: '儿童用药',
            content: selected.useInChildren,
          } : null,
          selected?.useInElderly ? {
            icon: <UserCheck className="h-3.5 w-3.5" />,
            label: '老年患者用药',
            content: selected.useInElderly,
          } : null,
          selected?.storage || selected?.packaging || selected?.shelfLife ? {
            label: '贮藏 / 包装 / 有效期',
            content: (
              <div className="space-y-0.5">
                {selected?.storage && <div>贮藏：{selected.storage}</div>}
                {selected?.packaging && <div>包装：{selected.packaging}</div>}
                {selected?.shelfLife && <div>有效期：{selected.shelfLife}</div>}
              </div>
            ),
          } : null,
          selected?.manufacturer || selected?.approvalNumber ? {
            label: '生产企业 / 批准文号',
            content: (
              <div className="space-y-0.5">
                {selected?.manufacturer && <div>{selected.manufacturer}</div>}
                {selected?.approvalNumber && <div className="text-teal-600/60">{selected.approvalNumber}</div>}
              </div>
            ),
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
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}
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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-teal-700/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-white/90 p-4 shadow-soft-lg backdrop-blur-xl"
      >
        <div className="relative z-10 flex items-center justify-between border-b border-cream-200 p-1 pb-3">
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
