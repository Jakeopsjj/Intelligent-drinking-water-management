/**
 * 饮食板块 —— 水果列表
 *
 * 功能：
 * 1. 复用水果板块（BUILTIN_FRUITS + customFruits）完整数据
 * 2. 卡片展示钾、钠、磷、水分四种元素每 100g 含量
 * 3. 点击卡片进入详情抽屉
 * 4. 详情页显示各元素具体克数（根据输入重量实时计算）
 * 5. 自定义重量输入 + 计量单位选择（克/千克/斤/两）
 * 6. 支持记录摄入
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Droplet, FlaskConical, Beaker, Atom,
  Scale, ChevronRight, Utensils,
} from 'lucide-react';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { LEVEL_TEXT, LEVEL_COLORS } from '@/utils/calc';
import { cn } from '@/lib/utils';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { Fruit } from '@/types';
import { WEIGHT_UNITS, calculateNutrients, type WeightUnit } from '@/modules/diet/contract';

export default function Diet() {
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const allFruits = useMemo(() => [...customFruits, ...builtinFruits], [customFruits, builtinFruits]);
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Fruit | null>(null);
  const [weight, setWeight] = useState('100');
  const [unit, setUnit] = useState<WeightUnit>('g');

  useOverlayBackHandler(!!selected, () => setSelected(null));
  useLockBodyScroll(!!selected);

  const filteredFruits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allFruits;
    return allFruits.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.aliases?.toLowerCase().includes(q) ?? false)
    );
  }, [allFruits, query]);

  const grouped = useMemo(() => ({
    low: filteredFruits.filter((f) => f.level === 'low'),
    medium: filteredFruits.filter((f) => f.level === 'medium'),
    high: filteredFruits.filter((f) => f.level === 'high'),
  }), [filteredFruits]);

  const handleRecord = useCallback(() => {
    if (!selected) return;
    const unitInfo = WEIGHT_UNITS.find((u) => u.key === unit)!;
    const inputValue = Number(weight) || 0;
    if (inputValue <= 0) return;
    const weightGrams = unitInfo.toGram(inputValue);
    if (weightGrams <= 0) return;
    addFruitRecord({ fruit: selected, weight: weightGrams });
    setSelected(null);
  }, [selected, weight, unit, addFruitRecord]);

  const openFruit = useCallback((fruit: Fruit) => {
    setSelected(fruit);
    setWeight('100');
    setUnit('g');
  }, []);

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
          <Utensils className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-xl font-semibold text-teal-700">饮食营养</h1>
          <p className="text-xs text-teal-600/60">水果营养查询 · 重量换算 · 摄入记录</p>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索水果名称（如：苹果、香蕉）"
            className="w-full rounded-xl border border-cream-300 bg-white py-2.5 pl-10 pr-4 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400 focus:outline-none"
          />
        </div>
      </div>

      {/* 提示信息 */}
      <div className="rounded-xl bg-teal-50 px-4 py-2.5 text-xs text-teal-600/80">
        数据参考《中国食物成分表》第 6 版 + USDA FoodData Central；卡片展示每 100g 含量，点击进入可按重量换算。
      </div>

      {/* 水果列表（按等级分组） */}
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
                <DietFruitCard
                  key={fruit.id}
                  fruit={fruit}
                  onClick={() => openFruit(fruit)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filteredFruits.length === 0 && query.trim() && (
        <div className="rounded-xl bg-cream-100 px-4 py-8 text-center text-sm text-teal-600/50">
          未找到「{query.trim()}」相关水果
        </div>
      )}

      {/* 详情弹层 */}
      <AnimatePresence>
        {selected && (
          <DietFruitDetail
            fruit={selected}
            weight={weight}
            setWeight={setWeight}
            unit={unit}
            setUnit={setUnit}
            onRecord={handleRecord}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** 营养含量标签（卡片上的每100g展示） */
function NutrientBadge({
  label,
  value,
  unit,
  colorClass,
}: {
  label: string;
  value: number;
  unit: string;
  colorClass: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-cream-100 px-2 py-1 text-xs">
      <span className={cn('h-1.5 w-1.5 rounded-full', colorClass)} />
      <span className="text-teal-600/60">{label}</span>
      <span className="font-semibold text-teal-700">{value}</span>
      <span className="text-teal-600/40">{unit}</span>
    </span>
  );
}

/** 饮食板块水果卡片 */
function DietFruitCard({
  fruit,
  onClick,
}: {
  fruit: Fruit;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between rounded-2xl border border-cream-200 bg-white p-4 text-left transition hover:border-teal-300 hover:shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-cream-50 text-3xl">
          {fruit.emoji}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-teal-700">{fruit.name}</h3>
            {fruit.isCustom && (
              <span className="rounded-full bg-sage-100 px-1.5 py-0.5 text-[9px] font-medium text-sage-600">
                自定义
              </span>
            )}
          </div>
          {fruit.aliases && (
            <p className="mt-0.5 text-[10px] text-teal-600/40">{fruit.aliases}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <NutrientBadge label="钾" value={fruit.potassiumPer100g} unit="mg" colorClass="bg-orange-400" />
            <NutrientBadge label="钠" value={fruit.sodiumPer100g} unit="mg" colorClass="bg-purple-400" />
            <NutrientBadge label="磷" value={fruit.phosphorusPer100g} unit="mg" colorClass="bg-blue-400" />
            <NutrientBadge label="水" value={fruit.waterPer100g} unit="g" colorClass="bg-cyan-400" />
          </div>
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col items-center gap-2">
        <span
          className={cn(
            'whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium',
            LEVEL_COLORS[fruit.level].bg,
            LEVEL_COLORS[fruit.level].text
          )}
        >
          {LEVEL_TEXT[fruit.level]}
        </span>
        <ChevronRight className="h-4 w-4 text-teal-600/30 transition group-hover:text-teal-500 group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

/** 格式化小数值，去除尾零 */
function formatDecimal(value: number, digits: number = 3): string {
  if (!Number.isFinite(value)) return '0';
  const fixed = value.toFixed(digits);
  if (fixed.includes('.')) {
    return fixed.replace(/\.?0+$/, '');
  }
  return fixed;
}

/** 饮食板块水果详情（底部抽屉） */
function DietFruitDetail({
  fruit,
  weight,
  setWeight,
  unit,
  setUnit,
  onRecord,
  onClose,
}: {
  fruit: Fruit;
  weight: string;
  setWeight: (v: string) => void;
  unit: WeightUnit;
  setUnit: (v: WeightUnit) => void;
  onRecord: () => void;
  onClose: () => void;
}) {
  const unitInfo = WEIGHT_UNITS.find((u) => u.key === unit)!;
  const inputValue = Number(weight) || 0;
  const weightGrams = inputValue > 0 ? unitInfo.toGram(inputValue) : 0;
  const nutrients = useMemo(
    () => calculateNutrients(fruit, weightGrams),
    [fruit, weightGrams]
  );

  const displayWeight = useMemo(() => {
    if (weightGrams <= 0) return null;
    if (weightGrams >= 1000) {
      return `${formatDecimal(weightGrams / 1000, 2)} 千克 (${formatDecimal(weightGrams, 0)} 克)`;
    }
    return `${formatDecimal(weightGrams, 1)} 克`;
  }, [weightGrams]);

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
        className="fixed bottom-0 left-0 right-0 z-[101] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white/90 backdrop-blur-xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{fruit.emoji}</span>
            <div>
              <h3 className="text-lg font-semibold text-teal-700">{fruit.name}</h3>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                    LEVEL_COLORS[fruit.level].bg,
                    LEVEL_COLORS[fruit.level].text
                  )}
                >
                  {LEVEL_TEXT[fruit.level]}
                </span>
                {fruit.suggestion && (
                  <span className="text-[11px] text-teal-600/50">{fruit.suggestion}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-100 text-teal-600 transition hover:bg-cream-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-4">
          {/* 每 100g 标准含量 */}
          <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-teal-700">
              <Scale className="h-4 w-4" />
              每 100g 元素含量
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NutrientRefCard
                icon={<Atom className="h-5 w-5 text-orange-500" />}
                label="钾 (K)"
                valueMg={fruit.potassiumPer100g}
              />
              <NutrientRefCard
                icon={<Beaker className="h-5 w-5 text-purple-500" />}
                label="钠 (Na)"
                valueMg={fruit.sodiumPer100g}
              />
              <NutrientRefCard
                icon={<FlaskConical className="h-5 w-5 text-blue-500" />}
                label="磷 (P)"
                valueMg={fruit.phosphorusPer100g}
              />
              <NutrientRefCard
                icon={<Droplet className="h-5 w-5 text-cyan-500" />}
                label="水分 (H₂O)"
                valueMl={fruit.waterPer100g}
              />
            </div>
          </div>

          {/* 重量输入 + 单位选择 */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-teal-700">
              <Scale className="h-4 w-4" />
              自定义重量
            </h4>
            <div className="flex flex-col gap-3">
              {/* 快捷重量 */}
              <div className="flex flex-wrap gap-2">
                {[
                  { w: 50, u: 'g' as WeightUnit, label: '50g' },
                  { w: 100, u: 'g' as WeightUnit, label: '100g' },
                  { w: 150, u: 'g' as WeightUnit, label: '150g' },
                  { w: 200, u: 'g' as WeightUnit, label: '200g' },
                  { w: 1, u: 'jin' as WeightUnit, label: '1斤' },
                  { w: 1, u: 'kg' as WeightUnit, label: '1kg' },
                ].map((preset) => {
                  const isActive = weight === String(preset.w) && unit === preset.u;
                  return (
                    <button
                      key={`${preset.w}-${preset.u}`}
                      onClick={() => {
                        setWeight(String(preset.w));
                        setUnit(preset.u);
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                        isActive
                          ? 'border-teal-400 bg-teal-100 text-teal-700 shadow-sm'
                          : 'border-cream-300 bg-white text-teal-600 hover:bg-cream-50'
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              {/* 输入框 + 单位选择 */}
              <div className="flex gap-2">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="输入重量"
                  className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-base font-medium text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && onRecord()}
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as WeightUnit)}
                  className="rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-sm font-medium text-teal-700 focus:border-teal-400 focus:outline-none"
                >
                  {WEIGHT_UNITS.map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              {displayWeight && (
                <p className="text-xs text-teal-600/60">
                  换算为：<span className="font-medium text-teal-700">{displayWeight}</span>
                </p>
              )}
            </div>
          </div>

          {/* 计算结果：该重量下的具体克数 */}
          {weightGrams > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-teal-100">
              <h4 className="mb-3 text-sm font-medium text-teal-700">
                {displayWeight} {fruit.name} 营养含量
              </h4>
              <div className="space-y-3">
                <NutrientResultRow
                  icon={<Atom className="h-5 w-5 text-orange-500" />}
                  label="钾"
                  mg={nutrients.potassiumMg}
                  g={nutrients.potassiumG}
                  percentDV={2000}
                  percentLabel="每日限额"
                  color="orange"
                />
                <NutrientResultRow
                  icon={<Beaker className="h-5 w-5 text-purple-500" />}
                  label="钠"
                  mg={nutrients.sodiumMg}
                  g={nutrients.sodiumG}
                  percentDV={2000}
                  percentLabel="每日限额"
                  color="purple"
                />
                <NutrientResultRow
                  icon={<FlaskConical className="h-5 w-5 text-blue-500" />}
                  label="磷"
                  mg={nutrients.phosphorusMg}
                  g={nutrients.phosphorusG}
                  percentDV={800}
                  percentLabel="每日限额"
                  color="blue"
                />
                <NutrientResultRow
                  icon={<Droplet className="h-5 w-5 text-cyan-500" />}
                  label="水分"
                  mg={nutrients.waterMl}
                  g={nutrients.waterG}
                  percentDV={1000}
                  percentLabel="每日限水"
                  color="cyan"
                  isWater
                />
              </div>
            </div>
          )}

          {/* 食用建议 */}
          {fruit.description && (
            <div className="rounded-2xl border border-sage-200 bg-sage-50 p-4">
              <h4 className="mb-1 text-sm font-medium text-sage-700">食用说明</h4>
              <p className="text-sm leading-relaxed text-sage-600">{fruit.description}</p>
            </div>
          )}

          {/* 记录按钮 */}
          <button
            onClick={onRecord}
            disabled={weightGrams <= 0}
            className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-sage-500 py-3 text-sm font-medium text-white shadow-lg shadow-teal-500/20 transition hover:from-teal-600 hover:to-sage-600 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
          >
            {weightGrams > 0
              ? `记录摄入：${displayWeight}`
              : '请输入重量'}
          </button>
        </div>
      </motion.div>
    </>
  );
}

/** 标准含量卡片（每100g参考值） */
function NutrientRefCard({
  icon,
  label,
  valueMg,
  valueMl,
}: {
  icon: React.ReactNode;
  label: string;
  valueMg?: number;
  valueMl?: number;
}) {
  const isWater = valueMl !== undefined;
  const val = isWater ? valueMl : valueMg;
  const unit = isWater ? 'g' : 'mg';
  const gVal = isWater ? val : (val! / 1000);
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white p-3">
      {icon}
      <div className="min-w-0">
        <div className="text-[11px] text-teal-600/60">{label}</div>
        <div className="text-base font-bold text-teal-700">
          {val}
          <span className="ml-0.5 text-xs font-normal text-teal-600/40">{unit}</span>
        </div>
        <div className="text-[10px] text-teal-600/40">
          ≈ {formatDecimal(gVal!, 3)} g
        </div>
      </div>
    </div>
  );
}

/** 营养计算结果行 */
function NutrientResultRow({
  icon,
  label,
  mg,
  g,
  percentDV,
  percentLabel,
  color,
  isWater = false,
}: {
  icon: React.ReactNode;
  label: string;
  mg: number;
  g: number;
  percentDV: number;
  percentLabel: string;
  color: 'orange' | 'purple' | 'blue' | 'cyan';
  isWater?: boolean;
}) {
  const barColors = {
    orange: 'bg-orange-400',
    purple: 'bg-purple-400',
    blue: 'bg-blue-400',
    cyan: 'bg-cyan-400',
  };
  const percent = isWater
    ? Math.min((mg / percentDV) * 100, 100)
    : Math.min((mg / percentDV) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cream-50">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-teal-700">{label}</span>
          <div className="text-right">
            <span className="text-base font-bold text-teal-700">
              {isWater ? `${formatDecimal(mg, 1)} ` : `${formatDecimal(mg, 1)} `}
            </span>
            <span className="text-xs text-teal-600/50">
              {isWater ? 'ml' : 'mg'}
            </span>
            {!isWater && (
              <span className="ml-1 text-[11px] text-teal-600/40">
                ({formatDecimal(g, 3)} g)
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-100">
            <div
              className={cn('h-full rounded-full transition-all duration-300', barColors[color])}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-[10px] text-teal-600/40 whitespace-nowrap">
            {Math.round(percent)}% {percentLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
