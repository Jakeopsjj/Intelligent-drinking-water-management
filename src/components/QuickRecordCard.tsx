import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Check, Search, X } from 'lucide-react';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatWeightKg } from '@/utils/calc';
import { cn } from '@/lib/utils';
import { getCardBaseClass, getInnerCardClass, getListRowClass, getBodyBackgroundStyle, getHeaderClass } from '@/lib/theme';
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
  const cardTheme = useSettingsStore((s) => s.settings.cardTheme || 'glass');
  const isOriginal = cardTheme === 'original';

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
        'overflow-hidden rounded-[28px] border transition-all',
        getCardBaseClass(cardTheme),
        open && (isOriginal ? 'shadow-soft-lg' : 'shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)]')
      )}
    >
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
            <div className={cn('border-t p-5 pt-4', isOriginal ? 'border-cream-200' : 'border-white/60')}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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

export const FruitQuickRecord: FC = () => {
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const cardTheme = useSettingsStore((s) => s.settings.cardTheme || 'glass');
  const isOriginal = cardTheme === 'original';
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

  const pageBgStyle = getBodyBackgroundStyle(cardTheme);
  const pageBgClass = isOriginal ? 'bg-cream-50' : '';

  return (
    <>
      <QuickRecordShell
        title="水果记录"
        subtitle="选择水果并输入重量"
        icon={<Plus className="h-5 w-5" />}
        theme="sage"
      >
        <div className="space-y-3">
          {selectedFruit && !showPicker && (
            <div className={cn(
              'flex items-center justify-between rounded-xl border px-4 py-2.5',
              isOriginal ? 'border-cream-200 bg-cream-50' : 'border-sage-200 bg-sage-50'
            )}>
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

          {!selectedFruit && (
            <button
              onClick={() => setShowPicker(true)}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-sage-600',
                isOriginal ? 'border-cream-300 bg-cream-50 hover:bg-cream-100' : 'border-sage-300 bg-sage-50/50 hover:bg-sage-50'
              )}
            >
              <Search className="h-4 w-4" /> 选择水果
            </button>
          )}

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

          {selectedFruit && weight && Number(weight) > 0 && (
            <div className="whitespace-nowrap rounded-xl bg-sage-50 px-4 py-2 text-xs text-sage-700">
              本次 {formatWeightKg(Number(weight))}：钾 <span className="font-semibold">{Math.round((selectedFruit.potassiumPer100g * Number(weight)) / 100)}</span> mg / 磷 <span className="font-semibold">{Math.round((selectedFruit.phosphorusPer100g * Number(weight)) / 100)}</span> mg / 钠 <span className="font-semibold">{Math.round((selectedFruit.sodiumPer100g * Number(weight)) / 100)}</span> mg / 水 <span className="font-semibold">{Math.round((selectedFruit.waterPer100g * Number(weight)) / 100)}</span> ml
            </div>
          )}
        </div>
      </QuickRecordShell>

      {createPortal(
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn("fixed inset-0 z-[100] flex flex-col", pageBgClass)}
              style={pageBgStyle}
            >
              <div className={cn(
                'flex items-center justify-between px-4 pb-3 pt-10 border-b',
                getHeaderClass(cardTheme)
              )}>
                <button
                  onClick={() => { setShowPicker(false); setSearch(''); }}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-teal-700',
                    isOriginal ? 'hover:bg-cream-200' : 'active:bg-black/5'
                  )}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <h3 className="font-serif text-lg font-semibold text-teal-800">选择水果</h3>
                <div className="h-9 w-9" />
              </div>

              <div className={cn(
                'border-b px-4 py-3',
                isOriginal ? 'border-cream-200' : 'border-white/40'
              )}>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索水果名称"
                    autoFocus
                    className={cn(
                      'w-full rounded-2xl border py-3 pl-10 pr-4 text-sm text-teal-800 placeholder:text-teal-600/40 focus:outline-none',
                      isOriginal
                        ? 'border-cream-300 bg-white focus:border-sage-400'
                        : 'border-cream-200 bg-white/80 focus:border-sage-400 focus:bg-white'
                    )}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 pb-8">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-4xl opacity-40">🔍</div>
                    <p className="mt-3 text-sm text-teal-600/60">未找到匹配的水果</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setSelectedFruitId(f.id);
                          setShowPicker(false);
                          setSearch('');
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left shadow-sm transition active:scale-[0.99]',
                          getListRowClass(cardTheme)
                        )}
                      >
                        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sage-50 text-3xl">
                          {f.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-teal-800">{f.name}</span>
                            {f.potassiumPer100g >= 200 && (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-600">高钾</span>
                            )}
                            {f.potassiumPer100g >= 150 && f.potassiumPer100g < 200 && (
                              <span className="rounded-full bg-clay-100 px-1.5 py-0.5 text-[9px] font-medium text-clay-600">中钾</span>
                            )}
                            {f.potassiumPer100g < 150 && (
                              <span className="rounded-full bg-sage-100 px-1.5 py-0.5 text-[9px] font-medium text-sage-600">低钾</span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-teal-600/70">
                            <span className="whitespace-nowrap">钾 <b className="text-teal-700">{f.potassiumPer100g}</b>mg</span>
                            <span className="text-cream-400">·</span>
                            <span className="whitespace-nowrap">磷 <b className="text-teal-700">{f.phosphorusPer100g}</b>mg</span>
                            <span className="text-cream-400">·</span>
                            <span className="whitespace-nowrap">钠 <b className="text-teal-700">{f.sodiumPer100g}</b>mg</span>
                            <span className="text-cream-400">·</span>
                            <span className="whitespace-nowrap">水 <b className="text-teal-700">{f.waterPer100g}</b>ml</span>
                          </div>
                        </div>
                        <svg className="h-4 w-4 flex-shrink-0 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default QuickRecordShell;
