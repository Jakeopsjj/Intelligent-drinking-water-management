/**
 * 联网获取水果/药物的配图与介绍
 *
 * 数据源：
 * - 维基百科 REST API（摘要文本 + 缩略图）
 * - 维基共享资源搜索 API（按关键词搜索高质量真实配图）
 *
 * 图片获取策略：
 * - 水果：搜索 Commons "{name} fruit"，获取真实水果照片
 * - 药物：搜索 Commons "{name} medicine" / "{name} tablet"，获取药品/药盒照片
 * - Wikipedia 缩略图作为兜底
 *
 * 带内存缓存 + 并发去重，同一名称只请求一次。
 */

export type EntityKind = 'fruit' | 'medication';

export interface EntityInfo {
  /** 真实配图 URL */
  image?: string;
  /** 维基百科摘要（介绍） */
  description?: string;
}

const cache = new Map<string, EntityInfo>();
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

/** 常见药物中文名 → 英文名映射（提升 Commons 搜索精准度） */
const MED_NAME_MAP: Record<string, string> = {
  '碳酸钙': 'calcium carbonate tablet',
  '司维拉姆': 'sevelamer tablet',
  '碳酸镧': 'lanthanum carbonate tablet',
  '骨化三醇': 'calcitriol capsule',
  '碳酸氢钠': 'sodium bicarbonate tablet',
  '氨氯地平': 'amlodipine tablet',
  '缬沙坦': 'valsartan capsule',
  '重组人促红素': 'epoetin injection',
  '蔗糖铁': 'iron sucrose injection',
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
  // 策略 1：维基共享资源搜索高质量真实配图（优先，按类型优化搜索词）
  const commonsSearchTerm = kind === 'fruit'
    ? (FRUIT_NAME_MAP[name] ?? `${name} fruit`)
    : (MED_NAME_MAP[name] ?? `${name} medicine`);
  const commonsImage = await tryWikimediaCommons(commonsSearchTerm);
  if (commonsImage) {
    // 拿到图片后仍尝试获取介绍
    const desc = await tryWikipediaDescription(name, kind);
    return { image: commonsImage, description: desc };
  }

  // 策略 2：维基百科 REST summary（图片 + 摘要）
  const wikiInfo = await tryWikipediaSummary(name, kind);
  if (wikiInfo.image || wikiInfo.description) return wikiInfo;

  return {};
}

/** 维基百科 REST summary API —— 获取图片和摘要 */
async function tryWikipediaSummary(name: string, kind: EntityKind): Promise<EntityInfo> {
  // 水果优先用中文维基（中文"苹果"指向水果而非公司）
  // 药物优先用中文维基（药品条目中文较全）
  for (const lang of ['zh', 'en'] as const) {
    try {
      // 尝试消歧义标题：水果用"名称（水果）"，药物用"名称（药物）"
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
        // 跳过消歧义页
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

/** 维基共享资源搜索 API —— 按关键词搜索图片（CORS: origin=*） */
async function tryWikimediaCommons(searchTerm: string): Promise<string | undefined> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${searchTerm} filemime:image`,
      gsrnamespace: '6',
      gsrlimit: '3',
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
    if (!res.ok) return undefined;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return undefined;
    // 按搜索相关性排序，取第一张有效图片
    const sorted = Object.values(pages)
      .sort((a: any, b: any) => (a.index ?? 999) - (b.index ?? 999));
    for (const page of sorted) {
      const url: string | undefined = (page as any)?.imageinfo?.[0]?.thumburl;
      if (url) return url;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
