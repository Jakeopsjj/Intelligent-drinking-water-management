/**
 * 水果板块（重构版）
 *
 * 流程：
 * 1. 顶部搜索框，输入水果名称
 * 2. 调用 apihz.cn 食物营养API 获取钾/磷/钠/水分
 * 3. 搜索成功 → 自动添加到列表，打开详情
 * 4. 卡片展示：名称 + 钾/磷/钠/水 标签 + 钾等级
 * 5. 详情页：完整营养信息
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Droplet, FlaskConical, Beaker, Atom, ChevronRight, Info } from 'lucide-react';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { LEVEL_TEXT, LEVEL_COLORS, formatWeightKg, getLevelFromPotassium } from '@/utils/calc';
import { cn } from '@/lib/utils';
import { fetchFoodNutrition, type FoodNutrition } from '@/lib/foodNutritionService';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { Fruit } from '@/types';

export default function Fruits() {
  const allFruits = useFruitsStore((s) => s.allFruits());
  const addFruit = useFruitsStore((s) => s.addFruit);
  const deleteFruit = useFruitsStore((s) => s.deleteFruit);
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Fruit | null>(null);
  const [weight, setWeight] = useState('100');

  useOverlayBackHandler(!!selected, () => setSelected(null));
  useLockBodyScroll(!!selected);

  const handleSearch = useCallback(async () => {
    const keyword = query.trim();
    if (!keyword || searching) return;
    setSearching(true);
    setError(null);
    try {
      const nutrition = await fetchFoodNutrition(keyword);
      if (!nutrition) {
        setError('未找到该食物的营养数据');
        return;
      }

      // 构建完整营养描述
      const parts: string[] = [];
      if (nutrition.energy) parts.push(`能量 ${nutrition.energy} kcal`);
      if (nutrition.protein) parts.push(`蛋白质 ${nutrition.protein} g`);
      if (nutrition.fat) parts.push(`脂肪 ${nutrition.fat} g`);
      if (nutrition.carbohydrate) parts.push(`碳水 ${nutrition.carbohydrate} g`);
      if (nutrition.fiber) parts.push(`膳食纤维 ${nutrition.fiber} g`);
      if (nutrition.calcium) parts.push(`钙 ${nutrition.calcium} mg`);
      if (nutrition.magnesium) parts.push(`镁 ${nutrition.magnesium} mg`);
      if (nutrition.iron) parts.push(`铁 ${nutrition.iron} mg`);
      if (nutrition.zinc) parts.push(`锌 ${nutrition.zinc} mg`);
      if (nutrition.vitaminC) parts.push(`维生素C ${nutrition.vitaminC} mg`);

      addFruit({
        name: keyword,
        emoji: '🍇',
        potassiumPer100g: nutrition.potassium,
        phosphorusPer100g: nutrition.phosphorus,
        sodiumPer100g: nutrition.sodium,
        waterPer100g: nutrition.water,
        suggestion: '请根据医嘱适量食用',
        description: parts.length > 0 ? `每100g营养成分：${parts.join('，')}` : undefined,
      });

      // 找到刚添加的水果并打开详情
      const latest = useFruitsStore.getState().customFruits;
      const newFruit = [...latest].reverse().find((f) => f.name === keyword);
      if (newFruit) {
        setSelected(newFruit);
        setQuery('');
      }
    } catch {
      setError('搜索失败，请重试');
    } finally {
      setSearching(false);
    }
  }, [query, searching, addFruit]);

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

          {/* 其他营养成分 */}
          {fruit.description && (
            <div className="rounded-2xl border border-cream-200 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-teal-700">
                <Info className="h-4 w-4" /> 详细营养成分
              </h4>
              <p className="text-sm leading-relaxed text-teal-600/80">{fruit.description}</p>
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
