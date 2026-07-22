import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Info, Trash2, ChevronRight, Globe, Sprout, Leaf, Heart, ShieldAlert, Snowflake, Apple } from 'lucide-react';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { LEVEL_TEXT, LEVEL_COLORS, formatWeightKg } from '@/utils/calc';
import { cn } from '@/lib/utils';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import DetailDrawer, { FieldIcons } from '@/components/DetailDrawer';
import type { Fruit } from '@/types';

export default function Fruits() {
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const addFruit = useFruitsStore((s) => s.addFruit);
  const deleteFruit = useFruitsStore((s) => s.deleteFruit);
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);

  const allFruits = [...customFruits, ...builtinFruits];

  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Fruit | null>(null);

  // 添加水果抽屉打开时，注册到返回处理栈，侧滑 / 返回键可关闭抽屉
  useOverlayBackHandler(showAdd, () => setShowAdd(false));

  const filtered = query.trim()
    ? allFruits.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    : allFruits;

  // 分组
  const grouped = {
    low: filtered.filter((f) => f.level === 'low'),
    medium: filtered.filter((f) => f.level === 'medium'),
    high: filtered.filter((f) => f.level === 'high'),
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-teal-700">水果元素含量库</h1>
            <p className="mt-1 text-sm text-teal-600/60">
              共 {allFruits.length} 种水果，可添加自定义水果
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <LegendBadge level="low" />
            <LegendBadge level="medium" />
            <LegendBadge level="high" />
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索水果名称"
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

        {/* 移动端图例 */}
        <div className="mt-3 flex items-center gap-2 sm:hidden">
          <LegendBadge level="low" />
          <LegendBadge level="medium" />
          <LegendBadge level="high" />
        </div>
      </motion.header>

      {/* 分组列表 */}
      {(['low', 'medium', 'high'] as const).map((level) => {
        const list = grouped[level];
        if (list.length === 0) return null;
        return (
          <motion.section
            key={level}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card relative overflow-hidden rounded-3xl p-6"
          >
            <div className="glass-orb -right-8 -top-8 h-28 w-28 bg-sage-300/20" style={{ animationDelay: `${level === 'low' ? 0 : level === 'medium' ? 2 : 4}s` }} />
            <div className="glass-shimmer" />
            <div className="relative z-10 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium',
                    LEVEL_COLORS[level].bg,
                    LEVEL_COLORS[level].text
                  )}
                >
                  {LEVEL_TEXT[level]}
                </span>
                <h2 className="font-serif text-lg font-semibold text-teal-700">
                  {level === 'low' ? '可食用' : level === 'medium' ? '适量食用' : '应避免'}
                </h2>
              </div>
              <span className="text-xs text-teal-600/60">{list.length} 种</span>
            </div>

            <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((fruit) => (
                <FruitCard
                  key={fruit.id}
                  fruit={fruit}
                  onQuickAdd={(w) => addFruitRecord({ fruit, weight: w })}
                  onSelectDetail={() => setSelected(fruit)}
                  onDeleteCustom={fruit.isCustom ? () => deleteFruit(fruit.id) : undefined}
                />
              ))}
            </div>
          </motion.section>
        );
      })}

      {filtered.length === 0 && (
        <div className="glass-card rounded-3xl py-16 text-center">
          <p className="text-sm text-teal-600/60">未找到匹配的水果</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 text-sm font-medium text-teal-600 underline"
          >
            添加新水果
          </button>
        </div>
      )}

      {/* 浮动添加按钮 */}
      <button
        onClick={() => setShowAdd(true)}
        className="glass-btn fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-sage-500 text-white shadow-soft-lg transition hover:scale-105 hover:shadow-soft-lg active:scale-95 md:bottom-8"
        aria-label="添加水果"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* 添加水果抽屉 */}
      <AnimatePresence>
        {showAdd && (
          <AddFruitDrawer
            onClose={() => setShowAdd(false)}
            onAdd={(f) => {
              addFruit(f);
              setShowAdd(false);
            }}
            customCount={customFruits.length}
          />
        )}
      </AnimatePresence>

      {/* 水果详情抽屉 */}
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        kind="fruit"
        image={selected?.image}
        name={selected?.name ?? ''}
        emoji={selected?.emoji ?? '🍇'}
        subtitle={selected?.aliases}
        badges={
          selected ? (
            <span
              className={cn(
                'whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium ring-1',
                LEVEL_COLORS[selected.level].bg,
                LEVEL_COLORS[selected.level].text,
                LEVEL_COLORS[selected.level].ring
              )}
            >
              {LEVEL_TEXT[selected.level]}
            </span>
          ) : undefined
        }
        description={selected?.description}
        fields={[
          ...(selected?.usage
            ? [{
                icon: FieldIcons.usage,
                label: '推荐食用方法 / 注意事项',
                content: selected.usage,
              }]
            : []),
          ...(selected?.nutrients
            ? [{
                icon: FieldIcons.nutrients,
                label: '营养成分',
                content: selected.nutrients,
              }]
            : []),
          {
            label: '每 100g 元素含量',
            content: (
              <div className="flex flex-wrap gap-1.5">
                <NutrientTag label="钾" value={selected?.potassiumPer100g ?? 0} unit="mg" />
                <NutrientTag label="磷" value={selected?.phosphorusPer100g ?? 0} unit="mg" />
                <NutrientTag label="钠" value={selected?.sodiumPer100g ?? 0} unit="mg" />
                <NutrientTag label="水" value={selected?.waterPer100g ?? 0} unit="ml" />
              </div>
            ),
          },
          ...(selected?.origin
            ? [{
                icon: <Globe className="h-3.5 w-3.5" />,
                label: '起源与分布',
                content: selected.origin,
              }]
            : []),
          ...(selected?.varieties
            ? [{
                icon: <Apple className="h-3.5 w-3.5" />,
                label: '主要品种',
                content: selected.varieties,
              }]
            : []),
          ...(selected?.cultivation
            ? [{
                icon: <Sprout className="h-3.5 w-3.5" />,
                label: '栽培与生产',
                content: selected.cultivation,
              }]
            : []),
          ...(selected?.healthBenefits
            ? [{
                icon: <Heart className="h-3.5 w-3.5" />,
                label: '健康益处',
                content: selected.healthBenefits,
              }]
            : []),
          ...(selected?.precautions
            ? [{
                icon: <ShieldAlert className="h-3.5 w-3.5" />,
                label: '食用禁忌与注意事项',
                content: selected.precautions,
              }]
            : []),
          ...(selected?.storage
            ? [{
                icon: <Snowflake className="h-3.5 w-3.5" />,
                label: '保存方法',
                content: selected.storage,
              }]
            : []),
          ...(selected?.culture
            ? [{
                icon: <Leaf className="h-3.5 w-3.5" />,
                label: '文化与历史',
                content: selected.culture,
              }]
            : []),
        ]}
        footer={
          selected && (
            <button
              onClick={() => {
                addFruitRecord({ fruit: selected, weight: 100 });
                setSelected(null);
              }}
              className="w-full rounded-xl bg-sage-500 py-3 text-sm font-medium text-white shadow-soft transition hover:bg-sage-600"
            >
              快速记录 100g
            </button>
          )
        }
      />
    </div>
  );
}

