/**
 * 水果板块（重构版）
 *
 * 流程：
 * 1. 顶部搜索框，输入关键词点搜索
 * 2. 先查本地库（customFruits + fruits）按 name 匹配
 * 3. 本地有 → 直接打开该水果详情页
 * 4. 本地没有 → 调 searchWikiFruits 拿维基候选 → 弹出底部抽屉选择
 * 5. 选中 → 调 apihz.cn 营养API + fetchEntityInfo 维基图文 → 添加 → 打开详情
 * 6. 详情页：维基配图 + 介绍（联网）+ 每100g元素含量（钾磷钠水）+ 食用建议 + 记录摄入
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Droplet, FlaskConical, Beaker, Atom, ChevronRight, Info } from 'lucide-react';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { LEVEL_TEXT, LEVEL_COLORS, formatWeightKg, getLevelFromPotassium } from '@/utils/calc';
import { cn } from '@/lib/utils';
import { fetchFoodNutrition, type FoodNutrition } from '@/lib/foodNutritionService';
import { searchWikiFruits, fetchEntityInfo, type WikiSearchItem } from '@/lib/wikiService';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEntityInfo } from '@/hooks/useEntityInfo';
import type { Fruit } from '@/types';

export default function Fruits() {
  // 注意：不能用 useFruitsStore((s) => s.allFruits())
  // 因为 allFruits() 每次返回新数组引用，会触发 Zustand 无限重渲染 → 白屏
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const allFruits = [...customFruits, ...builtinFruits];
  const addFruit = useFruitsStore((s) => s.addFruit);
  const deleteFruit = useFruitsStore((s) => s.deleteFruit);
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Fruit | null>(null);
  const [weight, setWeight] = useState('100');
  // 维基候选选择浮层（本地未命中时弹出）
  const [candidates, setCandidates] = useState<WikiSearchItem[]>([]);

  // 候选浮层与详情浮层互斥，分别注册返回处理；useLockBodyScroll 用引用计数兼容叠加
  useOverlayBackHandler(!!selected, () => setSelected(null));
  useOverlayBackHandler(candidates.length > 0, () => setCandidates([]));
  useLockBodyScroll(!!selected || candidates.length > 0);

  const closeCandidateDrawer = useCallback(() => setCandidates([]), []);

  const handleSearch = useCallback(async () => {
    const keyword = query.trim();
    if (!keyword || searching) return;
    setSearching(true);
    setError(null);

    // 1. 先查本地库（customFruits + fruits），按 name 精确匹配
    const state = useFruitsStore.getState();
    const local = [...state.customFruits, ...state.fruits].find(
      (f) => f.name === keyword
    );
    if (local) {
      // 本地有 → 直接打开详情，不再调 apihz 重复添加
      setSelected(local);
      setQuery('');
      setSearching(false);
      return;
    }

    // 2. 本地没有 → 联网搜索维基候选
    try {
      const results = await searchWikiFruits(keyword);
      if (results.length === 0) {
        setError('未找到相关水果，试试其他关键词');
        return;
      }
      setCandidates(results);
    } catch {
      setError('搜索失败，请重试');
    } finally {
      setSearching(false);
    }
  }, [query, searching]);

  const handleSelectCandidate = useCallback(
    async (item: WikiSearchItem) => {
      if (searching) return;
      const title = item.title;
      // 关闭候选浮层，进入「添加中」状态（搜索按钮显示 Loader2）
      setCandidates([]);
      setSearching(true);
      setError(null);
      try {
        // 并发拿营养数据 + 维基图文
        const [nutrition, entity] = await Promise.all([
          fetchFoodNutrition(title),
          fetchEntityInfo(title, 'fruit'),
        ]);
        if (!nutrition) {
          setError('未找到该食物的营养数据');
          return;
        }
        addFruit({
          name: title,
          emoji: '🍇',
          potassiumPer100g: nutrition.potassium,
          phosphorusPer100g: nutrition.phosphorus,
          sodiumPer100g: nutrition.sodium,
          waterPer100g: nutrition.water,
          suggestion: '请根据医嘱适量食用',
          // 维基介绍作为 fruit.description（详情页由「维基介绍」块展示）
          description: entity.description,
        });

        // 找到刚添加的水果并打开详情
        const latest = useFruitsStore.getState().customFruits;
        const newFruit = [...latest].reverse().find((f) => f.name === title);
        if (newFruit) {
          setSelected(newFruit);
          setQuery('');
        }
      } catch {
        setError('添加失败，请重试');
      } finally {
        setSearching(false);
      }
    },
    [searching, addFruit]
  );

  // 按等级分组
  const grouped = {
    low: allFruits.filter((f) => f.level === 'low'),
    medium: allFruits.filter((f) => f.level === 'medium'),
    high: allFruits.filter((f) => f.level === 'high'),
  };

  const handleRecord = () => {
    if (!selected) return;
    const w = Number(weight) || 0;
    if (w <= 0) return;
    addFruitRecord({ fruit: selected, weight: w });
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索水果名称（如：苹果、香蕉）"
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

      {/* 水果列表 */}
      {(['low', 'medium', 'high'] as const).map((level) => {
        const fruits = grouped[level];
        if (fruits.length === 0) return null;
        return (
          <div key={level}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  LEVEL_COLORS[level].bg,
                  LEVEL_COLORS[level].text
                )}
              >
                {LEVEL_TEXT[level]}
              </span>
              <span className="text-xs text-teal-600/50">{fruits.length} 种</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fruits.map((fruit) => (
                <FruitCard
                  key={fruit.id}
                  fruit={fruit}
                  onClick={() => setSelected(fruit)}
                  onDelete={fruit.isCustom ? () => deleteFruit(fruit.id) : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* 详情弹层 */}
      <AnimatePresence>
        {selected && (
          <FruitDetail
            fruit={selected}
            weight={weight}
            setWeight={setWeight}
            onRecord={handleRecord}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* 维基候选选择浮层（本地未命中时弹出） */}
      <AnimatePresence>
        {candidates.length > 0 && (
          <>
            {/* 遮罩 */}
            <motion.div
              className="fixed inset-0 z-[100] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCandidateDrawer}
            />
            {/* 底部抽屉 */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[101] max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between px-6 pt-5">
                <h3 className="text-base font-semibold text-teal-700">选择水果</h3>
                <button
                  onClick={closeCandidateDrawer}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-100 text-teal-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="px-6 pb-2 text-xs text-teal-600/50">
                未在本地找到「{query.trim()}」，从维基百科找到以下候选：
              </p>
              <div className="divide-y divide-cream-100">
                {candidates.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => handleSelectCandidate(item)}
                    className="flex w-full flex-col gap-1 px-6 py-3 text-left transition hover:bg-cream-50"
                  >
                    <span className="text-sm font-medium text-teal-700">{item.title}</span>
                    {item.description && (
                      <span className="block truncate text-xs leading-relaxed text-teal-600/60">
                        {item.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 营养标签 */
function NutrientTag({ label, value, unit, icon }: { label: string; value: number; unit: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-cream-100 px-2 py-1 text-xs">
      {icon}
      <span className="text-teal-600/60">{label}</span>
      <span className="font-semibold text-teal-700">{value}</span>
      <span className="text-teal-600/40">{unit}</span>
    </span>
  );
}

/** 水果卡片 */
function FruitCard({
  fruit,
  onClick,
  onDelete,
}: {
  fruit: Fruit;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-cream-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm">
      <button onClick={onClick} className="flex flex-1 items-center gap-3 text-left">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-cream-50 text-2xl">
          {fruit.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-teal-700">{fruit.name}</h3>
            {fruit.isCustom && (
              <span className="rounded-full bg-sage-100 px-1.5 py-0.5 text-[9px] font-medium text-sage-600">
                自定义
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <NutrientTag label="钾" value={fruit.potassiumPer100g} unit="mg" />
            <NutrientTag label="磷" value={fruit.phosphorusPer100g} unit="mg" />
            <NutrientTag label="钠" value={fruit.sodiumPer100g} unit="mg" />
            <NutrientTag label="水" value={fruit.waterPer100g} unit="ml" />
          </div>
        </div>
      </button>
      <div className="flex flex-shrink-0 flex-col items-center gap-1">
        <span
          className={cn(
            'whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium',
            LEVEL_COLORS[fruit.level].bg,
            LEVEL_COLORS[fruit.level].text
          )}
        >
          {LEVEL_TEXT[fruit.level]}
        </span>
        {onDelete && (
          <button onClick={onDelete} className="text-[10px] text-red-400 hover:text-red-600">
            删除
          </button>
        )}
      </div>
    </div>
  );
}

/** 水果详情弹层 */
function FruitDetail({
  fruit,
  weight,
  setWeight,
  onRecord,
  onClose,
}: {
  fruit: Fruit;
  weight: string;
  setWeight: (v: string) => void;
  onRecord: () => void;
  onClose: () => void;
}) {
  const w = Number(weight) || 0;
  const { image, description, loading } = useEntityInfo(
    fruit.name,
    'fruit',
    fruit.image,
    fruit.description
  );

  return (
    <>
      {/* 遮罩 */}
      <motion.div
        className="fixed inset-0 z-[100] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* 底部抽屉 */}
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
            <span className="text-3xl">{fruit.emoji}</span>
            <div>
              <h3 className="text-lg font-semibold text-teal-700">{fruit.name}</h3>
              <span
                className={cn(
                  'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                  LEVEL_COLORS[fruit.level].bg,
                  LEVEL_COLORS[fruit.level].text
                )}
              >
                {LEVEL_TEXT[fruit.level]}
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
          {/* 水果配图 */}
          {image ? (
            <motion.img
              src={image}
              alt={fruit.name}
              className="h-40 w-full rounded-2xl object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          ) : loading ? (
            <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-cream-100">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600/40" />
            </div>
          ) : null}

          {/* 核心：每100g元素含量 */}
          <div className="rounded-2xl bg-cream-50 p-4">
            <h4 className="mb-3 text-sm font-medium text-teal-700">每 100g 元素含量</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                <Atom className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-xs text-teal-600/60">钾</div>
                  <div className="text-lg font-bold text-teal-700">{fruit.potassiumPer100g}<span className="ml-0.5 text-xs font-normal text-teal-600/40">mg</span></div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                <FlaskConical className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-xs text-teal-600/60">磷</div>
                  <div className="text-lg font-bold text-teal-700">{fruit.phosphorusPer100g}<span className="ml-0.5 text-xs font-normal text-teal-600/40">mg</span></div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                <Beaker className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-xs text-teal-600/60">钠</div>
                  <div className="text-lg font-bold text-teal-700">{fruit.sodiumPer100g}<span className="ml-0.5 text-xs font-normal text-teal-600/40">mg</span></div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                <Droplet className="h-5 w-5 text-cyan-500" />
                <div>
                  <div className="text-xs text-teal-600/60">水分</div>
                  <div className="text-lg font-bold text-teal-700">{fruit.waterPer100g}<span className="ml-0.5 text-xs font-normal text-teal-600/40">ml</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* 维基介绍（fruit.description 为维基摘要；无 description 则不展示） */}
          {description && (
            <div className="rounded-2xl border border-cream-200 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-teal-700">
                <Info className="h-4 w-4" /> 维基介绍
              </h4>
              <p className="text-sm leading-relaxed text-teal-600/80">{description}</p>
            </div>
          )}

          {/* 食用建议 */}
          <div className="rounded-2xl bg-sage-50 p-4">
            <h4 className="mb-1 text-sm font-medium text-sage-700">食用建议</h4>
            <p className="text-sm text-sage-600">{fruit.suggestion}</p>
          </div>

          {/* 快速记录 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-teal-700">记录摄入</h4>
            <div className="flex flex-wrap gap-2">
              {[100, 150, 200, 250].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setWeight(String(preset))}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                    weight === String(preset)
                      ? 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-cream-300 bg-white text-teal-600 hover:bg-cream-50'
                  )}
                >
                  {formatWeightKg(preset)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="输入克数 (g)"
                className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && onRecord()}
              />
              <button
                onClick={onRecord}
                disabled={w <= 0}
                className="flex-shrink-0 rounded-xl bg-sage-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-sage-600 disabled:opacity-40"
              >
                记录
              </button>
            </div>
            {w > 0 && (
              <div className="rounded-xl bg-cream-50 px-4 py-2.5 text-xs text-teal-600">
                本次 {formatWeightKg(w)}：钾 <span className="font-semibold text-teal-700">{Math.round((fruit.potassiumPer100g * w) / 100)}</span> mg / 磷 <span className="font-semibold text-teal-700">{Math.round((fruit.phosphorusPer100g * w) / 100)}</span> mg / 钠 <span className="font-semibold text-teal-700">{Math.round((fruit.sodiumPer100g * w) / 100)}</span> mg / 水 <span className="font-semibold text-teal-700">{Math.round((fruit.waterPer100g * w) / 100)}</span> ml
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
