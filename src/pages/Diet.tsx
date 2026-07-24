/**
 * 饮食板块 —— 今日膳食管理（增强版）
 *
 * 定位：
 * - 水果板块 = 水果百科查询/管理（知识库）
 * - 饮食板块 = 今日膳食记录（营养追踪 + 快速记录）
 *
 * 视觉升级：
 * - 统一液态玻璃效果
 * - 营养进度条微型进度条
 * - 膳食建议动态面板
 * - 更流畅的过渡动画
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Droplet, FlaskConical, Beaker, Atom,
  UtensilsCrossed, Plus, Search,
  Trash2, Clock, AlertTriangle, CheckCircle2,
  Lightbulb, ChevronRight, Sparkles,
} from 'lucide-react';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LEVEL_TEXT, LEVEL_COLORS, getDailyMetrics, getProgressStatus } from '@/utils/calc';
import { getTodayKey } from '@/utils/date';
import { cn } from '@/lib/utils';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { Fruit, FruitRecord } from '@/types';
import { WEIGHT_UNITS, calculateNutrients, type WeightUnit } from '@/modules/diet/contract';

export default function Diet() {
  const navigate = useNavigate();
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const allFruits = useMemo(() => [...customFruits, ...builtinFruits], [customFruits, builtinFruits]);
  const records = useRecordsStore((s) => s.records);
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);
  const deleteRecord = useRecordsStore((s) => s.deleteRecord);
  const settings = useSettingsStore((s) => s.settings);

  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');

  useOverlayBackHandler(showAdd, () => setShowAdd(false));
  useLockBodyScroll(showAdd);

  const todayKey = getTodayKey();
  const todayMetrics = useMemo(
    () => getDailyMetrics(records, todayKey),
    [records, todayKey]
  );

  const todayFruitRecords = useMemo(
    () => todayMetrics.records
      .filter((r): r is FruitRecord => r.type === 'fruit')
      .sort((a, b) => b.timestamp - a.timestamp),
    [todayMetrics.records]
  );

  const filteredFruits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allFruits;
    return allFruits.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.aliases?.toLowerCase().includes(q) ?? false)
    );
  }, [allFruits, query]);

  const frequentFruits = useMemo(() => {
    const fruitCount = new Map<string, number>();
    records.forEach((r) => {
      if (r.type === 'fruit') {
        fruitCount.set(r.fruitId, (fruitCount.get(r.fruitId) || 0) + 1);
      }
    });
    return [...fruitCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => allFruits.find((f) => f.id === id))
      .filter(Boolean) as Fruit[];
  }, [records, allFruits]);

  const nutrients = [
    {
      key: 'potassium' as const,
      label: '钾',
      icon: <Atom className="h-5 w-5" />,
      current: todayMetrics.potassium,
      limit: settings.dailyPotassiumLimit,
      unit: 'mg',
      barClass: 'bg-orange-400',
      bgClass: 'from-orange-50 to-amber-50',
      tip: '高钾可能影响心律',
    },
    {
      key: 'phosphorus' as const,
      label: '磷',
      icon: <FlaskConical className="h-5 w-5" />,
      current: todayMetrics.phosphorus,
      limit: settings.dailyPhosphorusLimit,
      unit: 'mg',
      barClass: 'bg-blue-400',
      bgClass: 'from-blue-50 to-sky-50',
      tip: '高磷可能致皮肤瘙痒',
    },
    {
      key: 'sodium' as const,
      label: '钠',
      icon: <Beaker className="h-5 w-5" />,
      current: todayMetrics.sodium,
      limit: settings.dailySodiumLimit,
      unit: 'mg',
      barClass: 'bg-purple-400',
      bgClass: 'from-purple-50 to-violet-50',
      tip: '高钠影响血压和水肿',
    },
    {
      key: 'water' as const,
      label: '水分',
      icon: <Droplet className="h-5 w-5" />,
      current: todayMetrics.water,
      limit: settings.dailyWaterLimit,
      unit: 'ml',
      barClass: 'bg-cyan-400',
      bgClass: 'from-cyan-50 to-teal-50',
      tip: `含水果水 ${todayMetrics.fruitWater} ml`,
    },
  ];

  const totalExceeded = nutrients.some((n) => getProgressStatus(n.current, n.limit) === 'exceeded');

  const tips = useMemo(() => {
    const list: string[] = [];
    if (todayMetrics.fruit === 0) {
      list.push('今日还没吃水果，建议选择低钾水果适量食用');
    } else if (todayMetrics.fruit > settings.dailyFruitLimit) {
      list.push(`今日水果已摄入 ${(todayMetrics.fruit / 1000).toFixed(1)}kg，超过建议限额 ${(settings.dailyFruitLimit / 1000).toFixed(1)}kg`);
    }
    if (todayMetrics.potassium > settings.dailyPotassiumLimit * 0.8) {
      list.push('钾摄入已接近限额，避免再食用高钾食物');
    }
    if (todayMetrics.water > settings.dailyWaterLimit * 0.9) {
      list.push('水分摄入已接近限额，注意控制饮水量');
    }
    if (list.length === 0) {
      list.push('今日饮食控制良好，继续保持');
      list.push('推荐选择低钾水果：苹果、梨、葡萄、草莓等');
    }
    return list;
  }, [todayMetrics, settings]);

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="glass-tile flex h-10 w-10 items-center justify-center rounded-2xl text-orange-600">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-semibold text-teal-700">今日饮食</h1>
            <p className="text-xs text-teal-600/60">
              {todayFruitRecords.length} 条记录 · 水果 {(todayMetrics.fruit / 1000).toFixed(2)} kg
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="glass-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-teal-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          记录
        </button>
      </motion.div>

      {/* 营养摄入总览 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card relative overflow-hidden rounded-[24px] p-5"
      >
        <div className="glass-orb -right-6 -top-6 h-24 w-24 bg-orange-300/15" />
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-semibold text-teal-700">营养摄入</h2>
            {totalExceeded ? (
              <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-600">
                <AlertTriangle className="h-3 w-3" />
                注意超标
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-sage-50 px-2.5 py-1 text-[10px] font-medium text-sage-600">
                <CheckCircle2 className="h-3 w-3" />
                控制良好
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {nutrients.map((n, i) => {
              const percent = Math.min((n.current / n.limit) * 100, 100);
              const status = getProgressStatus(n.current, n.limit);
              return (
                <motion.div
                  key={n.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={cn(
                    'glass-tile rounded-2xl p-3',
                    `bg-gradient-to-br ${n.bgClass}`
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-teal-700">
                      {n.icon}
                      <span className="text-sm font-medium">{n.label}</span>
                    </div>
                    <span className={cn(
                      'text-[10px] font-medium',
                      status === 'exceeded' ? 'text-red-500' : status === 'warning' ? 'text-amber-500' : 'text-teal-600/50'
                    )}>
                      {Math.round(percent)}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-bold text-teal-700">
                      {n.current >= 1000 ? (n.current / 1000).toFixed(1) : Math.round(n.current)}
                      <span className="ml-0.5 text-xs font-normal text-teal-600/40">
                        {n.current >= 1000 && n.unit === 'mg' ? 'g' : n.unit}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.6, delay: 0.15 + i * 0.05 }}
                        className={cn(
                          'h-full rounded-full',
                          n.barClass,
                          status === 'exceeded' && 'bg-red-400'
                        )}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-teal-600/40">{n.tip}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* 今日记录 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card relative overflow-hidden rounded-[24px] p-5"
      >
        <div className="glass-orb -left-6 -bottom-6 h-20 w-20 bg-teal-300/18" />
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-semibold text-teal-700">今日记录</h2>
            {todayFruitRecords.length > 0 && (
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-600">
                {todayFruitRecords.length} 条
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {todayFruitRecords.length > 0 ? (
              todayFruitRecords.map((record) => {
                const fruit = allFruits.find((f) => f.id === record.fruitId);
                return (
                  <TodayRecordItem
                    key={record.id}
                    record={record}
                    fruit={fruit}
                    onDelete={() => deleteRecord(record.id)}
                  />
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="glass-tile flex h-14 w-14 items-center justify-center rounded-2xl">
                  <UtensilsCrossed className="h-6 w-6 text-teal-600/25" />
                </div>
                <p className="mt-3 text-sm text-teal-600/60">今日还没有饮食记录</p>
                <p className="mt-1 text-xs text-teal-600/40">点击右上角「记录」开始记录吧</p>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* 膳食小贴士 —— 增强玻璃态 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card relative overflow-hidden rounded-[24px] p-5"
      >
        <div className="glass-orb -right-8 -top-4 h-20 w-20 bg-amber-300/15" />
        <div className="glass-shimmer" />
        <div className="relative z-10">
          <div className="flex items-start gap-3">
            <div className="glass-tile flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-amber-600">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-teal-700">膳食建议</h3>
              <div className="mt-2 space-y-1.5">
                {tips.map((tip, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-teal-600/70">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-teal-400" />
                    {tip}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 去水果板块 */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={() => navigate('/fruits')}
        className="glass-tile flex w-full items-center justify-between rounded-2xl p-4 text-left transition hover:scale-[1.01]"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍎</span>
          <div>
            <h3 className="text-sm font-medium text-teal-700">查询水果营养</h3>
            <p className="text-xs text-teal-600/50">搜索水果、查看百科详情、添加自定义水果</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-teal-600/30" />
      </motion.button>

      {/* 添加记录抽屉 */}
      <AnimatePresence>
        {showAdd && (
          <AddRecordDrawer
            fruits={allFruits}
            frequentFruits={frequentFruits}
            filteredFruits={filteredFruits}
            query={query}
            setQuery={setQuery}
            onClose={() => {
              setShowAdd(false);
              setQuery('');
            }}
            onRecord={(fruit, weightGrams) => {
              addFruitRecord({ fruit, weight: weightGrams });
              setShowAdd(false);
              setQuery('');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** 今日记录项 */
function TodayRecordItem({
  record,
  fruit,
  onDelete,
}: {
  record: FruitRecord;
  fruit?: Fruit;
  onDelete: () => void;
}) {
  const time = new Date(record.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="glass-tile group flex items-center gap-3 rounded-xl p-3 transition hover:scale-[1.005]">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-2xl">
        {fruit?.emoji || record.fruitEmoji || '🍽️'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-teal-700">{fruit?.name || record.fruitName}</span>
          {fruit && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                LEVEL_COLORS[fruit.level].bg,
                LEVEL_COLORS[fruit.level].text
              )}
            >
              {LEVEL_TEXT[fruit.level]}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-teal-600/50">
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {timeStr}
          </span>
          <span>{(record.weight / 1000).toFixed(2)} kg</span>
          <span className="text-orange-500/70">钾 {Math.round(record.potassium)}mg</span>
          <span className="text-blue-500/70">磷 {Math.round(record.phosphorus)}mg</span>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-red-400 opacity-0 transition hover:bg-red-50 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/** 添加记录抽屉 */
function AddRecordDrawer({
  fruits,
  frequentFruits,
  filteredFruits,
  query,
  setQuery,
  onClose,
  onRecord,
}: {
  fruits: Fruit[];
  frequentFruits: Fruit[];
  filteredFruits: Fruit[];
  query: string;
  setQuery: (v: string) => void;
  onClose: () => void;
  onRecord: (fruit: Fruit, weightGrams: number) => void;
}) {
  const [selected, setSelected] = useState<Fruit | null>(null);
  const [weight, setWeight] = useState('100');
  const [unit, setUnit] = useState<WeightUnit>('g');

  const handleRecord = () => {
    if (!selected) return;
    const unitInfo = WEIGHT_UNITS.find((u) => u.key === unit)!;
    const inputValue = Number(weight) || 0;
    if (inputValue <= 0) return;
    const weightGrams = unitInfo.toGram(inputValue);
    if (weightGrams <= 0) return;
    onRecord(selected, weightGrams);
  };

  const selectFruit = (fruit: Fruit) => {
    setSelected(fruit);
    setWeight('100');
    setUnit('g');
  };

  const displayList = query.trim() ? filteredFruits : (frequentFruits.length > 0 ? frequentFruits : fruits.slice(0, 12));

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[101] max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white/90 backdrop-blur-xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h3 className="text-lg font-semibold text-teal-700">
            {selected ? '选择重量' : '记录水果'}
          </h3>
          <button
            onClick={selected ? () => setSelected(null) : onClose}
            className="glass-tile flex h-8 w-8 items-center justify-center rounded-full text-teal-600 transition hover:scale-105"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!selected ? (
          <div className="space-y-4 px-6 pb-6 pt-3">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索水果名称"
                autoFocus
                className="glass-tile w-full rounded-xl py-3 pl-10 pr-4 text-sm text-teal-700 placeholder:text-teal-600/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
              />
            </div>

            {!query.trim() && frequentFruits.length > 0 && (
              <p className="text-xs text-teal-600/50">常吃的水果</p>
            )}
            {!query.trim() && frequentFruits.length === 0 && (
              <p className="text-xs text-teal-600/50">选择水果</p>
            )}

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {displayList.map((fruit) => (
                <button
                  key={fruit.id}
                  onClick={() => selectFruit(fruit)}
                  className="glass-tile flex flex-col items-center gap-1 rounded-xl p-3 transition hover:scale-[1.03] active:scale-95"
                >
                  <span className="text-3xl">{fruit.emoji}</span>
                  <span className="text-xs font-medium text-teal-700">{fruit.name}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                      LEVEL_COLORS[fruit.level].bg,
                      LEVEL_COLORS[fruit.level].text
                    )}
                  >
                    {LEVEL_TEXT[fruit.level]}
                  </span>
                </button>
              ))}
            </div>

            {displayList.length === 0 && (
              <div className="py-8 text-center text-sm text-teal-600/50">
                未找到相关水果
              </div>
            )}
          </div>
        ) : (
          <WeightSelector
            fruit={selected}
            weight={weight}
            setWeight={setWeight}
            unit={unit}
            setUnit={setUnit}
            onConfirm={handleRecord}
          />
        )}
      </motion.div>
    </>
  );
}

/** 格式化小数值 */
function formatDecimal(value: number, digits: number = 3): string {
  if (!Number.isFinite(value)) return '0';
  const fixed = value.toFixed(digits);
  if (fixed.includes('.')) {
    return fixed.replace(/\.?0+$/, '');
  }
  return fixed;
}

/** 重量选择器 */
function WeightSelector({
  fruit,
  weight,
  setWeight,
  unit,
  setUnit,
  onConfirm,
}: {
  fruit: Fruit;
  weight: string;
  setWeight: (v: string) => void;
  unit: WeightUnit;
  setUnit: (v: WeightUnit) => void;
  onConfirm: () => void;
}) {
  const unitInfo = WEIGHT_UNITS.find((u) => u.key === unit)!;
  const inputValue = Number(weight) || 0;
  const weightGrams = inputValue > 0 ? unitInfo.toGram(inputValue) : 0;
  const nutrients = useMemo(
    () => calculateNutrients(fruit, weightGrams),
    [fruit, weightGrams]
  );

  const presets = [
    { w: 50, u: 'g' as WeightUnit, label: '50g' },
    { w: 100, u: 'g' as WeightUnit, label: '100g' },
    { w: 150, u: 'g' as WeightUnit, label: '150g' },
    { w: 200, u: 'g' as WeightUnit, label: '200g' },
    { w: 1, u: 'jin' as WeightUnit, label: '1斤' },
    { w: 1, u: 'kg' as WeightUnit, label: '1kg' },
  ];

  return (
    <div className="space-y-4 px-6 pb-6 pt-3">
      {/* 选中水果信息 */}
      <div className="glass-tile flex items-center gap-3 rounded-2xl p-4">
        <span className="text-4xl">{fruit.emoji}</span>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-teal-700">{fruit.name}</h4>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                LEVEL_COLORS[fruit.level].bg,
                LEVEL_COLORS[fruit.level].text
              )}
            >
              {LEVEL_TEXT[fruit.level]}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-teal-600/60">
            每100g含钾 {fruit.potassiumPer100g}mg · 磷 {fruit.phosphorusPer100g}mg
          </p>
        </div>
      </div>

      {/* 快捷重量 */}
      <div>
        <p className="mb-2 text-xs font-medium text-teal-600/70">快捷选择</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const isActive = weight === String(preset.w) && unit === preset.u;
            return (
              <button
                key={`${preset.w}-${preset.u}`}
                onClick={() => {
                  setWeight(String(preset.w));
                  setUnit(preset.u);
                }}
                className={cn(
                  'rounded-lg border px-3.5 py-2 text-xs font-medium transition',
                  isActive
                    ? 'border-teal-400 bg-teal-100 text-teal-700 shadow-sm'
                    : 'glass-tile text-teal-600 hover:scale-[1.02]'
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 自定义重量 */}
      <div>
        <p className="mb-2 text-xs font-medium text-teal-600/70">自定义重量</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="输入重量"
            autoFocus
            className="glass-tile min-w-0 flex-1 rounded-xl px-4 py-3 text-base font-medium text-teal-700 placeholder:text-teal-600/40 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
            onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as WeightUnit)}
            className="glass-tile rounded-xl px-3 py-3 text-sm font-medium text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
          >
            {WEIGHT_UNITS.map((u) => (
              <option key={u.key} value={u.key}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 营养预览 */}
      {weightGrams > 0 && (
        <div className="glass-tile rounded-2xl p-4">
          <p className="mb-2 text-xs font-medium text-teal-600/70">
            {formatDecimal(weightGrams >= 1000 ? weightGrams / 1000 : weightGrams, weightGrams >= 1000 ? 2 : 0)}
            {weightGrams >= 1000 ? ' kg' : ' g'} {fruit.name} 营养含量
          </p>
          <div className="grid grid-cols-2 gap-2">
            <NutrientPreview label="钾" value={nutrients.potassiumMg} unit="mg" colorClass="text-orange-500" />
            <NutrientPreview label="磷" value={nutrients.phosphorusMg} unit="mg" colorClass="text-blue-500" />
            <NutrientPreview label="钠" value={nutrients.sodiumMg} unit="mg" colorClass="text-purple-500" />
            <NutrientPreview label="水分" value={nutrients.waterMl} unit="ml" colorClass="text-cyan-500" />
          </div>
        </div>
      )}

      {/* 确认按钮 */}
      <button
        onClick={onConfirm}
        disabled={weightGrams <= 0}
        className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-sage-500 py-3.5 text-sm font-medium text-white shadow-lg shadow-teal-500/20 transition active:scale-[0.98] disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
      >
        {weightGrams > 0 ? '确认记录' : '请输入重量'}
      </button>
    </div>
  );
}

/** 营养预览项 */
function NutrientPreview({
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
    <div className="rounded-xl bg-white/70 p-2.5">
      <div className="text-[10px] text-teal-600/50">{label}</div>
      <div className={cn('text-base font-bold', colorClass)}>
        {formatDecimal(value, 1)}
        <span className="ml-0.5 text-[10px] font-normal text-teal-600/40">{unit}</span>
      </div>
    </div>
  );
}