// 图例徽章
function LegendBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium',
        LEVEL_COLORS[level].bg,
        LEVEL_COLORS[level].text
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LEVEL_TEXT[level]}
    </span>
  );
}

// 元素含量小标签（带明确单位 mg/100g）
function NutrientTag({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <span className="inline-flex whitespace-nowrap items-baseline gap-0.5 rounded-md bg-cream-100 px-1.5 py-0.5 text-[10px] text-teal-600/80">
      <span className="text-teal-600/60">{label}</span>
      <span className="font-medium text-teal-700">{value}</span>
      <span className="text-teal-600/40">{unit}</span>
    </span>
  );
}

// 水果卡片
function FruitCard({
  fruit,
  onQuickAdd,
  onSelectDetail,
  onDeleteCustom,
}: {
  fruit: Fruit;
  onQuickAdd: (weight: number) => void;
  onSelectDetail: () => void;
  onDeleteCustom?: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [weight, setWeight] = useState('');

  const handleAdd = () => {
    const w = Number(weight);
    if (w > 0) {
      onQuickAdd(w);
      setWeight('');
      setShowAdd(false);
    }
  };

  return (
    <div className="glass-tile group relative overflow-hidden rounded-2xl p-4 transition hover:border-teal-300 hover:shadow-soft">
      {/* 顶部可点击区域：查看详情 */}
      <button
        onClick={onSelectDetail}
        className="relative z-10 flex w-full items-start justify-between text-left transition"
      >
        <div className="flex items-center gap-3">
          <div className="glass-tile flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-2xl">
            {fruit.emoji}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-teal-700">{fruit.name}</h3>
              {fruit.isCustom && (
                <span className="rounded-full bg-sage-100 px-1.5 py-0.5 text-[9px] font-medium text-sage-600">
                  自定义
                </span>
              )}
              <ChevronRight className="h-3 w-3 text-teal-600/40" />
            </div>
            <div className="mt-0.5 text-[9px] text-teal-600/40">每 100g 含 · 点击查看详情</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <NutrientTag label="钾" value={fruit.potassiumPer100g} unit="mg" />
              <NutrientTag label="磷" value={fruit.phosphorusPer100g} unit="mg" />
              <NutrientTag label="钠" value={fruit.sodiumPer100g} unit="mg" />
              <NutrientTag label="水" value={fruit.waterPer100g} unit="ml" />
            </div>
          </div>
        </div>
        <span
          className={cn(
            'whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ring-1',
            LEVEL_COLORS[fruit.level].bg,
            LEVEL_COLORS[fruit.level].text,
            LEVEL_COLORS[fruit.level].ring
          )}
        >
          {LEVEL_TEXT[fruit.level]}
        </span>
      </button>

      {/* 建议 */}
      <div className="relative z-10 mt-3 flex items-start gap-1.5 rounded-xl bg-cream-50/70 px-3 py-2 text-xs text-teal-600/70">
        <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
        <span>{fruit.suggestion}</span>
      </div>

      {/* 快速记录 */}
      {showAdd ? (
        <div className="relative z-10 mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {[100, 150, 200, 250].map((w) => (
              <button
                key={w}
                onClick={() => setWeight(String(w))}
                className="whitespace-nowrap rounded-lg border border-cream-300 bg-cream-50 px-2 py-1 text-[11px] font-medium text-teal-600 transition hover:border-sage-300 hover:bg-sage-50"
              >
                {formatWeightKg(w)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="输入克数 (g)，将换算为 kg"
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-cream-50 px-3 py-1.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-sage-400 focus:bg-white"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              className="flex-shrink-0 whitespace-nowrap rounded-xl bg-sage-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sage-600"
            >
              记录
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex-shrink-0 whitespace-nowrap rounded-xl border border-cream-300 px-3 py-1.5 text-sm text-teal-600 hover:bg-cream-100"
            >
              取消
            </button>
          </div>
          {weight && Number(weight) > 0 && (
            <div className="whitespace-nowrap rounded-lg bg-sage-50 px-3 py-1.5 text-[10px] text-sage-700">
              本次 {formatWeightKg(Number(weight))}：钾 <span className="font-semibold">{Math.round((fruit.potassiumPer100g * Number(weight)) / 100)}</span> mg / 磷 <span className="font-semibold">{Math.round((fruit.phosphorusPer100g * Number(weight)) / 100)}</span> mg / 钠 <span className="font-semibold">{Math.round((fruit.sodiumPer100g * Number(weight)) / 100)}</span> mg / 水 <span className="font-semibold">{Math.round((fruit.waterPer100g * Number(weight)) / 100)}</span> ml
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 mt-3 flex items-center justify-between">
          <button
            onClick={() => setShowAdd(true)}
            className="glass-btn rounded-xl px-3 py-1.5 text-xs font-medium text-teal-600 transition hover:bg-teal-50"
          >
            + 快速记录
          </button>
          {onDeleteCustom && (
            <button
              onClick={onDeleteCustom}
              className="rounded-lg p-1 text-teal-600/30 transition hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// 添加水果抽屉
function AddFruitDrawer({
  onClose,
  onAdd,
  customCount,
}: {
  onClose: () => void;
  onAdd: (fruit: Omit<Fruit, 'id' | 'isCustom' | 'level'>) => void;
  customCount: number;
}) {
  // 锁定背景滚动，避免抽屉唤出时页面跳动
  useLockBodyScroll(true);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍇');
  const [potassium, setPotassium] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [sodium, setSodium] = useState('');
  const [water, setWater] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const emojiChoices = ['🍇', '🍊', '🍋', '🍎', '🍐', '🥭', '🍑', '🍓', '🥝', '🍍', '🥥', '🥑', '🍈', '🫐'];

  const handleSubmit = () => {
    if (!name.trim() || !potassium || Number(potassium) <= 0) return;
    onAdd({
      name: name.trim(),
      emoji,
      potassiumPer100g: Number(potassium),
      phosphorusPer100g: Number(phosphorus) || 0,
      sodiumPer100g: Number(sodium) || 0,
      waterPer100g: Number(water) || 80,
      suggestion: suggestion.trim() || '请根据医嘱适量食用',
    });
  };

  const isVaild = name.trim() && potassium && Number(potassium) > 0;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-teal-700/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl p-6 shadow-soft-lg [will-change:transform] [transform:translateZ(0)]"
      >
        <div className="glass-shimmer" />
        <div className="relative z-10 mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-teal-700">添加自定义水果</h3>
            <button
              onClick={onClose}
              className="glass-tile rounded-full p-1.5 text-teal-600 hover:bg-cream-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* 名称 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-teal-600">
                水果名称 <span className="text-clay-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：柚子"
                className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              />
              <p className="mt-1 text-[10px] text-teal-600/40">
                添加后，详情页将自动联网获取真实配图与介绍
              </p>
            </div>

            {/* emoji 选择 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-teal-600">水果图标</label>
              <div className="flex flex-wrap gap-2">
                {emojiChoices.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition',
                      emoji === e
                        ? 'border-teal-400 bg-teal-50'
                        : 'border-cream-300 bg-white hover:bg-cream-100'
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* 元素含量：钾 / 磷 / 钠 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-teal-600">
                每 100g 含钾量 <span className="text-teal-600/50">(mg)</span> <span className="text-clay-500">*</span>
              </label>
              <input
                type="number"
                value={potassium}
                onChange={(e) => setPotassium(e.target.value)}
                placeholder="例如：180"
                className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-teal-600">
                  磷 <span className="text-teal-600/50">(mg/100g)</span>
                </label>
                <input
                  type="number"
                  value={phosphorus}
                  onChange={(e) => setPhosphorus(e.target.value)}
                  placeholder="可选"
                  className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-teal-600">
                  钠 <span className="text-teal-600/50">(mg/100g)</span>
                </label>
                <input
                  type="number"
                  value={sodium}
                  onChange={(e) => setSodium(e.target.value)}
                  placeholder="可选"
                  className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-teal-600">
                  水分 <span className="text-teal-600/50">(ml/100g)</span>
                </label>
                <input
                  type="number"
                  value={water}
                  onChange={(e) => setWater(e.target.value)}
                  placeholder="默认 80"
                  className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
                />
              </div>
            </div>

            {/* 建议 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-teal-600">食用建议</label>
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="可选，例如：可适量食用，建议不超过 150g"
                rows={2}
                className="w-full resize-none rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              />
            </div>

            {/* 自动判断等级 */}
            {potassium && Number(potassium) > 0 && (
              <div className="rounded-xl bg-cream-100 px-4 py-2.5 text-xs text-teal-600">
                系统将自动判定为
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-2 py-0.5 font-medium',
                    LEVEL_COLORS[
                      Number(potassium) < 150 ? 'low' : Number(potassium) < 200 ? 'medium' : 'high'
                    ].bg,
                    LEVEL_COLORS[
                      Number(potassium) < 150 ? 'low' : Number(potassium) < 200 ? 'medium' : 'high'
                    ].text
                  )}
                >
                  {LEVEL_TEXT[
                    Number(potassium) < 150 ? 'low' : Number(potassium) < 200 ? 'medium' : 'high'
                  ]}
                </span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isVaild}
              className="w-full rounded-xl bg-teal-500 py-3 text-sm font-medium text-white shadow-soft transition hover:bg-teal-600 disabled:opacity-40"
            >
              添加水果
            </button>

            {customCount > 0 && (
              <p className="text-center text-xs text-teal-600/60">
                已添加 {customCount} 个自定义水果
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
