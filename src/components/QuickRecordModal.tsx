/**
 * 统一快速记录弹窗
 *
 * 点击 Dashboard 上的任意指标卡片，弹出底部半屏弹窗进行快速录入。
 * 支持类型：饮水 / 超滤 / 体重 / 血压 / 水果 / 服药
 */

import { useState, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Search, Pill, Scale, Heart, Droplets, Gauge, Citrus } from 'lucide-react';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useMedicationsStore } from '@/store/useMedicationsStore';
import { MEDICATION_CATEGORIES } from '@/data/medications';
import { formatWeightKg } from '@/utils/calc';
import { cn } from '@/lib/utils';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export type RecordType =
  | 'water'
  | 'ultrafiltration'
  | 'weight'
  | 'bloodPressure'
  | 'fruit'
  | 'medication';

interface QuickRecordModalProps {
  open: boolean;
  type: RecordType | null;
  onClose: () => void;
}

const TYPE_META: Record<RecordType, { title: string; icon: React.ReactNode; color: string; bg: string }> = {
  water: { title: '记录饮水', icon: <Droplets className="h-5 w-5" />, color: 'text-teal-600', bg: 'bg-teal-50' },
  ultrafiltration: { title: '记录超滤量', icon: <Gauge className="h-5 w-5" />, color: 'text-clay-600', bg: 'bg-clay-50' },
  weight: { title: '记录体重', icon: <Scale className="h-5 w-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  bloodPressure: { title: '记录血压', icon: <Heart className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
  fruit: { title: '记录水果', icon: <Citrus className="h-5 w-5" />, color: 'text-sage-600', bg: 'bg-sage-50' },
  medication: { title: '记录服药', icon: <Pill className="h-5 w-5" />, color: 'text-teal-600', bg: 'bg-teal-50' },
};

export default function QuickRecordModal({ open, type, onClose }: QuickRecordModalProps) {
  useLockBodyScroll(open);
  useOverlayBackHandler(open, onClose);

  if (!type) return null;
  const meta = TYPE_META[type];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-teal-700/40 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-cream-50 sm:rounded-3xl"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', meta.bg, meta.color)}>
                  {meta.icon}
                </div>
                <h3 className="font-serif text-lg font-semibold text-teal-700">{meta.title}</h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-100 text-teal-600 hover:bg-cream-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="overflow-y-auto px-5 py-4">
              {type === 'water' && <WaterForm onSaved={onClose} />}
              {type === 'ultrafiltration' && <UltrafiltrationForm onSaved={onClose} />}
              {type === 'weight' && <WeightForm onSaved={onClose} />}
              {type === 'bloodPressure' && <BloodPressureForm onSaved={onClose} />}
              {type === 'fruit' && <FruitForm onSaved={onClose} />}
              {type === 'medication' && <MedicationForm onSaved={onClose} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ====== 各类型表单 ====== */

function WaterForm({ onSaved }: { onSaved: () => void }) {
  const addWaterRecord = useRecordsStore((s) => s.addWaterRecord);
  const [amount, setAmount] = useState('');
  const [saved, setSaved] = useState(false);
  const presets = [50, 100, 150, 200, 250, 300];

  const handleSave = (val?: number) => {
    const n = val ?? Number(amount);
    if (!n || n <= 0) return;
    addWaterRecord({ amount: n });
    setSaved(true);
    setTimeout(() => { onSaved(); setSaved(false); }, 600);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p} onClick={() => handleSave(p)}
            className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-1.5 text-sm font-medium text-teal-600 transition hover:border-teal-300 hover:bg-teal-50">
            {p} ml
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="输入毫升数" onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400 focus:bg-white" />
        <button onClick={() => handleSave()} disabled={!amount || Number(amount) <= 0}
          className={cn('flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
            saved ? 'bg-sage-500 text-white' : 'bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40')}>
          {saved ? <><Check className="h-4 w-4" /> 已记录</> : '记录'}
        </button>
      </div>
    </div>
  );
}

function UltrafiltrationForm({ onSaved }: { onSaved: () => void }) {
  const addUltrafiltrationRecord = useRecordsStore((s) => s.addUltrafiltrationRecord);
  const [amount, setAmount] = useState('');
  const [saved, setSaved] = useState(false);
  const presets = [300, 500, 800, 1000, 1500, 2000];

  const handleSave = (val?: number) => {
    const n = val ?? Number(amount);
    if (!n || n <= 0) return;
    addUltrafiltrationRecord({ amount: n });
    setSaved(true);
    setTimeout(() => { onSaved(); setSaved(false); }, 600);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p} onClick={() => handleSave(p)}
            className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-1.5 text-sm font-medium text-clay-600 transition hover:border-clay-300 hover:bg-clay-50">
            {p} ml
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="输入毫升数" onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-clay-400 focus:bg-white" />
        <button onClick={() => handleSave()} disabled={!amount || Number(amount) <= 0}
          className={cn('flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
            saved ? 'bg-sage-500 text-white' : 'bg-clay-400 text-white hover:bg-clay-500 disabled:opacity-40')}>
          {saved ? <><Check className="h-4 w-4" /> 已记录</> : '记录'}
        </button>
      </div>
    </div>
  );
}

function WeightForm({ onSaved }: { onSaved: () => void }) {
  const addWeightRecord = useRecordsStore((s) => s.addWeightRecord);
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);
  const presets = [45, 50, 55, 60, 65, 70, 75, 80];

  const handleSave = (val?: number) => {
    const n = val ?? Number(value);
    if (!n || n <= 0) return;
    addWeightRecord({ value: n });
    setSaved(true);
    setTimeout(() => { onSaved(); setSaved(false); }, 600);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p} onClick={() => handleSave(p)}
            className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50">
            {p} kg
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)}
          placeholder="输入体重 (kg)" step="0.1" onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-indigo-400 focus:bg-white" />
        <button onClick={() => handleSave()} disabled={!value || Number(value) <= 0}
          className={cn('flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
            saved ? 'bg-sage-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40')}>
          {saved ? <><Check className="h-4 w-4" /> 已记录</> : '记录'}
        </button>
      </div>
    </div>
  );
}

