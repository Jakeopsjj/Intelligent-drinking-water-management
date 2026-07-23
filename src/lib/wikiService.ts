/**
 * 联网获取水果/药物的配图与介绍
 *
 * 数据源：
 * - 维基百科 REST API（摘要文本 + 缩略图）
 * - 维基共享资源搜索 API（按关键词搜索高质量真实配图）
 *
 * 图片获取策略：
 * - 水果：搜索 Commons "{name} fruit"，获取真实水果照片
 * - 药物：搜索 Commons 多组关键词获取多张药盒图片（中文封面优先）
 * - Wikipedia 缩略图作为兜底
 *
 * 带持久化缓存 + 并发去重，同一名称只请求一次。
 */

import { PersistentCache } from './persistentCache';

export type EntityKind = 'fruit' | 'medication';

export interface EntityInfo {
  /** 真实配图 URL（主图/封面） */
  image?: string;
  /** 多张配图 URL（药物详情页展示多张药盒图） */
  images?: string[];
  /** 维基百科摘要（介绍） */
  description?: string;
}

const cache = new PersistentCache<EntityInfo>({ prefix: 'wiki_cache_', maxEntries: 80 });
const pending = new Map<string, Promise<EntityInfo>>();

/** 常见水果中文名 → 英文名映射（提升 Commons 搜索精准度） */
const FRUIT_NAME_MAP: Record<string, string> = {
  '苹果': 'apple fruit',
  '梨': 'pear fruit',
  '香蕉': 'banana',
  '橙子': 'orange fruit',
  '西瓜': 'watermelon',
  '葡萄': 'grapes fruit',
  '芒果': 'mango fruit',
  '桃子': 'peach fruit',
  '草莓': 'strawberry',
  '猕猴桃': 'kiwi fruit',
  '樱桃': 'cherry fruit',
  '菠萝': 'pineapple fruit',
  '木瓜': 'papaya fruit',
  '柠檬': 'lemon fruit',
  '石榴': 'pomegranate fruit',
  '火龙果': 'dragon fruit',
  '李子': 'plum fruit',
  '杏子': 'apricot fruit',
  '椰子': 'coconut',
  '牛油果': 'avocado',
  '榴莲': 'durian',
  '柿子': 'persimmon fruit',
  '哈密瓜': 'honeydew melon',
  '蓝莓': 'blueberry',
};

/** 药物中文名 → 多组搜索词（获取不同国家/语言版本的药盒图） */
const MED_SEARCH_TERMS: Record<string, { cn: string[]; en: string[] }> = {
  '碳酸钙': {
    cn: ['碳酸钙片 药盒', '碳酸钙咀嚼片 包装'],
    en: ['calcium carbonate tablet box', 'calcium carbonate 1500mg packaging'],
  },
  '司维拉姆': {
    cn: ['司维拉姆 药盒', '司维拉姆碳酸 盐片剂'],
    en: ['sevelamer carbonate tablet', 'sevelamer 800mg renvela'],
  },
  '碳酸镧': {
    cn: ['碳酸镧 药盒', '碳酸镧咀嚼片'],
    en: ['lanthanum carbonate tablet', 'fosrenol lanthanum'],
  },
  '骨化三醇': {
    cn: ['骨化三醇胶囊 药盒', '骨化三醇胶丸'],
    en: ['calcitriol capsule', 'calcitriol 0.25 rocaltriol'],
  },
  '碳酸氢钠': {
    cn: ['碳酸氢钠片 药盒', '碳酸氢钠片剂 包装'],
    en: ['sodium bicarbonate tablet', 'sodium bicarbonate 500mg'],
  },
  '氨氯地平': {
    cn: ['氨氯地平片 药盒', '苯磺酸氨氯地平片 包装'],
    en: ['amlodipine tablet box', 'amlodipine besylate 5mg norvasc'],
  },
  '缬沙坦': {
    cn: ['缬沙坦胶囊 药盒', '缬沙坦胶囊剂 包装'],
    en: ['valsartan capsule', 'valsartan 80mg diovan'],
  },
  '重组人促红素': {
    cn: ['重组人促红素 注射液', '促红素 注射'],
    en: ['epoetin injection', 'erythropoietin injection vial'],
  },
  '蔗糖铁': {
    cn: ['蔗糖铁 注射液', '蔗糖铁注射液'],
    en: ['iron sucrose injection', 'iron sucrose 100mg vial'],
  },
};

