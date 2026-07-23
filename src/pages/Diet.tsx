import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Check, Clock, ChevronDown, ChevronUp, Trash2, Citrus, Apple, Banana, Droplets, AlertTriangle } from 'lucide-react';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LEVEL_TEXT, LEVEL_COLORS, getLevelFromPotassium, getProgressStatus } from '@/utils/calc';
import { formatDateTime, getTodayKey } from '@/utils/date';
import { cn } from '@/lib/utils';
import { useEntityImage } from '@/hooks/useEntityImage';
import SmartImage from '@/components/SmartImage';
import type { Fruit, MealType, FruitRecord, WaterRecord } from '@/types';

const MEAL_CONFIG: { type: MealType; label: string; emoji: string; timeHint: string }[] = [
  { type: 'breakfast', label: '早餐', emoji: '🌅', timeHint: '6:00-9:00' },
  { type: 'lunch', label: '午餐', emoji: '☀️', timeHint: '11:00-13:00' },
  { type: 'dinner', label: '晚餐', emoji: '🌇', timeHint: '17:00-19:00' },
  { type: 'snack', label: '加餐', emoji: '🍪', timeHint: '任意时间' },
];

const QUICK_WEIGHTS = [50, 100, 150, 200];

const MEAL_ACTIVE_COLORS: Record<MealType, string> = {
  breakfast: 'border-amber-400 bg-amber-500 text-white shadow-amber-500/25',
  lunch: 'border-orange-400 bg-orange-500 text-white shadow-orange-500/25',
  dinner: 'border-rose-400 bg-rose-500 text-white shadow-rose-500/25',
  snack: 'border-purple-400 bg-purple-500 text-white shadow-purple-500/25',
};

const EMPTY_NUTRITION = { potassium: 0, phosphorus: 0, sodium: 0, water: 0, fruit: 0, count: 0 };

