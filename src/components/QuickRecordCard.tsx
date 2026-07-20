import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Check, Search, X } from 'lucide-react';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useFruitsStore } from '@/store/useFruitsStore';
import { cn } from '@/lib/utils';
import type { FC, ReactNode } from 'react';

interface BaseProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  theme: 'teal' | 'sage' | 'clay';
  children: ReactNode;
}

function QuickRecordShell({ title, subtitle, icon, theme, children }: BaseProps) {
  const [open, setOpen] = useState(false);

  const themeMap = {
    teal: {
      bar: 'from-teal-500 to-teal-600',
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      hover: 'hover:border-teal-300',
    },
    sage: {
      bar: 'from-sage-400 to-sage-500',
      bg: 'bg-sage-50',
      text: 'text-sage-600',
      hover: 'hover:border-sage-300',
    },
    clay: {
      bar: 'from-clay-400 to-clay-500',
      bg: 'bg-clay-50',
      text: 'text-clay-600',
      hover: 'hover:border-clay-300',
    },
  }[theme];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-cream-300 bg-white/80 transition-all',
        themeMap.hover,
        open && 'shadow-soft-lg'
      )}
    >
      {/* 顶部条 */}
      <div className={cn('h-1 w-full bg-gradient-to-r', themeMap.bar)} />

      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl',
              themeMap.bg,
              themeMap.text
            )}
          >
            {icon}
          </div>
          <div>
            <div className="font-medium text-teal-700">{title}</div>
            <div className="mt-0.5 text-xs text-teal-600/60">{subtitle}</div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className={cn('flex h-8 w-8 items-center justify-center rounded-full', themeMap.bg)}
        >
          <ChevronDown className={cn('h-4 w-4', themeMap.text)} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-cream-200 p-5 pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 饮水快速记录
export const WaterQuickRecord: FC = () => {
  const addWaterRecord = useRecordsStore((s) => s.addWaterRecord);
  const [amount, setAmount] = useState('');
  const [saved, setSaved] = useState(false);

  const presets = [50, 100, 150, 200];

  const handleSave = (value?: number) => {
    const n = value ?? Number(amount);
    if (!n || n <= 0) return;
    addWaterRecord({ amount: n });
    setAmount('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <QuickRecordShell
      title="饮水记录"
      subtitle="记录每次饮水量"
      icon={<Plus className="h-5 w-5" />}
      theme="teal"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => handleSave(p)}
              className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-1.5 text-sm font-medium text-teal-600 transition hover:border-teal-300 hover:bg-teal-50"
            >
              {p} ml
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="输入毫升数"
            className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400 focus:bg-white"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={() => handleSave()}
            disabled={!amount || Number(amount) <= 0}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
              saved
                ? 'bg-sage-500 text-white'
                : 'bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40'
            )}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" /> 已记录
              </>
            ) : (
              '记录'
            )}
          </button>
        </div>
      </div>
    </QuickRecordShell>
  );
};

// 超滤量快速记录
export const UltrafiltrationQuickRecord: FC = () => {
  const addUltrafiltrationRecord = useRecordsStore((s) => s.addUltrafiltrationRecord);
  const [amount, setAmount] = useState('');
  const [saved, setSaved] = useState(false);

  const presets = [300, 500, 800, 1000];

  const handleSave = (value?: number) => {
    const n = value ?? Number(amount);
    if (!n || n <= 0) return;
    addUltrafiltrationRecord({ amount: n });
    setAmount('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <QuickRecordShell
      title="超滤记录"
      subtitle="记录每次透析超滤量"
      icon={<Plus className="h-5 w-5" />}
      theme="clay"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => handleSave(p)}
              className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-1.5 text-sm font-medium text-clay-600 transition hover:border-clay-300 hover:bg-clay-50"
            >
              {p} ml
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="输入毫升数"
            className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-clay-400 focus:bg-white"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={() => handleSave()}
            disabled={!amount || Number(amount) <= 0}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
              saved
                ? 'bg-sage-500 text-white'
                : 'bg-clay-400 text-white hover:bg-clay-500 disabled:opacity-40'
            )}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" /> 已记录
              </>
            ) : (
              '记录'
            )}
          </button>
        </div>
      </div>
    </QuickRecordShell>
  );
};