/**
 * 按名称联网获取配图 + 介绍
 * @param name 水果/药物名称（中文）
 * @param kind 类型，影响搜索策略
 */
export function fetchEntityInfo(name: string, kind: EntityKind = 'fruit'): Promise<EntityInfo> {
  const key = `${kind}:${name.trim().toLowerCase()}`;
  if (!name.trim()) return Promise.resolve({});

  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const inflight = pending.get(key);
  if (inflight) return inflight;

  const p = doFetch(name.trim(), kind).then((info) => {
    cache.set(key, info);
    pending.delete(key);
    return info;
  }).catch(() => {
    cache.set(key, {});
    pending.delete(key);
    return {};
  });

  pending.set(key, p);
  return p;
}

async function doFetch(name: string, kind: EntityKind): Promise<EntityInfo> {
  if (kind === 'medication') {
    return doFetchMedication(name);
  }
  return doFetchFruit(name);
}

/** 药物：获取多张药盒图片（中文优先作为封面）+ 介绍 */
async function doFetchMedication(name: string): Promise<EntityInfo> {
  const terms = MED_SEARCH_TERMS[name];
  const allImages: string[] = [];

  // 并发搜索中文和外文图片
  const searchPromises: Promise<string[]>[] = [];
  if (terms) {
    for (const cn of terms.cn) {
      searchPromises.push(tryWikimediaCommonsMulti(cn, 2));
    }
    for (const en of terms.en) {
      searchPromises.push(tryWikimediaCommonsMulti(en, 2));
    }
  } else {
    searchPromises.push(tryWikimediaCommonsMulti(`${name} 药盒`, 2));
    searchPromises.push(tryWikimediaCommonsMulti(`${name} medicine`, 3));
  }

  // 同时获取维基百科图片
  searchPromises.push(tryWikipediaImages(name, 'medication'));

  const results = await Promise.all(searchPromises);
  for (const urls of results) {
    for (const url of urls) {
      if (!allImages.includes(url)) allImages.push(url);
    }
  }

  // 获取介绍
  const desc = await tryWikipediaDescription(name, 'medication');

  if (allImages.length > 0) {
    return { image: allImages[0], images: allImages.slice(0, 5), description: desc };
  }

  // 兜底：维基百科 summary
  const wikiInfo = await tryWikipediaSummary(name, 'medication');
  if (wikiInfo.image || wikiInfo.description) {
    return {
      image: wikiInfo.image,
      images: wikiInfo.image ? [wikiInfo.image] : undefined,
      description: wikiInfo.description,
    };
  }

  return {};
}

/** 水果：获取配图 + 介绍 */
async function doFetchFruit(name: string): Promise<EntityInfo> {
  const commonsSearchTerm = FRUIT_NAME_MAP[name] ?? `${name} fruit`;
  const commonsImage = await tryWikimediaCommons(commonsSearchTerm);
  if (commonsImage) {
    const desc = await tryWikipediaDescription(name, 'fruit');
    return { image: commonsImage, description: desc };
  }

  const wikiInfo = await tryWikipediaSummary(name, 'fruit');
  if (wikiInfo.image || wikiInfo.description) return wikiInfo;

  return {};
}

/** 维基百科 REST summary API —— 获取图片和摘要 */
async function tryWikipediaSummary(name: string, kind: EntityKind): Promise<EntityInfo> {
  for (const lang of ['zh', 'en'] as const) {
    try {
      const titles = kind === 'fruit'
        ? [name, `${name}（水果）`]
        : [name, `${name}（药物）`];
      for (const title of titles) {
        const encoded = encodeURIComponent(title);
        const res = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}?redirect=true`,
          { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data.type === 'disambiguation') continue;
        const image: string | undefined = data?.thumbnail?.source || data?.originalimage?.source;
        const description: string | undefined =
          data?.extract && data.extract.length > 20 ? data.extract : undefined;
        if (image || description) return { image, description };
      }
    } catch {
      // 继续尝试下一个语言
    }
  }
  return {};
}

/** 仅获取介绍文本（图片已从 Commons 拿到时使用） */
async function tryWikipediaDescription(name: string, kind: EntityKind): Promise<string | undefined> {
  const info = await tryWikipediaSummary(name, kind);
  return info.description;
}

/** 从维基百科多个语言版本获取图片（用于药物多图） */
async function tryWikipediaImages(name: string, kind: EntityKind): Promise<string[]> {
  const images: string[] = [];
  const seen = new Set<string>();

  // 尝试消歧义标题
  const titles = kind === 'medication'
    ? [name, `${name}（药物）`, `${name}（药品）`]
    : [name, `${name}（水果）`];

  for (const lang of ['zh', 'en', 'ja', 'de'] as const) {
    for (const title of titles) {
      if (images.length >= 4) break;
      try {
        const encoded = encodeURIComponent(title);
        const res = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}?redirect=true`,
          { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) }
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data.type === 'disambiguation') continue;
        const img: string | undefined = data?.originalimage?.source || data?.thumbnail?.source;
        if (img && !seen.has(img)) {
          seen.add(img);
          images.push(img);
        }
      } catch {
        // 继续
      }
    }
    if (images.length >= 4) break;
  }

  return images;
}

