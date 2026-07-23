/**
 * 药物板块（重构版）
 *
 * 数据源：百度百科（检索 + 详情全量图文）
 * 流程：
 * 1. 顶部搜索框，输入药物名称
 * 2. 先查本地库（customMedications + builtinMedications）按 name 匹配
 * 3. 本地有 → 直接打开详情页
 * 4. 本地没有 → 调 searchBaike 拿百度百科候选 → 弹出底部抽屉选择
 * 5. 选中 → 关键词匹配自动判断分类 → 添加 → 打开详情
 * 6. 详情页：百度百科配图 + 摘要 + 信息框 + 结构化章节
 *    （适应症/用法用量/不良反应/禁忌/注意事项/药理毒理/药代动力学等全字段）
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, ChevronRight, BellRing, Clock, Pill as PillIcon, Check, WifiOff } from 'lucide-react';
import { useMedicationsStore } from '@/store/useMedicationsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useMedicationPlanStore } from '@/store/useMedicationPlanStore';
import { MEDICATION_CATEGORIES } from '@/data/medications';
import { cn } from '@/lib/utils';
import { searchBaike, type BaikeSearchItem } from '@/lib/baikeService';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useBaikeInfo } from '@/hooks/useBaikeInfo';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import SmartImage from '@/components/SmartImage';
import type { Medication, MedicationCategory } from '@/types';

export default function Medications() {
  const builtinMedications = useMedicationsStore((s) => s.builtinMedications);
  const customMedications = useMedicationsStore((s) => s.customMedications);
  const addMedication = useMedicationsStore((s) => s.addMedication);
  const deleteMedication = useMedicationsStore((s) => s.deleteMedication);
  const addMedicationRecord = useRecordsStore((s) => s.addMedicationRecord);
  const navigate = useNavigate();
  const enabledPlans = useMedicationPlanStore((s) => s.getEnabledPlans().length);

  const allMedications = [...customMedications, ...builtinMedications];

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MedicationCategory | 'all'>('all');
  const [selected, setSelected] = useState<Medication | null>(null);
  const [saved, setSaved] = useState(false);
  // 百度百科候选选择浮层（本地未命中时弹出）
  const [candidates, setCandidates] = useState<BaikeSearchItem[]>([]);

  useOverlayBackHandler(!!selected, () => setSelected(null));
  useOverlayBackHandler(candidates.length > 0, () => setCandidates([]));
  useLockBodyScroll(!!selected || candidates.length > 0);

  // 关键词分类
  const guessCategory = useCallback((name: string): MedicationCategory => {
    const n = name.toLowerCase();
    if (/碳酸钙|醋酸钙|司维拉姆|碳酸镧|氢氧化铝|磷结合|降磷/.test(n)) return 'phosphate-binder';
    if (/硝苯地平|氨氯地平|缬沙坦|氯沙坦|厄贝沙坦|替米沙坦|美托洛尔|比索洛尔|卡托普利|依那普利|培哚普利|降压|地平|沙坦|洛尔|普利/.test(n)) return 'antihypertensive';
    if (/促红|红细胞生成素|达依泊汀|epo|esa/.test(n)) return 'esa';
    if (/蔗糖铁|多糖铁|硫酸亚铁|琥珀酸亚铁|富马酸亚铁|铁剂|补铁/.test(n)) return 'iron';
    if (/维生素|叶酸|骨化三醇|维生素d|vitamin|b族/.test(n)) return 'vitamin';
    return 'other';
  }, []);

  const handleSearch = useCallback(async () => {
    const keyword = query.trim();
    if (!keyword || searching) return;
    setSearching(true);
    setError(null);

    // 1. 先查本地库（customMedications + builtinMedications），按 name 精确匹配
    const state = useMedicationsStore.getState();
    const local = [...state.customMedications, ...state.builtinMedications].find(
      (m) => m.name === keyword
    );
    if (local) {
      setSelected(local);
      setQuery('');
      setSearching(false);
      return;
    }

    // 2. 本地没有 → 联网检索百度百科候选
    try {
      const results = await searchBaike(keyword);
      if (results.length === 0) {
        setError('未找到相关药物，试试其他关键词');
        return;
      }
      setCandidates(results);
    } catch {
      setError('搜索失败，请重试');
    } finally {
      setSearching(false);
    }
  }, [query, searching]);

  const handleSelectCandidate = useCallback(
    (item: BaikeSearchItem) => {
      if (searching) return;
      const title = item.title;
      // 关闭候选浮层
      setCandidates([]);
      setError(null);
      try {
        const category = guessCategory(title);
        addMedication({
          name: title,
          emoji: '💊',
          category,
          usage: {
            unit: '片',
            defaultDose: 1,
            frequency: '每日1次',
            timing: '饭后',
          },
          level: 'medium',
        });

        const latest = useMedicationsStore.getState().customMedications;
        const newMed = [...latest].reverse().find((m) => m.name === title);
        if (newMed) {
          setSelected(newMed);
          setQuery('');
        }
      } catch {
        setError('添加失败，请重试');
      }
    },
    [searching, addMedication, guessCategory]
  );

  const handleQuickAdd = (med: Medication) => {
    addMedicationRecord({ medication: med });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  // 过滤
  const filtered = allMedications.filter((m) => {
    const matchQuery = !query.trim() || m.name.toLowerCase().includes(query.toLowerCase());
    const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchQuery && matchCat;
  });

  // 分组
  const grouped: Record<MedicationCategory, Medication[]> = {
    'phosphate-binder': [],
    'vitamin': [],
    'antihypertensive': [],
    'esa': [],
    'iron': [],
    'other': [],
  };
  for (const m of filtered) grouped[m.category].push(m);

  return (
    <div className="space-y-4">
      {/* 服药计划入口 */}
      <button
        onClick={() => navigate('/medication-plan')}
        className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-left transition hover:shadow-sm"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-medium text-teal-700">服药计划</h2>
          <p className="text-xs text-teal-600/60">
            {enabledPlans > 0 ? `${enabledPlans} 个启用中的提醒` : '点击设置服药提醒'}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-teal-600/40" />
      </button>

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索药物名称（如：硝苯地平缓释片）"
            className="w-full rounded-xl border border-cream-300 bg-white py-2.5 pl-10 pr-4 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="flex-shrink-0 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-600 disabled:opacity-40"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : '搜索'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition',
            selectedCategory === 'all'
              ? 'bg-teal-500 text-white'
              : 'bg-cream-100 text-teal-600'
          )}
        >
          全部
        </button>
        {(Object.keys(MEDICATION_CATEGORIES) as MedicationCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              selectedCategory === cat
                ? 'bg-teal-500 text-white'
                : 'bg-cream-100 text-teal-600'
            )}
          >
            {MEDICATION_CATEGORIES[cat].name}
          </button>
        ))}
      </div>

      {/* 药物列表 */}
      {(Object.keys(grouped) as MedicationCategory[]).map((cat) => {
        const meds = grouped[cat];
        if (meds.length === 0) return null;
        return (
          <div key={cat}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  MEDICATION_CATEGORIES[cat].bg,
                  MEDICATION_CATEGORIES[cat].color
                )}
              >
                {MEDICATION_CATEGORIES[cat].name}
              </span>
              <span className="text-xs text-teal-600/50">{meds.length} 种</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {meds.map((med) => (
                <MedicationCard
                  key={med.id}
                  med={med}
                  onClick={() => setSelected(med)}
                  onQuickAdd={() => handleQuickAdd(med)}
                  onDelete={med.isCustom ? () => deleteMedication(med.id) : undefined}
                  saved={saved && selected?.id === med.id}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* 详情弹层 */}
      <AnimatePresence>
        {selected && (
          <MedicationDetail
            med={selected}
            onClose={() => setSelected(null)}
            onQuickAdd={() => handleQuickAdd(selected)}
            saved={saved}
          />
        )}
      </AnimatePresence>

      {/* 百度百科候选选择浮层（本地未命中时弹出） */}
      <AnimatePresence>
        {candidates.length > 0 && (
          <>
            {/* 遮罩 */}
            <motion.div
              className="fixed inset-0 z-[100] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCandidates([])}
            />
            {/* 底部抽屉 */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[101] max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white/80 backdrop-blur-xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between px-6 pt-5">
                <h3 className="text-base font-semibold text-teal-700">选择药物</h3>
                <button
                  onClick={() => setCandidates([])}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-100 text-teal-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="px-6 pb-2 text-xs text-teal-600/50">
                未在本地找到「{query.trim()}」，从百度百科找到以下候选：
              </p>
              <div className="divide-y divide-cream-100">
                {candidates.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => handleSelectCandidate(item)}
                    className="flex w-full flex-col gap-1 px-6 py-3 text-left transition hover:bg-cream-50"
                  >
                    <span className="text-sm font-medium text-teal-700">{item.title}</span>
                    {item.description && (
                      <span className="block truncate text-xs leading-relaxed text-teal-600/60">
                        {item.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 药物卡片 */
function MedicationCard({
  med,
  onClick,
  onQuickAdd,
  onDelete,
  saved,
}: {
  med: Medication;
  onClick: () => void;
  onQuickAdd: () => void;
  onDelete?: () => void;
  saved: boolean;
}) {
  const cat = MEDICATION_CATEGORIES[med.category];
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <button onClick={onClick} className="flex flex-1 items-center gap-3 text-left">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-cream-50 text-2xl">
            {med.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-teal-700">{med.name}</h3>
            {med.purpose && (
              <p className="mt-0.5 truncate text-xs text-teal-600/60">{med.purpose}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', cat.bg, cat.color)}>
                {cat.name}
              </span>
              <span className="text-[10px] text-teal-600/50">
                {med.usage.defaultDose}{med.usage.unit} · {med.usage.frequency}
              </span>
            </div>
          </div>
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onQuickAdd}
          className="flex items-center gap-1.5 rounded-lg bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-600 transition hover:bg-sage-100"
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <PillIcon className="h-3.5 w-3.5" />}
          {saved ? '已记录' : '记录服药'}
        </button>
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 rounded-lg bg-cream-100 px-3 py-1.5 text-xs font-medium text-teal-600 transition hover:bg-cream-200"
        >
          详情
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto text-xs text-red-400 hover:text-red-600"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}

/** 药物详情弹层
 * 全部内容使用百度百科联网获取（摘要/正文/配图/信息框）
 */
function MedicationDetail({
  med,
  onClose,
  onQuickAdd,
  saved,
}: {
  med: Medication;
  onClose: () => void;
  onQuickAdd: () => void;
  saved: boolean;
}) {
  const cat = MEDICATION_CATEGORIES[med.category];
  // 详情页内容全部来自百度百科
  const { info, loading } = useBaikeInfo(med.name);
  const isOnline = useOnlineStatus();

  // 信息框键值对（过滤掉值过短或明显无效项）
  const infoboxEntries = info?.infobox
    ? Object.entries(info.infobox).filter(([, v]) => v && v.length > 1).slice(0, 8)
    : [];

  // 结构化章节（百度百科正文，覆盖适应症/用法用量/不良反应/禁忌/注意事项/药理毒理/药代动力学等全字段）
  const sections = info?.sections ?? [];
  // 兜底正文：无结构化章节时，按 \n\n 拆分 content
  const contentParas = !sections.length && info?.content
    ? info.content.split('\n\n').filter((p) => p.trim())
    : [];

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[101] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white/80 backdrop-blur-xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{med.emoji}</span>
            <div>
              <h3 className="text-lg font-semibold text-teal-700">{info?.title || med.name}</h3>
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-medium', cat.bg, cat.color)}>
                {cat.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-100 text-teal-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-4">
          {loading ? (
            isOnline ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-cream-50 py-10 text-sm text-teal-600/60">
                <Loader2 className="h-4 w-4 animate-spin" /> 正在从百度百科获取内容…
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-amber-50 py-10 text-sm text-amber-600">
                <WifiOff className="h-5 w-5" />
                <p>当前无网络连接</p>
                <p className="text-xs text-amber-600/60">仅展示已缓存的本地数据，联网后可获取完整内容</p>
              </div>
            )
          ) : info ? (
            <>
              {/* 百度百科配图（主图 + 多图） */}
              {(() => {
                const allImgs = [
                  ...(info.image ? [info.image] : []),
                  ...(info.images || []),
                ].filter((v, i, a) => v && a.indexOf(v) === i);
                if (allImgs.length === 0) return null;
                return (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {allImgs.slice(0, 5).map((img, i) => (
                      <SmartImage
                        key={i}
                        src={img}
                        alt={`${info.title || med.name} ${i + 1}`}
                        className="h-24 w-24 flex-shrink-0 rounded-xl"
                      />
                    ))}
                  </div>
                );
              })()}

              {/* 百度百科摘要 */}
              {info.summary && (
                <div className="rounded-2xl bg-cream-50 p-4">
                  <h4 className="mb-1.5 text-sm font-medium text-teal-700">摘要</h4>
                  <p className="text-sm leading-relaxed break-words text-teal-600/80">{info.summary}</p>
                </div>
              )}

              {/* 信息框键值对 */}
              {infoboxEntries.length > 0 && (
                <div className="rounded-2xl border border-cream-200 p-4">
                  <h4 className="mb-2 text-sm font-medium text-teal-700">基本信息</h4>
                  <dl className="grid grid-cols-1 gap-1.5">
                    {infoboxEntries.map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-sm">
                        <dt className="flex-shrink-0 text-teal-600/60">{k}</dt>
                        <dd className="text-teal-700">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* 百度百科结构化章节（覆盖适应症/用法用量/不良反应/禁忌/注意事项/药理毒理/药代动力学等全字段） */}
              {sections.length > 0 && (
                <div className="space-y-3">
                  {sections.map((sec, idx) => {
                    if (!sec.paragraphs.length) return null;
                    // 关键医学字段色彩区分：不良反应/禁忌 红色警示；注意事项 琥珀色；用法用量/适应症 主色
                    const isAdverse = /不良反应|副作用|毒副/.test(sec.title);
                    const isContra = /禁忌/.test(sec.title);
                    const isNotice = /注意事项|慎用|特殊人群/.test(sec.title);
                    const isUsage = /用法用量|给药|用量/.test(sec.title);
                    const isIndication = /适应症|功能主治|用途/.test(sec.title);
                    const cardClass = isAdverse || isContra
                      ? 'border-red-200 bg-red-50/40'
                      : isNotice
                        ? 'border-amber-200 bg-amber-50/40'
                        : isUsage || isIndication
                          ? 'border-teal-200 bg-teal-50/40'
                          : 'border-cream-200 bg-white';
                    const titleClass = isAdverse || isContra
                      ? 'text-red-600'
                      : isNotice
                        ? 'text-amber-600'
                        : isUsage || isIndication
                          ? 'text-teal-700'
                          : 'text-teal-700';
                    return (
                      <div key={idx} className={cn('rounded-2xl border p-4', cardClass)}>
                        <h4 className={cn('mb-2 flex items-center gap-1.5 text-sm font-semibold', titleClass)}>
                          <ChevronRight className="h-4 w-4" /> {sec.title}
                        </h4>
                        <div className="space-y-2">
                          {sec.paragraphs.map((p, i) => (
                            <p key={i} className="text-sm leading-relaxed break-words text-teal-600/80">{p}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 兜底正文：无结构化章节时按段落渲染 */}
              {contentParas.length > 0 && (
                <div className="rounded-2xl border border-cream-200 p-4">
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-teal-700">
                    <ChevronRight className="h-4 w-4" /> 详细内容
                  </h4>
                  <div className="space-y-2">
                    {contentParas.map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed break-words text-teal-600/80">{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* 数据源标注 */}
              <p className="px-1 text-[10px] text-teal-600/30">图文来源：百度百科</p>
            </>
          ) : (
            <div className="rounded-2xl bg-red-50 px-4 py-6 text-center text-sm text-red-500">
              未找到「{med.name}」的百度百科内容
            </div>
          )}

          {/* 用法用量（本地录入，与百科互补） */}
          <div className="rounded-2xl bg-cream-50 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-teal-700">
              <Clock className="h-4 w-4" /> 用法用量
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xs text-teal-600/60">剂量</div>
                <div className="mt-1 text-base font-bold text-teal-700">{med.usage.defaultDose}<span className="ml-0.5 text-xs font-normal text-teal-600/40">{med.usage.unit}</span></div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xs text-teal-600/60">频次</div>
                <div className="text-sm font-bold text-teal-700">{med.usage.frequency}</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xs text-teal-600/60">时间</div>
                <div className="text-sm font-bold text-teal-700">{med.usage.timing}</div>
              </div>
            </div>
          </div>

          {/* 快速记录 */}
          <button
            onClick={onQuickAdd}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white transition',
              saved ? 'bg-sage-400' : 'bg-sage-500 hover:bg-sage-600'
            )}
          >
            {saved ? <Check className="h-4 w-4" /> : <PillIcon className="h-4 w-4" />}
            {saved ? '已记录服药' : `记录服药 ${med.usage.defaultDose}${med.usage.unit}`}
          </button>
        </div>
      </motion.div>
    </>
  );
}