function BloodPressureForm({ onSaved }: { onSaved: () => void }) {
  const addBloodPressureRecord = useRecordsStore((s) => s.addBloodPressureRecord);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const s = Number(systolic);
    const d = Number(diastolic);
    if (!s || !d || s <= 0 || d <= 0) return;
    addBloodPressureRecord({ systolic: s, diastolic: d, heartRate: heartRate ? Number(heartRate) : undefined });
    setSaved(true);
    setTimeout(() => { onSaved(); setSaved(false); }, 600);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] text-teal-600/60">收缩压 (mmHg)</label>
          <input type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)}
            placeholder="如 120" onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-red-400 focus:bg-white" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] text-teal-600/60">舒张压 (mmHg)</label>
          <input type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)}
            placeholder="如 80" onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-red-400 focus:bg-white" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-teal-600/60">心率 (bpm，可选)</label>
        <input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)}
          placeholder="如 72" onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-red-400 focus:bg-white" />
      </div>
      <button onClick={handleSave} disabled={!systolic || !diastolic || Number(systolic) <= 0 || Number(diastolic) <= 0}
        className={cn('flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
          saved ? 'bg-sage-500 text-white' : 'bg-red-400 text-white hover:bg-red-500 disabled:opacity-40')}>
        {saved ? <><Check className="h-4 w-4" /> 已记录</> : '记录血压'}
      </button>
    </div>
  );
}

