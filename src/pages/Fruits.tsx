/**
 * 水果板块（重构版）
 *
 * 数据源：百度百科（检索 + 详情图文全量解析）
 * 流程：
 * 1. 顶部搜索框，输入关键词点搜索
 * 2. 先查本地库（customFruits + fruits）按 name 匹配
 * 3. 本地有 → 直接打开该水果详情页
 * 4. 本地没有 → 调 searchBaike 拿百度百科候选 → 弹出底部抽屉选择
 * 5. 选中 → 调 apihz.cn 营养API 取钾磷钠水 → 添加 → 打开详情
 * 6. 详情页：百度百科配图 + 摘要 + 信息框 + 结构化章节（形态特征/分布范围/主要价值等）
 *    + 每100g元素含量（钾磷钠水）+ 食用建议 + 记录摄入
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Droplet, FlaskConical, Beaker, Atom, ChevronRight, Info, WifiOff } from 'lucide-react';
import { useFruitsStore } from '@/store/useFruitsStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { LEVEL_TEXT, LEVEL_COLORS, formatWeightKg, getLevelFromPotassium } from '@/utils/calc';
import { cn } from '@/lib/utils';
import { fetchFoodNutrition, type FoodNutrition } from '@/lib/foodNutritionService';
import { searchBaike, lookupBuiltinBaike, type BaikeSearchItem } from '@/lib/baikeService';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useBaikeInfo } from '@/hooks/useBaikeInfo';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import SmartImage from '@/components/SmartImage';
import type { Fruit } from '@/types';

export default function Fruits() {
  // 注意：不能用 useFruitsStore((s) => s.allFruits())
  // 因为 allFruits() 每次返回新数组引用，会触发 Zustand 无限重渲染 → 白屏
  const customFruits = useFruitsStore((s) => s.customFruits);
  const builtinFruits = useFruitsStore((s) => s.fruits);
  const allFruits = [...customFruits, ...builtinFruits];
  const addFruit = useFruitsStore((s) => s.addFruit);
  const deleteFruit = useFruitsStore((s) => s.deleteFruit);
  const addFruitRecord = useRecordsStore((s) => s.addFruitRecord);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Fruit | null>(null);
  const [weight, setWeight] = useState('100');
  // 百度百科候选选择浮层（本地未命中时弹出）
  const [candidates, setCandidates] = useState<BaikeSearchItem[]>([]);

  // 候选浮层与详情浮层互斥，分别注册返回处理；useLockBodyScroll 用引用计数兼容叠加
  useOverlayBackHandler(!!selected, () => setSelected(null));
  useOverlayBackHandler(candidates.length > 0, () => setCandidates([]));
  useLockBodyScroll(!!selected || candidates.length > 0);

  const closeCandidateDrawer = useCallback(() => setCandidates([]), []);

  // 公共流程：获取营养数据 → 添加水果 → 打开详情页
  // 营养数据失败不阻塞：用 0 占位继续添加，详情页对全 0 营养会显示"暂无精确营养数据"提示
  const addFruitAndOpen = useCallback(
    async (title: string) => {
      setSearching(true);
      setError(null);
      try {
        // 尝试取营养数据（钾磷钠水）；失败时用 0 占位，不阻塞添加流程
        let nutrition: FoodNutrition | null = null;
        try {
          nutrition = await fetchFoodNutrition(title);
        } catch {
          nutrition = null;
        }
        const potassium = nutrition?.potassium ?? 0;
        const phosphorus = nutrition?.phosphorus ?? 0;
        const sodium = nutrition?.sodium ?? 0;
        const water = nutrition?.water ?? 0;

        addFruit({
          name: title,
          emoji: '🍇',
          potassiumPer100g: potassium,
          phosphorusPer100g: phosphorus,
          sodiumPer100g: sodium,
          waterPer100g: water,
          suggestion: '请根据医嘱适量食用',
        });

        // 找到刚添加的水果并打开详情
        const latest = useFruitsStore.getState().customFruits;
        const newFruit = [...latest].reverse().find((f) => f.name === title);
        if (newFruit) {
          setSelected(newFruit);
          setQuery('');
        }
      } catch {
        setError('添加失败，请重试');
      } finally {
        setSearching(false);
      }
    },
    [addFruit]
  );

  const handleSearch = useCallback(async () => {
    const keyword = query.trim();
    if (!keyword || searching) return;
    setSearching(true);
    setError(null);

    // 1. 先查本地水果列表（customFruits + fruits），按 name 精确匹配
    const state = useFruitsStore.getState();
    const local = [...state.customFruits, ...state.fruits].find(
      (f) => f.name === keyword
    );
    if (local) {
      // 本地有 → 直接打开详情
      setSelected(local);
      setQuery('');
      setSearching(false);
      return;
    }

    // 2. 查本地内置百科数据（baikeFruits.ts，30 种常见水果）
    //    命中则直接添加并打开详情，跳过候选浮层，不依赖 apihz.cn 营养数据是否可用
    const builtin = lookupBuiltinBaike(keyword);
    if (builtin && builtin.title) {
      setSearching(false);
      await addFruitAndOpen(builtin.title);
      return;
    }

    // 3. 本地都没有 → 联网检索百度百科候选
    try {
      const results = await searchBaike(keyword);
      if (results.length === 0) {
        setError('未找到相关水果，试试其他关键词');
        return;
      }
      setCandidates(results);
    } catch {
      setError('搜索失败，请重试');
    } finally {
      setSearching(false);
    }
  }, [query, searching, addFruitAndOpen]);

  const handleSelectCandidate = useCallback(
    async (item: BaikeSearchItem) => {
      if (searching) return;
      // 关闭候选浮层，进入添加流程（营养数据失败不阻塞）
      setCandidates([]);
      await addFruitAndOpen(item.title);
    },
    [searching, addFruitAndOpen]
  );

  // 按等级分组
  const grouped = {
    low: allFruits.filter((f) => f.level === 'low'),
    medium: allFruits.filter((f) => f.level === 'medium'),
    high: allFruits.filter((f) => f.level === 'high'),
  };

  const handleRecord = () => {
    if (!selected) return;
    const w = Number(weight) || 0;
    if (w <= 0) return;
    addFruitRecord({ fruit: selected, weight: w });
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索水果名称（如：苹果、香蕉）"
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

      {/* 水果列表 */}
      {(['low', 'medium', 'high'] as const).map((level) => {
        const fruits = grouped[level];
        if (fruits.length === 0) return null;
        return (
          <div key={level}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  LEVEL_COLORS[level].bg,
                  LEVEL_COLORS[level].text
                )}
              >
                {LEVEL_TEXT[level]}
              </span>
              <span className="text-xs text-teal-600/50">{fruits.length} 种</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fruits.map((fruit) => (
                <FruitCard
                  key={fruit.id}
                  fruit={fruit}
                  onClick={() => setSelected(fruit)}
                  onDelete={fruit.isCustom ? () => deleteFruit(fruit.id) : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* 详情弹层 */}
      <AnimatePresence>
        {selected && (
          <FruitDetail
            fruit={selected}
            weight={weight}
            setWeight={setWeight}
            onRecord={handleRecord}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* 维基候选选择浮层（本地未命中时弹出） */}
      <AnimatePresence>
        {candidates.length > 0 && (
          <>
            {/* 遮罩 */}
            <motion.div
              className="fixed inset-0 z-[100] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCandidateDrawer}
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
                <h3 className="text-base font-semibold text-teal-700">选择水果</h3>
                <button
                  onClick={closeCandidateDrawer}
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

/** 营养标签 */
function NutrientTag({ label, value, unit, icon }: { label: string; value: number; unit: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-cream-100 px-2 py-1 text-xs">
      {icon}
      <span className="text-teal-600/60">{label}</span>
      <span className="font-semibold text-teal-700">{value}</span>
      <span className="text-teal-600/40">{unit}</span>
    </span>
  );
}

/** 水果卡片 */
function FruitCard({
  fruit,
  onClick,
  onDelete,
}: {
  fruit: Fruit;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-cream-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm">
      <button onClick={onClick} className="flex flex-1 items-center gap-3 text-left">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-cream-50 text-2xl">
          {fruit.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-teal-700">{fruit.name}</h3>
            {fruit.isCustom && (
              <span className="rounded-full bg-sage-100 px-1.5 py-0.5 text-[9px] font-medium text-sage-600">
                自定义
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <NutrientTag label="钾" value={fruit.potassiumPer100g} unit="mg" />
            <NutrientTag label="磷" value={fruit.phosphorusPer100g} unit="mg" />
            <NutrientTag label="钠" value={fruit.sodiumPer100g} unit="mg" />
            <NutrientTag label="水" value={fruit.waterPer100g} unit="ml" />
          </div>
        </div>
      </button>
      <div className="flex flex-shrink-0 flex-col items-center gap-1">
        <span
          className={cn(
            'whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium',
            LEVEL_COLORS[fruit.level].bg,
            LEVEL_COLORS[fruit.level].text
          )}
        >
          {LEVEL_TEXT[fruit.level]}
        </span>
        {onDelete && (
          <button onClick={onDelete} className="text-[10px] text-red-400 hover:text-red-600">
            删除
          </button>
        )}
      </div>
    </div>
  );
}

/** 水果详情弹层 */
function FruitDetail({
  fruit,
  weight,
  setWeight,
  onRecord,
  onClose,
}: {
  fruit: Fruit;
  weight: string;
  setWeight: (v: string) => void;
  onRecord: () => void;
  onClose: () => void;
}) {
  const w = Number(weight) || 0;
  // 详情页图文全量来自百度百科（摘要 / 信息框 / 结构化章节 / 图集）
  const { info, loading } = useBaikeInfo(fruit.name);
  const isOnline = useOnlineStatus();

  // 信息框键值对（过滤过短/无效项）
  const infoboxEntries = info?.infobox
    ? Object.entries(info.infobox).filter(([, v]) => v && v.length > 1).slice(0, 10)
    : [];

  // 图集（主图 + 多图，去重）
  const allImages = (() => {
    const all = [
      ...(info?.image ? [info.image] : []),
      ...(info?.images || []),
    ].filter((v, i, a) => v && a.indexOf(v) === i);
    return all.slice(0, 6);
  })();

  // 章节段落（百度百科结构化正文）
  const sections = info?.sections ?? [];
  // 兜底正文：无结构化章节时，按 \n\n 拆分 content
  const contentParas = !sections.length && info?.content
    ? info.content.split('\n\n').filter((p) => p.trim())
    : [];

  // 营养数据是否可用（钾磷钠水全为 0 视为暂无精确数据，如 apihz.cn 失败时的占位）
  const hasNutrition =
    fruit.potassiumPer100g > 0 ||
    fruit.phosphorusPer100g > 0 ||
    fruit.sodiumPer100g > 0 ||
    fruit.waterPer100g > 0;

  return (
    <>
      {/* 遮罩 */}
      <motion.div
        className="fixed inset-0 z-[100] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* 底部抽屉 */}
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
            <span className="text-3xl">{fruit.emoji}</span>
            <div>
              <h3 className="text-lg font-semibold text-teal-700">{info?.title || fruit.name}</h3>
              <span
                className={cn(
                  'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                  LEVEL_COLORS[fruit.level].bg,
                  LEVEL_COLORS[fruit.level].text
                )}
              >
                {LEVEL_TEXT[fruit.level]}
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
          {/* 图集（主图 + 多图，横向滚动） */}
          {allImages.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, i) => (
                <SmartImage
                  key={i}
                  src={img}
                  alt={`${fruit.name} ${i + 1}`}
                  className="h-40 w-64 flex-shrink-0 rounded-2xl"
                />
              ))}
            </div>
          ) : loading ? (
            isOnline ? (
              <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-cream-100">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600/40" />
              </div>
            ) : (
              <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-amber-50 text-amber-600">
                <WifiOff className="h-5 w-5" />
                <span className="text-xs">无网络，无法获取图片</span>
              </div>
            )
          ) : null}

          {/* 百度百科摘要 */}
          {info?.summary && (
            <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-teal-700">
                <Info className="h-4 w-4" /> 词条简介
              </h4>
              <p className="text-sm leading-relaxed break-words text-teal-600/80">{info.summary}</p>
            </div>
          )}

          {/* 信息框（界/门/目/科/属/种等分类学条目） */}
          {infoboxEntries.length > 0 && (
            <div className="rounded-2xl border border-cream-200 p-4">
              <h4 className="mb-2 text-sm font-medium text-teal-700">基本信息</h4>
              <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {infoboxEntries.map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <dt className="flex-shrink-0 text-teal-600/60">{k}</dt>
                    <dd className="break-words text-teal-700">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* 百度百科完整章节段落（形态特征/分布范围/主要价值等） */}
          {sections.length > 0 && (
            <div className="rounded-2xl border border-cream-200 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-teal-700">
                <ChevronRight className="h-4 w-4" /> 详细内容
              </h4>
              <div className="space-y-3">
                {sections.map((section, i) => (
                  <div key={i}>
                    <h5 className="mb-1 text-sm font-medium text-teal-700/90">{section.title}</h5>
                    <div className="space-y-1.5">
                      {section.paragraphs.map((p, j) => (
                        <p key={j} className="text-sm leading-relaxed break-words text-teal-600/80">{p}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 兜底：无结构化章节时，按段落展示 content */}
          {sections.length === 0 && contentParas.length > 0 && (
            <div className="rounded-2xl border border-cream-200 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-teal-700">
                <Info className="h-4 w-4" /> 百度百科正文
              </h4>
              <div className="space-y-2">
                {contentParas.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed break-words text-teal-600/80">{p}</p>
                ))}
              </div>
            </div>
          )}

          {/* 加载中 / 无结果提示 */}
          {loading && !info && (
            isOnline ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-cream-50 py-8 text-sm text-teal-600/60">
                <Loader2 className="h-4 w-4 animate-spin" /> 正在从百度百科获取内容…
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-amber-50 py-8 text-sm text-amber-600">
                <WifiOff className="h-5 w-5" />
                <p>当前无网络，无法获取百科内容</p>
              </div>
            )
          )}
          {!loading && !info && (
            <div className="rounded-2xl bg-cream-50 px-4 py-6 text-center text-sm text-teal-600/50">
              暂无「{fruit.name}」的百度百科内容
            </div>
          )}

          {/* 核心：每100g元素含量（保留模块） */}
          <div className="rounded-2xl bg-cream-50 p-4">
            <h4 className="mb-3 text-sm font-medium text-teal-700">每 100g 元素含量</h4>
            {hasNutrition ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                  <Atom className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-xs text-teal-600/60">钾</div>
                    <div className="text-lg font-bold text-teal-700">{fruit.potassiumPer100g}<span className="ml-0.5 text-xs font-normal text-teal-600/40">mg</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                  <FlaskConical className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-xs text-teal-600/60">磷</div>
                    <div className="text-lg font-bold text-teal-700">{fruit.phosphorusPer100g}<span className="ml-0.5 text-xs font-normal text-teal-600/40">mg</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                  <Beaker className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-xs text-teal-600/60">钠</div>
                    <div className="text-lg font-bold text-teal-700">{fruit.sodiumPer100g}<span className="ml-0.5 text-xs font-normal text-teal-600/40">mg</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                  <Droplet className="h-5 w-5 text-cyan-500" />
                  <div>
                    <div className="text-xs text-teal-600/60">水分</div>
                    <div className="text-lg font-bold text-teal-700">{fruit.waterPer100g}<span className="ml-0.5 text-xs font-normal text-teal-600/40">ml</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white p-3 text-center text-xs text-teal-600/50">
                暂无精确营养数据，请参考百科内容中关于钾含量高低的描述，或咨询医生
              </div>
            )}
            <p className="mt-2 text-[10px] text-teal-600/30">数据来源：apihz.cn 食物营养API</p>
          </div>

          {/* 数据源标注 */}
          {(info?.summary || sections.length > 0 || contentParas.length > 0) && (
            <p className="px-1 text-[10px] text-teal-600/30">图文来源：百度百科</p>
          )}

          {/* 食用建议 */}
          <div className="rounded-2xl bg-sage-50 p-4">
            <h4 className="mb-1 text-sm font-medium text-sage-700">食用建议</h4>
            <p className="text-sm text-sage-600">{fruit.suggestion}</p>
          </div>

          {/* 快速记录 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-teal-700">记录摄入</h4>
            <div className="flex flex-wrap gap-2">
              {[100, 150, 200, 250].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setWeight(String(preset))}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                    weight === String(preset)
                      ? 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-cream-300 bg-white text-teal-600 hover:bg-cream-50'
                  )}
                >
                  {formatWeightKg(preset)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="输入克数 (g)"
                className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-teal-700 placeholder:text-teal-600/40 focus:border-teal-400 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && onRecord()}
              />
              <button
                onClick={onRecord}
                disabled={w <= 0}
                className="flex-shrink-0 rounded-xl bg-sage-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-sage-600 disabled:opacity-40"
              >
                记录
              </button>
            </div>
            {w > 0 && (
              <div className="rounded-xl bg-cream-50 px-4 py-2.5 text-xs text-teal-600">
                本次 {formatWeightKg(w)}：钾 <span className="font-semibold text-teal-700">{Math.round((fruit.potassiumPer100g * w) / 100)}</span> mg / 磷 <span className="font-semibold text-teal-700">{Math.round((fruit.phosphorusPer100g * w) / 100)}</span> mg / 钠 <span className="font-semibold text-teal-700">{Math.round((fruit.sodiumPer100g * w) / 100)}</span> mg / 水 <span className="font-semibold text-teal-700">{Math.round((fruit.waterPer100g * w) / 100)}</span> ml
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
