import { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Citrus, HeartPulse, ChevronRight, Check, Atom, Waves } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { DEFAULT_SETTINGS } from '@/data/fruits';
import { cn } from '@/lib/utils';
import { getBodyBackgroundClass, getBodyBackgroundStyle, getPageShellClass } from '@/lib/theme';

const STEPS = ['欢迎', '摄水限额', '元素限额', '完成'] as const;

export default function Onboarding() {
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const cardTheme = useSettingsStore((s) => s.settings.cardTheme || 'glass');
  const isOriginal = cardTheme === 'original';

  const [step, setStep] = useState(0);
  const [waterLimit, setWaterLimit] = useState(DEFAULT_SETTINGS.dailyWaterLimit);
  const [potassiumLimit, setPotassiumLimit] = useState(DEFAULT_SETTINGS.dailyPotassiumLimit);
  const [phosphorusLimit, setPhosphorusLimit] = useState(DEFAULT_SETTINGS.dailyPhosphorusLimit);
  const [sodiumLimit, setSodiumLimit] = useState(DEFAULT_SETTINGS.dailySodiumLimit);
  const [fruitLimit, setFruitLimit] = useState(DEFAULT_SETTINGS.dailyFruitLimit);
  const [ufTarget, setUfTarget] = useState(DEFAULT_SETTINGS.dailyUltrafiltrationTarget);

  const handleComplete = () => {
    updateSettings({
      dailyWaterLimit: waterLimit,
      dailyPotassiumLimit: potassiumLimit,
      dailyPhosphorusLimit: phosphorusLimit,
      dailySodiumLimit: sodiumLimit,
      dailyFruitLimit: fruitLimit,
      dailyUltrafiltrationTarget: ufTarget,
      initialized: true,
    });
  };

  const bodyBgClass = getBodyBackgroundClass(cardTheme);
  const bodyBgStyle = getBodyBackgroundStyle(cardTheme);

  return (
    <div
      className={cn('flex min-h-screen items-center justify-center px-6', isOriginal ? 'bg-cream-50' : 'bg-gradient-to-br from-cream-100 via-cream-50 to-sage-50', bodyBgClass)}
      style={bodyBgStyle}
    >
      <div className={cn(
        'relative w-full max-w-lg overflow-hidden rounded-3xl border p-8',
        getPageShellClass(cardTheme)
      )}>
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-clay-400/10 blur-3xl" />

        <div className="relative">
          <div className="mb-8 flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step
                    ? 'w-8 bg-teal-500'
                    : i < step
                    ? 'w-1.5 bg-sage-400'
                    : 'w-1.5 bg-cream-300'
                )}
              />
            ))}
          </div>

          {step === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-sage-500 shadow-soft">
                <Droplets className="h-8 w-8 text-white" />
              </div>
              <h1 className="mt-5 font-serif text-2xl font-semibold text-teal-700">
                欢迎使用肾友笔记
              </h1>
              <p className="mt-2 text-sm text-teal-600/70">
                一款专为透析患者设计的健康追踪应用，帮你轻松记录每日摄水、超滤、水果摄入与钾磷钠元素。
              </p>

              <div className="mt-6 space-y-2 text-left">
                <FeatureRow icon={<Droplets className="h-4 w-4" />} title="摄水控制" desc="实时查看剩余配额" />
                <FeatureRow icon={<HeartPulse className="h-4 w-4" />} title="元素追踪" desc="钾 / 磷 / 钠自动计算" />
                <FeatureRow icon={<Citrus className="h-4 w-4" />} title="水果库参考" desc="内置 24 种常见水果" />
              </div>

              <button
                onClick={() => setStep(1)}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-500 py-3 text-sm font-medium text-white shadow-soft transition hover:bg-teal-600"
              >
                开始设置 <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="mb-2 flex items-center gap-2 text-teal-500">
                <Droplets className="h-5 w-5" />
                <span className="text-xs font-medium uppercase tracking-wider">Step 2 / 4</span>
              </div>
              <h2 className="font-serif text-2xl font-semibold text-teal-700">每日摄水限额</h2>
              <p className="mt-1 text-sm text-teal-600/70">
                请根据医嘱设置每日摄水限额（含汤水、水果中的水分）。
              </p>

              <NumberPicker
                value={waterLimit}
                onChange={setWaterLimit}
                unit="ml"
                presets={[500, 800, 1000, 1200, 1500]}
              />

              <StepperButtons
                onBack={() => setStep(0)}
                onNext={() => setStep(2)}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="mb-2 flex items-center gap-2 text-teal-500">
                <HeartPulse className="h-5 w-5" />
                <span className="text-xs font-medium uppercase tracking-wider">Step 3 / 4</span>
              </div>
              <h2 className="font-serif text-2xl font-semibold text-teal-700">元素摄入限额</h2>
              <p className="mt-1 text-sm text-teal-600/70">
                透析患者需严格控制钾、磷、钠摄入，参考下方常用预设。
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-teal-600">
                    <HeartPulse className="h-3.5 w-3.5" /> 钾摄入限额（建议 2000-3000mg）
                  </div>
                  <NumberPicker
                    value={potassiumLimit}
                    onChange={setPotassiumLimit}
                    unit="mg"
                    step={100}
                    presets={[1500, 2000, 2500, 3000]}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-teal-600">
                    <Atom className="h-3.5 w-3.5" /> 磷摄入限额（建议 800-1000mg）
                  </div>
                  <NumberPicker
                    value={phosphorusLimit}
                    onChange={setPhosphorusLimit}
                    unit="mg"
                    step={50}
                    presets={[600, 800, 1000, 1200]}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-teal-600">
                    <Waves className="h-3.5 w-3.5" /> 钠摄入限额（5g 食盐 ≈ 2000mg 钠）
                  </div>
                  <NumberPicker
                    value={sodiumLimit}
                    onChange={setSodiumLimit}
                    unit="mg"
                    step={100}
                    presets={[1500, 2000, 2500, 3000]}
                  />
                </div>
              </div>

              <StepperButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="mb-2 flex items-center gap-2 text-teal-500">
                <Check className="h-5 w-5" />
                <span className="text-xs font-medium uppercase tracking-wider">Step 4 / 4</span>
              </div>
              <h2 className="font-serif text-2xl font-semibold text-teal-700">设置完成</h2>
              <p className="mt-1 text-sm text-teal-600/70">已为你配置以下限额，可随时在设置中调整：</p>

              <div className="mt-4 space-y-2">
                <SummaryItem icon={<Droplets className="h-4 w-4" />} label="每日摄水" value={`${waterLimit} ml`} />
                <SummaryItem icon={<HeartPulse className="h-4 w-4" />} label="钾摄入上限" value={`${potassiumLimit} mg`} />
                <SummaryItem icon={<Atom className="h-4 w-4" />} label="磷摄入上限" value={`${phosphorusLimit} mg`} />
                <SummaryItem icon={<Waves className="h-4 w-4" />} label="钠摄入上限" value={`${sodiumLimit} mg`} />
                <SummaryItem icon={<Citrus className="h-4 w-4" />} label="水果摄入" value={`${fruitLimit} g`} />
              </div>

              <button
                onClick={handleComplete}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-sage-500 py-3 text-sm font-medium text-white shadow-soft transition hover:shadow-soft-lg"
              >
                进入应用 <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-cream-50 px-3 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-teal-700">{title}</div>
        <div className="text-[11px] text-teal-600/60">{desc}</div>
      </div>
    </div>
  );
}

