import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Info, Trash2 } from 'lucide-react';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { LEVEL_TEXT, LEVEL_COLORS } from '@/utils/calc';
import { cn } from '@/lib/utils';
import type { Fruit } from '@/types';

export default function Fruits() {
  const allFruits = useFruitsStore((s) => s.allFruits());
  const customFruits = useFruitsStore((s) => s.customFruits);
  const addFruit = useFruitsStore((s) => s.addFruit);
  const deleteFruit = useFruitsStore((s) => s.deleteFruit);
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);

  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);

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
            <h1 className="font-serif text-3xl font-semibold text-teal-700">水果钾含量库</h1>
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
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索水果名称"
            className="w-full rounded-2xl border border-cream-300 bg-white/70 py-3 pl-11 pr-4 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400 focus:bg-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-teal-600/40 hover:bg-cream-200"
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
            className="rounded-3xl border border-cream-300 bg-white/70 p-6 shadow-soft"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((fruit) => (
                <FruitCard
                  key={fruit.id}
                  fruit={fruit}
                  onQuickAdd={(w) => addFruitRecord({ fruit, weight: w })}
                  onDeleteCustom={fruit.isCustom ? () => deleteFruit(fruit.id) : undefined}
                />
              ))}
            </div>
          </motion.section>
        );
      })}

      {filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-cream-300 bg-white/40 py-16 text-center">
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
        className="fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-sage-500 text-white shadow-soft-lg transition hover:scale-105 hover:shadow-soft-lg active:scale-95 md:bottom-8"
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
    </div>
  );
}

// 图例徽章
function LegendBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium',
        LEVEL_COLORS[level].bg,
        LEVEL_COLORS[level].text
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LEVEL_TEXT[level]}
    </span>
  );
}

// 水果卡片
function FruitCard({
  fruit,
  onQuickAdd,
  onDeleteCustom,
}: {
  fruit: Fruit;
  onQuickAdd: (weight: number) => void;
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
    <div className="group relative overflow-hidden rounded-2xl border border-cream-200 bg-white/70 p-4 transition hover:border-teal-300 hover:shadow-soft">
      {/* 顶部 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-2xl">
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
            </div>
            <div className="mt-0.5 text-xs text-teal-600/60">
              每 100g 含钾{' '}
              <span className="font-medium text-teal-700">{fruit.potassiumPer100g} mg</span>
            </div>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium ring-1',
            LEVEL_COLORS[fruit.level].bg,
            LEVEL_COLORS[fruit.level].text,
            LEVEL_COLORS[fruit.level].ring
          )}
        >
          {LEVEL_TEXT[fruit.level]}
        </span>
      </div>

      {/* 建议 */}
      <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-cream-50 px-3 py-2 text-xs text-teal-600/70">
        <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
        <span>{fruit.suggestion}</span>
      </div>

      {/* 快速记录 */}
      {showAdd ? (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="输入克数"
            autoFocus
            className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-3 py-1.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-sage-400 focus:bg-white"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="rounded-xl bg-sage-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sage-600"
          >
            记录
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="rounded-xl border border-cream-300 px-2 py-1.5 text-sm text-teal-600 hover:bg-cream-100"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-600 transition hover:bg-teal-100"
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
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍇');
  const [potassium, setPotassium] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const emojiChoices = ['🍇', '🍊', '🍋', '🍎', '🍐', '🥭', '🍑', '🍓', '🥝', '🍍', '🥥', '🥑', '🍈', '🫐'];

  const handleSubmit = () => {
    if (!name.trim() || !potassium || Number(potassium) <= 0) return;
    onAdd({
      name: name.trim(),
      emoji,
      potassiumPer100g: Number(potassium),
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
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream-50 p-6 shadow-soft-lg"
      >
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-teal-700">添加自定义水果</h3>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-teal-600 hover:bg-cream-200"
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

            {/* 钾含量 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-teal-600">
                每 100g 含钾量 (mg) <span className="text-clay-500">*</span>
              </label>
              <input
                type="number"
                value={potassium}
                onChange={(e) => setPotassium(e.target.value)}
                placeholder="例如：180"
                className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400"
              />
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