// 水果快速记录
export const FruitQuickRecord: FC = () => {
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const allFruits = [...customFruits, ...builtinFruits];
  const [selectedFruitId, setSelectedFruitId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  const selectedFruit = allFruits.find((f) => f.id === selectedFruitId);
  const filtered = search.trim()
    ? allFruits.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : allFruits.slice(0, 8);

  const handleSave = () => {
    if (!selectedFruit || !weight || Number(weight) <= 0) return;
    addFruitRecord({ fruit: selectedFruit, weight: Number(weight) });
    setWeight('');
    setSelectedFruitId(null);
    setShowPicker(false);
    setSearch('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <QuickRecordShell
      title="水果记录"
      subtitle="选择水果并输入重量"
      icon={<Plus className="h-5 w-5" />}
      theme="sage"
    >
      <div className="space-y-3">
        {/* 已选水果展示 */}
        {selectedFruit && !showPicker && (
          <div className="flex items-center justify-between rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedFruit.emoji}</span>
              <div>
                <div className="text-sm font-medium text-sage-700">{selectedFruit.name}</div>
                <div className="whitespace-nowrap text-[10px] text-sage-600/70">
                  每100g：钾{selectedFruit.potassiumPer100g} / 磷{selectedFruit.phosphorusPer100g} / 钠{selectedFruit.sodiumPer100g} mg
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs text-sage-600 underline"
            >
              更换
            </button>
          </div>
        )}

        {/* 水果选择器 */}
        {!selectedFruit && (
          <button
            onClick={() => setShowPicker(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sage-300 bg-sage-50/50 px-4 py-3 text-sm text-sage-600 hover:bg-sage-50"
          >
            <Search className="h-4 w-4" /> 选择水果
          </button>
        )}

        {/* 重量输入 */}
        {selectedFruit && (
          <div className="flex gap-2">
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="输入克数"
              className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-sage-400 focus:bg-white"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={handleSave}
              disabled={!weight || Number(weight) <= 0}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                saved
                  ? 'bg-sage-500 text-white'
                  : 'bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-40'
              )}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" /> 已记录
                </>
              ) : (
                '记录'
              )}
            </button>
          </div>
        )}

        {/* 元素摄入预览 */}
        {selectedFruit && weight && Number(weight) > 0 && (
          <div className="rounded-xl bg-sage-50 px-4 py-2 text-xs text-sage-700">
            本次将摄入：钾{' '}
            <span className="font-semibold">
              {Math.round((selectedFruit.potassiumPer100g * Number(weight)) / 100)}
            </span>{' '}
            / 磷{' '}
            <span className="font-semibold">
              {Math.round((selectedFruit.phosphorusPer100g * Number(weight)) / 100)}
            </span>{' '}
            / 钠{' '}
            <span className="font-semibold">
              {Math.round((selectedFruit.sodiumPer100g * Number(weight)) / 100)}
            </span>{' '}
            mg
          </div>
        )}
      </div>

      {/* 水果选择浮层 */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-teal-700/40 backdrop-blur-sm sm:items-center">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-cream-50 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-cream-200 p-4">
              <h3 className="font-medium text-teal-700">选择水果</h3>
              <button
                onClick={() => setShowPicker(false)}
                className="rounded-full p-1.5 text-teal-600 hover:bg-cream-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索水果名称"
                  autoFocus
                  className="w-full rounded-xl border border-cream-300 bg-white py-2.5 pl-9 pr-4 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-sage-400"
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFruitId(f.id);
                        setShowPicker(false);
                        setSearch('');
                      }}
                      className="flex items-center gap-2 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-left transition hover:border-sage-300 hover:bg-sage-50"
                    >
                      <span className="text-xl">{f.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-teal-700">
                          {f.name}
                        </div>
                        <div className="text-[10px] text-teal-600/60">
                          钾{f.potassiumPer100g} / 磷{f.phosphorusPer100g} / 钠{f.sodiumPer100g}
                        </div>
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-sm text-teal-600/60">
                      未找到匹配的水果
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </QuickRecordShell>
  );
};

export default QuickRecordShell;
