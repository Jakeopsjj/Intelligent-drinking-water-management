/**
 * 联网获取水果/药物的配图与介绍
 *
 * 数据源：维基百科 REST API + 维基共享资源搜索 API
 * - https://zh.wikipedia.org/api/rest_v1/page/summary/{title}
 *   返回 article thumbnail（真实配图）+ extract（介绍文本）
 * - https://commons.wikimedia.org/w/api.php （CORS: origin=*）
 *   按关键词搜索图片，作为维基百科未命中时的兜底
 *
 * 带内存缓存，同一名称只请求一次，避免重复网络开销。
 */

export interface EntityInfo {
  /** 真实配图 URL */
  image?: string;
  /** 维基百科摘要（介绍） */
  description?: string;
}

const cache = new Map<string, EntityInfo>();
const pending = new Map<string, Promise<EntityInfo>>();

/**
 * 按名称联网获取配图 + 介绍
 * @param name 水果/药物名称（中文或英文）
 */
export function fetchEntityInfo(name: string): Promise<EntityInfo> {
  const key = name.trim().toLowerCase();
  if (!key) return Promise.resolve({});

  // 命中缓存直接返回
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  // 已有进行中的请求，复用
  const inflight = pending.get(key);
  if (inflight) return inflight;

  const p = doFetch(name.trim()).then((info) => {
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

async function doFetch(name: string): Promise<EntityInfo> {
  // 策略 1：中文维基百科 REST summary
  const zhInfo = await tryWikipediaSummary(name, 'zh');
  if (zhInfo.image || zhInfo.description) return zhInfo;

  // 策略 2：英文维基百科（中文名可能无对应条目时）
  const enInfo = await tryWikipediaSummary(name, 'en');
  if (enInfo.image || enInfo.description) return enInfo;

  // 策略 3：维基共享资源图片搜索（仅图片）
  const commonsImage = await tryWikimediaCommons(name);
  if (commonsImage) return { image: commonsImage };

  return {};
}

/** 维基百科 REST summary API —— 同时获取图片和摘要 */
async function tryWikipediaSummary(name: string, lang: 'zh' | 'en'): Promise<EntityInfo> {
  try {
    const title = encodeURIComponent(name);
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}?redirect=true`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return {};
    const data = await res.json();
    // type 为 disambiguation/no-extract 时跳过
    if (data.type === 'disambiguation' || data.type === 'standard' && !data.extract) {
      // standard 且无 extract 也跳过，继续尝试其他策略
    }
    const image: string | undefined =
      data?.thumbnail?.source || data?.originalimage?.source;
    const description: string | undefined =
      data?.extract && data.extract.length > 20 ? data.extract : undefined;
    return { image, description };
  } catch {
    return {};
  }
}

/** 维基共享资源搜索 API —— 按关键词搜索图片（CORS: origin=*） */
async function tryWikimediaCommons(name: string): Promise<string | undefined> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${name} filemime:image`,
      gsrnamespace: '6',
      gsrlimit: '1',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '500',
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
    const first = Object.values(pages)[0] as any;
    const url: string | undefined = first?.imageinfo?.[0]?.thumburl;
    return url;
  } catch {
    return undefined;
  }
}
