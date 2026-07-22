import { useState } from 'react';
import { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Check, Search, X } from 'lucide-react';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useFruitsStore } from '@/store/useFruitsStore';
import { formatWeightKg } from '@/utils/calc';
import { cn } from '@/lib/utils';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
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
        'glass-card relative overflow-hidden rounded-[28px] transition-all',
        open && 'shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)]'
      )}
    >
      {/* 流动反光 */}
      <div className="glass-shimmer" />
      {/* 顶部渐变条 */}
      <div className={cn('relative z-10 h-1 w-full bg-gradient-to-r', themeMap.bar)} />

      <button
        onClick={() => setOpen(!open)}
        className="relative z-10 flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'glass-tile flex h-11 w-11 items-center justify-center rounded-2xl',
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
          className={cn('glass-tile flex h-8 w-8 items-center justify-center rounded-full', themeMap.text)}
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
            className="relative z-10 overflow-hidden"
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
    : allFruits;

  // 水果选择器打开时，注册到返回处理栈，侧滑 / 返回键可关闭浮层
  useOverlayBackHandler(showPicker, () => setShowPicker(false));

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
    <Fragment>
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
                    每100g：钾 {selectedFruit.potassiumPer100g}mg / 磷 {selectedFruit.phosphorusPer100g}mg / 钠 {selectedFruit.sodiumPer100g}mg / 水 {selectedFruit.waterPer100g}ml
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
          {(!selectedFruit || showPicker) && (
            <button
              onClick={() => setShowPicker(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sage-300 bg-sage-50/50 px-4 py-3 text-sm text-sage-600 hover:bg-sage-50"
            >
              <Search className="h-4 w-4" /> 选择水果
            </button>
          )}

          {/* 重量输入 */}
          {selectedFruit && (
            <>
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
                  placeholder="输入克数 (g)，将自动换算为 kg 显示"
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
            </>
          )}

          {/* 元素摄入预览（含水分） */}
          {selectedFruit && weight && Number(weight) > 0 && (
            <div className="whitespace-nowrap rounded-xl bg-sage-50 px-4 py-2 text-xs text-sage-700">
              本次 {formatWeightKg(Number(weight))}：钾 <span className="font-semibold">{Math.round((selectedFruit.potassiumPer100g * Number(weight)) / 100)}</span> mg / 磷 <span className="font-semibold">{Math.round((selectedFruit.phosphorusPer100g * Number(weight)) / 100)}</span> mg / 钠 <span className="font-semibold">{Math.round((selectedFruit.sodiumPer100g * Number(weight)) / 100)}</span> mg / 水 <span className="font-semibold">{Math.round((selectedFruit.waterPer100g * Number(weight)) / 100)}</span> ml
            </div>
          )}
        </div>
      </QuickRecordShell>

      {/* 水果选择浮层 - 通过 Portal 渲染到 document.body
          避免 QuickRecordShell 外层 div 的 backdrop-blur-xl 创建 containing block，
          导致 position: fixed 失效、被 overflow-hidden 裁剪。 */}
      {createPortal(
        <AnimatePresence>
          {showPicker && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-teal-700/40 backdrop-blur-sm sm:items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-cream-50 sm:rounded-3xl"
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
                  <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                    {filtered.map((f) => {
                      const isHighK = f.potassiumPer100g >= 200;
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            setSelectedFruitId(f.id);
                            setShowPicker(false);
                            setSearch('');
                          }}
                          className="flex w-full items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-left transition hover:border-sage-300 hover:bg-sage-50"
                        >
                          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cream-100 text-xl">
                            {f.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-teal-700">
                                {f.name}
                              </span>
                              {isHighK && (
                                <span className="rounded-full bg-clay-100 px-1.5 py-0.5 text-[9px] font-medium text-clay-600">
                                  高钾
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <NutrientBadge label="钾" value={f.potassiumPer100g} unit="mg" tone={isHighK ? 'high' : 'normal'} />
                              <NutrientBadge label="磷" value={f.phosphorusPer100g} unit="mg" />
                              <NutrientBadge label="钠" value={f.sodiumPer100g} unit="mg" />
                              <NutrientBadge label="水" value={f.waterPer100g} unit="ml" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {filtered.length === 0 && (
                      <div className="py-8 text-center text-sm text-teal-600/60">
                        未找到匹配的水果
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </Fragment>
  );
};

export default QuickRecordShell;

// 元素含量小标签：清晰展示每个元素的具体数值
function NutrientBadge({
  label,
  value,
  unit,
  tone = 'normal',
}: {
  label: string;
  value: number;
  unit: string;
  tone?: 'normal' | 'high';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px]',
        tone === 'high'
          ? 'bg-clay-100 text-clay-700'
          : 'bg-cream-100 text-teal-700'
      )}
    >
      <span className={tone === 'high' ? 'text-clay-500' : 'text-teal-600/70'}>
        {label}
      </span>
      <span className="font-semibold">{value}</span>
      <span className={tone === 'high' ? 'text-clay-500' : 'text-teal-600/50'}>
        {unit}
      </span>
    </span>
  );
}