const PROGRESS_COLORS: Record<'normal' | 'warning' | 'exceeded', { bar: string; bg: string; text: string }> = {
  normal: { bar: 'bg-teal-500', bg: 'bg-teal-100', text: 'text-teal-700' },
  warning: { bar: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-700' },
  exceeded: { bar: 'bg-rose-500', bg: 'bg-rose-100', text: 'text-rose-700' },
};

function isToday(timestamp: number): boolean {
  const todayKey = getTodayKey();
  const d = new Date(timestamp);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return key === todayKey;
}

export default function Diet() {
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const allFruits = useMemo(() => [...customFruits, ...builtinFruits], [customFruits, builtinFruits]);

  const records = useRecordsStore((s) => s.records);
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);
  const deleteRecord = useRecordsStore((s) => s.deleteRecord);
  const settings = useSettingsStore((s) => s.settings);

  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickSaved, setQuickSaved] = useState<string | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>(null);

  const filteredFruits = useMemo(() => {
    if (!searchQuery.trim()) return allFruits;
    const q = searchQuery.toLowerCase();
    return allFruits.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.aliases ? f.aliases.toLowerCase().includes(q) : false)
    );
  }, [allFruits, searchQuery]);

  const fruitRecords = useMemo(
    () => records.filter((r): r is FruitRecord => r.type === 'fruit' && isToday(r.timestamp)),
    [records]
  );

  const mealGroupedRecords = useMemo(() => {
    const grouped: Record<MealType, FruitRecord[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const r of fruitRecords) {
      const meal = r.mealType || 'snack';
      grouped[meal].push(r);
    }
    return grouped;
  }, [fruitRecords]);

  const mealNutrition = useMemo(() => {
    const result: Record<MealType, typeof EMPTY_NUTRITION> = {
      breakfast: { ...EMPTY_NUTRITION },
      lunch: { ...EMPTY_NUTRITION },
      dinner: { ...EMPTY_NUTRITION },
      snack: { ...EMPTY_NUTRITION },
    };
    for (const [meal, recs] of Object.entries(mealGroupedRecords)) {
      for (const r of recs) {
        const m = result[meal as MealType];
        m.potassium += r.potassium || 0;
        m.phosphorus += r.phosphorus || 0;
        m.sodium += r.sodium || 0;
        m.water += r.water || 0;
        m.fruit += r.weight || 0;
        m.count += 1;
      }
    }
    return result;
  }, [mealGroupedRecords]);

  const todayTotal = useMemo(() => {
    const total = { ...EMPTY_NUTRITION };
    for (const n of Object.values(mealNutrition)) {
      total.potassium += n.potassium;
      total.phosphorus += n.phosphorus;
      total.sodium += n.sodium;
      total.water += n.water;
      total.fruit += n.fruit;
      total.count += n.count;
    }
    return total;
  }, [mealNutrition]);

  const todayDrinkWater = useMemo(() => {
    return records
      .filter((r): r is WaterRecord => r.type === 'water' && isToday(r.timestamp))
      .reduce((sum, r) => sum + r.amount, 0);
  }, [records]);

  const dayTotalWater = todayDrinkWater + todayTotal.water;

  const nutrientBars = useMemo(() => [
    {
      key: 'water',
      label: '水分',
      icon: <Droplets className="h-3.5 w-3.5" />,
      current: dayTotalWater,
      limit: settings.dailyWaterLimit,
      unit: 'ml',
      color: 'text-teal-600',
    },
    {
      key: 'potassium',
      label: '钾',
      icon: <span className="text-[11px] font-bold">K</span>,
      current: todayTotal.potassium,
      limit: settings.dailyPotassiumLimit,
      unit: 'mg',
      color: 'text-sage-600',
    },
    {
      key: 'phosphorus',
      label: '磷',
      icon: <span className="text-[11px] font-bold">P</span>,
      current: todayTotal.phosphorus,
      limit: settings.dailyPhosphorusLimit,
      unit: 'mg',
      color: 'text-clay-600',
    },
    {
      key: 'sodium',
      label: '钠',
      icon: <span className="text-[11px] font-bold">Na</span>,
      current: todayTotal.sodium,
      limit: settings.dailySodiumLimit,
      unit: 'mg',
      color: 'text-amber-600',
    },
    {
      key: 'fruit',
      label: '水果',
      icon: <Citrus className="h-3.5 w-3.5" />,
      current: todayTotal.fruit,
      limit: settings.dailyFruitLimit,
      unit: 'g',
      color: 'text-orange-600',
    },
  ], [dayTotalWater, todayTotal, settings]);

  const overLimitCount = nutrientBars.filter((b) => b.current >= b.limit).length;

  const handleAddFruit = (fruit: Fruit, weight: number) => {
    addFruitRecord({ fruit, weight, mealType: selectedMeal });
    setQuickSaved(fruit.id);
    setTimeout(() => setQuickSaved(null), 1200);
  };

  const handleDelete = (id: string) => {
    deleteRecord(id);
  };

  const hasAnyRecords = MEAL_CONFIG.some((m) => mealGroupedRecords[m.type].length > 0);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[28px] p-5"
      >
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 shadow-soft">
              <Apple className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold text-teal-700">饮食记录</h1>
              <p className="text-xs text-teal-600/50">按餐次记录水果摄入，追踪营养</p>
            </div>
          </div>

          {todayTotal.count > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-teal-50 p-3">
                <p className="text-[10px] text-teal-600/50">水果总量</p>
                <p className="mt-0.5 text-lg font-bold text-teal-700">{todayTotal.fruit}g</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-[10px] text-teal-600/50">水分摄入</p>
                <p className="mt-0.5 text-lg font-bold text-amber-700">{dayTotalWater}ml</p>
                <p className="text-[9px] text-teal-600/40">饮水{todayDrinkWater}ml + 水果{todayTotal.water}ml</p>
              </div>
              <div className="rounded-xl bg-sage-50 p-3">
                <p className="text-[10px] text-teal-600/50">钾摄入</p>
                <p className="mt-0.5 text-lg font-bold text-sage-700">{todayTotal.potassium}mg</p>
              </div>
              <div className="rounded-xl bg-clay-50 p-3">
                <p className="text-[10px] text-teal-600/50">磷摄入</p>
                <p className="mt-0.5 text-lg font-bold text-clay-700">{todayTotal.phosphorus}mg</p>
              </div>
            </div>
          )}

          {overLimitCount > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-rose-700">今日已超标 {overLimitCount} 项</p>
                <p className="text-[10px] text-rose-600/70 mt-0.5">
                  {nutrientBars.filter((b) => b.current >= b.limit).map((b) => b.label).join('、')}
                  已达每日限额，请注意控制摄入。
                </p>
              </div>
            </div>
          )}

          {todayTotal.count > 0 && (
            <div className="mt-4 space-y-2.5">
              <p className="text-[10px] font-medium text-teal-600/60">每日限额进度</p>
              {nutrientBars.map((bar) => {
                const percent = Math.min(100, Math.round((bar.current / bar.limit) * 100));
                const status = getProgressStatus(bar.current, bar.limit);
                const colors = PROGRESS_COLORS[status];
                return (
                  <div key={bar.key} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={cn('flex items-center gap-1 font-medium', bar.color)}>
                        {bar.icon}
                        {bar.label}
                      </span>
                      <span className={cn('font-semibold', colors.text)}>
                        {bar.current}/{bar.limit}{bar.unit}
                        <span className="ml-1 text-teal-600/40 font-normal">({percent}%)</span>
                      </span>
                    </div>
                    <div className={cn('h-1.5 w-full overflow-hidden rounded-full', colors.bg)}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className={cn('h-full rounded-full', colors.bar)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card rounded-[28px] p-5"
      >
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-teal-600/60" />
            <span className="text-sm font-medium text-teal-700">选择餐次</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_CONFIG.map((meal) => {
              const isActive = selectedMeal === meal.type;
              const counts = mealNutrition[meal.type].count;
              return (
                <button
                  key={meal.type}
                  onClick={() => setSelectedMeal(meal.type)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 transition-all active:scale-95',
                    isActive
                      ? MEAL_ACTIVE_COLORS[meal.type]
                      : cn('border-cream-200 bg-cream-50 text-teal-600', 'hover:border-teal-200 hover:bg-teal-50')
                  )}
                >
                  <span className="text-lg">{meal.emoji}</span>
                  <span className="text-xs font-medium">{meal.label}</span>
                  {counts > 0 && (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      isActive ? 'bg-white/30 text-white' : 'bg-teal-100 text-teal-600'
                    )}>
                      {counts}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-[28px] p-5"
      >
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
            <input
              type="text"
              placeholder="搜索水果..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-cream-200 bg-cream-50/80 py-2.5 pl-10 pr-9 text-sm font-medium text-teal-700 placeholder:text-teal-600/40 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-200/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600/40 hover:text-teal-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
            {filteredFruits.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Banana className="h-10 w-10 text-cream-300" />
                <p className="mt-2 text-sm text-teal-600/50">未找到匹配的水果</p>
              </div>
            ) : (
              filteredFruits.map((fruit) => (
                <FruitCard
                  key={fruit.id}
                  fruit={fruit}
                  onAdd={(weight) => handleAddFruit(fruit, weight)}
                  saved={quickSaved === fruit.id}
                />
              ))
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-[28px] p-5"
      >
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Citrus className="h-4 w-4 text-teal-600/60" />
            <span className="text-sm font-medium text-teal-700">
              今日饮食记录
              <span className="ml-2 text-xs text-teal-600/50">
                ({todayTotal.count} 条记录)
              </span>
            </span>
          </div>

          {!hasAnyRecords ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-100">
                <Apple className="h-8 w-8 text-cream-300" />
              </div>
              <p className="mt-3 text-sm text-teal-600/50">今日暂无饮食记录</p>
              <p className="mt-1 text-xs text-teal-600/30">在上方选择水果和重量开始记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {MEAL_CONFIG.map((meal) => {
                const recs = mealGroupedRecords[meal.type];
                if (recs.length === 0) return null;
                const nutrition = mealNutrition[meal.type];
                const isExpanded = expandedMeal === meal.type;

                return (
                  <div key={meal.type} className="rounded-2xl border border-cream-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedMeal(isExpanded ? null : meal.type)}
                      className="flex w-full items-center justify-between px-4 py-3 bg-cream-50/80"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{meal.emoji}</span>
                        <span className="text-sm font-semibold text-teal-700">{meal.label}</span>
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-600">
                          {recs.length} 项
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-teal-600/50">
                          {nutrition.fruit}g | K {nutrition.potassium}mg
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-teal-600/40" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-teal-600/40" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 space-y-2">
                            {recs.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-3 rounded-xl bg-white p-3"
                              >
                                <span className="text-2xl">{r.fruitEmoji}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-teal-700 truncate">
                                    {r.fruitName}
                                  </p>
                                  <p className="text-[10px] text-teal-600/50">
                                    {r.weight}g · K{r.potassium}mg · P{r.phosphorus}mg · 水{r.water}ml
                                  </p>
                                </div>
                                <span className="text-xs font-medium text-teal-600/50 hidden sm:inline">
                                  {formatDateTime(r.timestamp)}
                                </span>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-teal-600/30 hover:bg-red-50 hover:text-red-500 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <div className="rounded-xl bg-teal-50/50 p-3">
                              <p className="text-[10px] font-medium text-teal-600/60 mb-1.5">餐次营养小计</p>
                              <div className="grid grid-cols-4 gap-2">
                                <div className="text-center">
                                  <p className="text-xs text-teal-600/50">水果</p>
                                  <p className="text-sm font-bold text-teal-700">{nutrition.fruit}g</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-teal-600/50">钾</p>
                                  <p className="text-sm font-bold text-sage-700">{nutrition.potassium}mg</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-teal-600/50">磷</p>
                                  <p className="text-sm font-bold text-clay-700">{nutrition.phosphorus}mg</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-teal-600/50">水分</p>
                                  <p className="text-sm font-bold text-amber-700">{nutrition.water}ml</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function FruitCard({
  fruit,
  onAdd,
  saved,
}: {
  fruit: Fruit;
  onAdd: (weight: number) => void;
  saved: boolean;
}) {
  const level = getLevelFromPotassium(fruit.potassiumPer100g);
  const levelColors = LEVEL_COLORS[level];
  const imageUrl = useEntityImage(fruit.name, 'fruit');

  return (
    <div className="flex items-center gap-3 rounded-xl border border-cream-200 bg-white p-3 transition hover:border-teal-200 hover:shadow-sm">
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-cream-100">
        {imageUrl ? (
          <SmartImage
            src={imageUrl}
            alt={fruit.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl">
            {fruit.emoji || '🍎'}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-teal-700 truncate">{fruit.name}</span>
          <span
            className={cn(
              'flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              levelColors.bg,
              levelColors.text
            )}
          >
            {LEVEL_TEXT[level]}
          </span>
        </div>
        <p className="text-[10px] text-teal-600/50">
          K{fruit.potassiumPer100g}mg · P{fruit.phosphorusPer100g}mg / 100g
        </p>
      </div>

      <div className="flex flex-shrink-0 gap-1">
        {QUICK_WEIGHTS.map((w) => (
          <button
            key={w}
            onClick={() => onAdd(w)}
            className={cn(
              'flex flex-col items-center rounded-lg border px-2 py-1 text-[10px] font-medium transition active:scale-90',
              saved
                ? 'border-green-300 bg-green-500 text-white'
                : 'border-teal-200 bg-teal-50 text-teal-600 hover:border-teal-300 hover:bg-teal-100'
            )}
          >
            {saved ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {w}g
          </button>
        ))}
      </div>
    </div>
  );
}