function FruitForm({ onSaved }: { onSaved: () => void }) {
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

  const handleSave = () => {
    if (!selectedFruit || !weight || Number(weight) <= 0) return;
    addFruitRecord({ fruit: selectedFruit, weight: Number(weight) });
    setSaved(true);
    setTimeout(() => { onSaved(); setSaved(false); }, 600);
  };

  return (
    <Fragment>
      <div className="space-y-3">
        {selectedFruit && !showPicker && (
          <div className="flex items-center justify-between rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedFruit.emoji}</span>
              <div>
                <div className="text-sm font-medium text-sage-700">{selectedFruit.name}</div>
                <div className="text-[10px] text-sage-600/70">
                  每100g：钾{selectedFruit.potassiumPer100g}mg / 磷{selectedFruit.phosphorusPer100g}mg
                </div>
              </div>
            </div>
            <button onClick={() => setShowPicker(true)} className="text-xs text-sage-600 underline">更换</button>
          </div>
        )}
        {(!selectedFruit || showPicker) && (
          <button onClick={() => setShowPicker(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sage-300 bg-sage-50/50 px-4 py-3 text-sm text-sage-600 hover:bg-sage-50">
            <Search className="h-4 w-4" /> 选择水果
          </button>
        )}
        {selectedFruit && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {[100, 150, 200, 250].map((w) => (
                <button key={w} onClick={() => setWeight(String(w))}
                  className="rounded-lg border border-cream-300 bg-cream-50 px-2 py-1 text-[11px] font-medium text-teal-600 transition hover:border-sage-300 hover:bg-sage-50">
                  {formatWeightKg(w)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                placeholder="输入克数 (g)" onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-sage-400 focus:bg-white" />
              <button onClick={handleSave} disabled={!weight || Number(weight) <= 0}
                className={cn('flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                  saved ? 'bg-sage-500 text-white' : 'bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-40')}>
                {saved ? <><Check className="h-4 w-4" /> 已记录</> : '记录'}
              </button>
            </div>
          </>
        )}
        {selectedFruit && weight && Number(weight) > 0 && (
          <div className="rounded-xl bg-sage-50 px-4 py-2 text-xs text-sage-700">
            本次 {formatWeightKg(Number(weight))}：钾 <b>{Math.round((selectedFruit.potassiumPer100g * Number(weight)) / 100)}</b> mg / 磷 <b>{Math.round((selectedFruit.phosphorusPer100g * Number(weight)) / 100)}</b> mg
          </div>
        )}
      </div>

      {/* 水果选择器 */}
      {createPortal(
        <AnimatePresence>
          {showPicker && (
            <motion.div
              className="fixed inset-0 z-[110] flex items-end justify-center bg-teal-700/40 backdrop-blur-sm sm:items-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPicker(false)}
            >
              <motion.div
                initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-cream-50 sm:rounded-3xl"
              >
                <div className="flex items-center justify-between border-b border-cream-200 p-4">
                  <h3 className="font-medium text-teal-700">选择水果</h3>
                  <button onClick={() => setShowPicker(false)} className="rounded-full p-1.5 text-teal-600 hover:bg-cream-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索水果名称" autoFocus={false}
                      className="w-full rounded-xl border border-cream-300 bg-white py-2.5 pl-9 pr-4 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-sage-400" />
                  </div>
                  <div className="max-h-[50dvh] space-y-2 overflow-y-auto">
                    {filtered.map((f) => (
                      <button key={f.id}
                        onClick={() => { setSelectedFruitId(f.id); setShowPicker(false); setSearch(''); }}
                        className="flex w-full items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-left transition hover:border-sage-300 hover:bg-sage-50">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cream-100 text-xl">{f.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-teal-700">{f.name}</span>
                            {f.potassiumPer100g >= 200 && <span className="rounded-full bg-clay-100 px-1.5 py-0.5 text-[9px] font-medium text-clay-600">高钾</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <NutrientBadge label="钾" value={f.potassiumPer100g} unit="mg" tone={f.potassiumPer100g >= 200 ? 'high' : 'normal'} />
                            <NutrientBadge label="磷" value={f.phosphorusPer100g} unit="mg" />
                            <NutrientBadge label="钠" value={f.sodiumPer100g} unit="mg" />
                            <NutrientBadge label="水" value={f.waterPer100g} unit="ml" />
                          </div>
                        </div>
                      </button>
                    ))}
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
}

function MedicationForm({ onSaved }: { onSaved: () => void }) {
  const addMedicationRecord = useRecordsStore((s) => s.addMedicationRecord);
  const customMedications = useMedicationsStore((s) => s.customMedications);
  const builtinMedications = useMedicationsStore((s) => s.builtinMedications);
  const allMedications = [...customMedications, ...builtinMedications];
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);
  const [timesOfDay, setTimesOfDay] = useState('早');
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  const selectedMed = allMedications.find((m) => m.id === selectedMedId);
  const filtered = search.trim()
    ? allMedications.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : allMedications;

  const handleSave = () => {
    if (!selectedMed) return;
    addMedicationRecord({ medication: selectedMed, timesOfDay });
    setSaved(true);
    setTimeout(() => { onSaved(); setSaved(false); }, 600);
  };

  return (
    <Fragment>
      <div className="space-y-3">
        {selectedMed && !showPicker && (
          <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedMed.emoji}</span>
              <div>
                <div className="text-sm font-medium text-teal-700">{selectedMed.name}</div>
                <div className="text-[10px] text-teal-600/70">
                  每次 {selectedMed.usage.defaultDose}{selectedMed.usage.unit} · {selectedMed.usage.frequency}
                </div>
              </div>
            </div>
            <button onClick={() => setShowPicker(true)} className="text-xs text-teal-600 underline">更换</button>
          </div>
        )}
        {(!selectedMed || showPicker) && (
          <button onClick={() => setShowPicker(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 px-4 py-3 text-sm text-teal-600 hover:bg-teal-50">
            <Search className="h-4 w-4" /> 选择药物
          </button>
        )}
        {selectedMed && (
          <>
            <div>
              <div className="mb-1.5 text-xs font-medium text-teal-600">服药时段</div>
              <div className="flex flex-wrap gap-1.5">
                {['早', '中', '晚', '睡前'].map((t) => (
                  <button key={t} onClick={() => setTimesOfDay(t)}
                    className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                      timesOfDay === t ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-cream-300 bg-cream-50 text-teal-600 hover:border-teal-300 hover:bg-teal-50')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSave}
              className={cn('flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                saved ? 'bg-sage-500 text-white' : 'bg-teal-500 text-white hover:bg-teal-600')}>
              {saved ? <><Check className="h-4 w-4" /> 已记录</> : `记录 ${selectedMed.usage.defaultDose}${selectedMed.usage.unit}`}
            </button>
          </>
        )}
      </div>

      {/* 药物选择器 */}
      {createPortal(
        <AnimatePresence>
          {showPicker && (
            <motion.div
              className="fixed inset-0 z-[110] flex items-end justify-center bg-teal-700/40 backdrop-blur-sm sm:items-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPicker(false)}
            >
              <motion.div
                initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-cream-50 sm:rounded-3xl"
              >
                <div className="flex items-center justify-between border-b border-cream-200 p-4">
                  <h3 className="font-medium text-teal-700">选择药物</h3>
                  <button onClick={() => setShowPicker(false)} className="rounded-full p-1.5 text-teal-600 hover:bg-cream-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索药物名称" autoFocus={false}
                      className="w-full rounded-xl border border-cream-300 bg-white py-2.5 pl-9 pr-4 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400" />
                  </div>
                  <div className="max-h-[50dvh] space-y-2 overflow-y-auto">
                    {filtered.map((m) => (
                      <button key={m.id}
                        onClick={() => { setSelectedMedId(m.id); setShowPicker(false); setSearch(''); }}
                        className="flex w-full items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-left transition hover:border-teal-300 hover:bg-teal-50">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cream-100 text-xl">{m.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-teal-700">{m.name}</span>
                          </div>
                          <div className="mt-0.5 text-[10px] text-teal-600/60">
                            {MEDICATION_CATEGORIES[m.category].name} · {m.usage.defaultDose}{m.usage.unit}
                          </div>
                        </div>
                      </button>
                    ))}
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
}

function NutrientBadge({ label, value, unit, tone = 'normal' }: { label: string; value: number; unit: string; tone?: 'normal' | 'high' }) {
  return (
    <span className={cn('inline-flex items-baseline gap-0.5 rounded-md px-1.5 py-0.5 text-[10px]',
      tone === 'high' ? 'bg-clay-100 text-clay-700' : 'bg-cream-100 text-teal-700')}>
      <span className={tone === 'high' ? 'text-clay-500' : 'text-teal-600/70'}>{label}</span>
      <span className="font-semibold">{value}</span>
      <span className={tone === 'high' ? 'text-clay-500' : 'text-teal-600/50'}>{unit}</span>
    </span>
  );
}