function NumberPicker({
  value,
  onChange,
  unit,
  step = 50,
  presets,
}: {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
  presets?: number[];
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 rounded-2xl border border-cream-300 bg-white p-1">
        <button
          onClick={() => onChange(Math.max(0, value - step))}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-xl text-teal-600 hover:bg-cream-100"
        >
          −
        </button>
        <div className="flex-1 text-center">
          <span className="font-serif text-3xl font-semibold text-teal-700">{value}</span>
          <span className="ml-1 text-xs text-teal-600/60">{unit}</span>
        </div>
        <button
          onClick={() => onChange(value + step)}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-xl text-teal-600 hover:bg-cream-100"
        >
          +
        </button>
      </div>

      {presets && (
        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition',
                value === p
                  ? 'bg-teal-500 text-white'
                  : 'bg-cream-100 text-teal-600 hover:bg-cream-200'
              )}
            >
              {p} {unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepperButtons({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="mt-7 flex gap-3">
      <button
        onClick={onBack}
        className="flex-1 rounded-2xl border border-cream-300 bg-white py-3 text-sm font-medium text-teal-600 transition hover:bg-cream-100"
      >
        上一步
      </button>
      <button
        onClick={onNext}
        className="flex-1 rounded-2xl bg-teal-500 py-3 text-sm font-medium text-white shadow-soft transition hover:bg-teal-600"
      >
        下一步
      </button>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-cream-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-teal-500">{icon}</span>
        <span className="text-sm text-teal-700">{label}</span>
      </div>
      <span className="font-serif text-sm font-semibold text-teal-700">{value}</span>
    </div>
  );
}