/** 维基共享资源搜索 API —— 按关键词搜索单张图片 */
async function tryWikimediaCommons(searchTerm: string): Promise<string | undefined> {
  const urls = await tryWikimediaCommonsMulti(searchTerm, 1);
  return urls[0];
}

/** 维基共享资源搜索 API —— 按关键词搜索多张图片 */
async function tryWikimediaCommonsMulti(searchTerm: string, limit: number): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${searchTerm} filemime:image`,
      gsrnamespace: '6',
      gsrlimit: String(Math.min(limit + 2, 6)),
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
      iiurlwidth: '600',
      format: 'json',
      origin: '*',
    });
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return [];
    const sorted = Object.values(pages)
      .sort((a: any, b: any) => (a.index ?? 999) - (b.index ?? 999));
    const results: string[] = [];
    const seen = new Set<string>();
    for (const page of sorted) {
      const url: string | undefined = (page as any)?.imageinfo?.[0]?.thumburl;
      if (url && !seen.has(url)) {
        seen.add(url);
        results.push(url);
        if (results.length >= limit) break;
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * 维基百科搜索候选项（用于水果搜索流程）
 *
 * 调用维基百科 search API，返回 title + snippet（去标签后作为 description）。
 * 缩略图不在搜索阶段获取，用户选中后再通过 fetchEntityInfo 取，避免并发太慢。
 *
 * 缓存 + 并发去重，模式同 fetchEntityInfo；过滤消歧义页；超时 10s，失败返回 []。
 */
export interface WikiSearchItem {
  title: string;        // 词条标题
  description?: string; // 简短描述（snippet 去标签）
  image?: string;       // 缩略图（搜索阶段不获取，保留字段）
}

const searchCache = new PersistentCache<WikiSearchItem[]>({ prefix: 'wiki_search_cache_', maxEntries: 50 });
const searchPending = new Map<string, Promise<WikiSearchItem[]>>();

/** 去除 snippet 中的 HTML 标签，得到纯文本描述 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export function searchWikiFruits(keyword: string): Promise<WikiSearchItem[]> {
  const key = keyword.trim().toLowerCase();
  if (!key) return Promise.resolve([]);

  const cached = searchCache.get(key);
  if (cached) return Promise.resolve(cached);

  const inflight = searchPending.get(key);
  if (inflight) return inflight;

  const p = doSearchWikiFruits(keyword.trim()).then((items) => {
    searchCache.set(key, items);
    searchPending.delete(key);
    return items;
  }).catch(() => {
    searchCache.set(key, []);
    searchPending.delete(key);
    return [];
  });

  searchPending.set(key, p);
  return p;
}

async function doSearchWikiFruits(keyword: string): Promise<WikiSearchItem[]> {
  // 追加 ' fruit 植物' 提升水果/植物精准度，但保留 keyword 主体
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `${keyword} fruit 植物`,
    format: 'json',
    origin: '*',
    srlimit: '8',
  });
  const res = await fetch(
    `https://zh.wikipedia.org/w/api.php?${params.toString()}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const results = data?.query?.search as
    | Array<{ title: string; snippet?: string }>
    | undefined;
  if (!Array.isArray(results)) return [];

  // 过滤消歧义页
  return results
    .filter((r) => r.title && !r.title.includes('消歧义'))
    .map((r) => ({
      title: r.title,
      description: r.snippet ? stripHtml(r.snippet) : undefined,
    }));
}
