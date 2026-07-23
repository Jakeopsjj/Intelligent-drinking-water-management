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

/** 完整词条的章节结构（按维基百科章节标题划分） */
export interface WikiSection {
  /** 章节标题（如「形态特性」「分布范围」「主要价值」） */
  title: string;
  /** 该章节下的段落文本列表（已去标签） */
  paragraphs: string[];
}

export interface EntityInfo {
  /** 真实配图 URL（主图/封面） */
  image?: string;
  /** 多张配图 URL（详情页图集） */
  images?: string[];
  /** 维基百科摘要（介绍）—— 兼容字段，保留前 200 字 */
  description?: string;
  /** 完整首段（lead section，无标题的引言） */
  lead?: string;
  /** 完整章节列表（详情页正文段落） */
  sections?: WikiSection[];
  /** 信息框键值对（如「界」「门」「目」「科」「属」「种」） */
  infobox?: Record<string, string>;
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
  '葡萄柚': 'grapefruit',
  '西柚': 'grapefruit',
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

  // 提取通用名（去掉剂型后缀），用于维基百科词条搜索
  // 如"硝苯地平控释片"→"硝苯地平"、"碳酸司维拉姆片"→"碳酸司维拉姆"
  const genericName = name
    .replace(/(控释片|缓释片|分散片|咀嚼片|肠溶片|泡腾片|注射液|注射剂|口服液|胶囊|片剂|片|丸|膏|颗粒|滴剂|喷雾|贴剂|凝胶|乳膏)$/, '')
    .replace(/^(盐酸|苯磺酸|富马酸|酒石酸|硫酸氢|醋酸|碳酸|枸橼酸|磷酸|马来酸)/, (m) => m);

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
    // 用剂型全称 + 通用名双重搜索，提升命中率
    searchPromises.push(tryWikimediaCommonsMulti(`${name} 药盒`, 2));
    searchPromises.push(tryWikimediaCommonsMulti(`${genericName} 药盒`, 2));
    searchPromises.push(tryWikimediaCommonsMulti(`${genericName} medicine`, 3));
    searchPromises.push(tryWikimediaCommonsMulti(`${genericName} tablet`, 3));
  }

  // 同时获取维基百科图片（用通用名搜索，维基词条通常是通用名）
  searchPromises.push(tryWikipediaImages(genericName || name, 'medication'));

  const results = await Promise.all(searchPromises);
  for (const urls of results) {
    for (const url of urls) {
      if (!allImages.includes(url)) allImages.push(url);
    }
  }

  // 获取介绍
  const desc = await tryWikipediaDescription(genericName || name, 'medication');

  if (allImages.length > 0) {
    return { image: allImages[0], images: allImages.slice(0, 5), description: desc };
  }

  // 兜底：维基百科 summary（用通用名）
  const wikiInfo = await tryWikipediaSummary(genericName || name, 'medication');
  if (wikiInfo.image || wikiInfo.description) {
    return {
      image: wikiInfo.image,
      images: wikiInfo.image ? [wikiInfo.image] : undefined,
      description: wikiInfo.description,
    };
  }

  return {};
}

/** 水果：获取完整词条（信息框 + 章节段落 + 图集） */
async function doFetchFruit(name: string): Promise<EntityInfo> {
  // 1. 并发：维基百科完整词条 + Commons 真实配图
  const [fullPage, commonsImage] = await Promise.all([
    fetchWikiFullPage(name),
    tryWikimediaCommons(FRUIT_NAME_MAP[name] ?? `${name} fruit`),
  ]);

  // 2. 兜底：完整词条失败时再走 summary API
  if (!fullPage) {
    const summary = await tryWikipediaSummary(name, 'fruit');
    if (!summary.image && commonsImage) summary.image = commonsImage;
    if (!summary.images && commonsImage) summary.images = [commonsImage];
    return summary;
  }

  // 3. 合并图片：维基图片优先，Commons 补充
  const allImages: string[] = [];
  const seen = new Set<string>();
  const pushImg = (u?: string) => {
    if (u && !seen.has(u)) {
      seen.add(u);
      allImages.push(u);
    }
  };
  pushImg(commonsImage);
  if (fullPage.images) fullPage.images.forEach(pushImg);

  return {
    image: fullPage.images?.[0] || commonsImage,
    images: allImages.slice(0, 6),
    description: fullPage.lead?.slice(0, 200),
    lead: fullPage.lead,
    sections: fullPage.sections,
    infobox: fullPage.infobox,
  };
}

/**
 * 维基百科完整词条解析（action=parse API）
 *
 * 流程：
 * - 尝试多个标题变体：name → name（水果） → name（植物） → name（食品）
 * - 调用 parse API 拿到完整 HTML 片段
 * - DOMParser 解析：infobox / 首段 lead / 章节段落 / 图集
 *
 * 返回 null 表示所有标题变体都失败。
 */
async function fetchWikiFullPage(name: string): Promise<{
  lead?: string;
  sections?: WikiSection[];
  images?: string[];
  infobox?: Record<string, string>;
} | null> {
  // 标题变体：苹果 → 苹果 → 苹果（水果） → 苹果（植物） → 苹果（食品）
  const titles = [name, `${name}（水果）`, `${name}（植物）`, `${name}（食品）`];
  for (const title of titles) {
    try {
      const params = new URLSearchParams({
        action: 'parse',
        page: title,
        prop: 'text|images|properties',
        format: 'json',
        origin: '*',
        redirects: '1',
        disablelimitreport: '1',
      });
      const res = await fetch(
        `https://zh.wikipedia.org/w/api.php?${params.toString()}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      // 消歧义页 / 不存在
      if (data?.error) continue;
      const page = data?.parse;
      if (!page) continue;

      const html: string = page.text?.['*'] || '';
      if (!html) continue;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const root = doc.querySelector('.mw-parser-output') || doc.body;

      // 信息框
      const infobox = parseWikiInfobox(root);

      // 首段 lead（无标题的引言 p）
      const lead = parseWikiLead(root);

      // 章节段落
      const sections = parseWikiSections(root);

      // 图集
      const images = parseWikiImages(root);

      if (!lead && sections.length === 0 && (!images || images.length === 0)) {
        continue;
      }

      return { lead, sections, images, infobox };
    } catch {
      // 继续尝试下一个标题
    }
  }
  return null;
}

/** 解析维基百科信息框（infobox biota / infobox food 等） */
function parseWikiInfobox(root: Element): Record<string, string> | undefined {
  const table = root.querySelector('table.infobox, table.biota, table.wikitable.infobox');
  if (!table) return undefined;
  const result: Record<string, string> = {};
  const rows = table.querySelectorAll('tr');
  for (const tr of rows) {
    const th = tr.querySelector('th');
    const td = tr.querySelector('td');
    if (th && td) {
      // 移除 sup/sub/cite 等附加信息
      tr.querySelectorAll('sup, .reference, .noprint').forEach((n) => n.remove());
      const k = (th.textContent || '').replace(/\u00a0/g, ' ').trim();
      const v = (td.textContent || '').replace(/\u00a0/g, ' ').trim();
      if (k && v && k.length < 20 && v.length < 100 && !k.includes('\n')) {
        result[k] = v;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** 解析首段 lead：mw-parser-output 下第一个非空 <p>（排除坐标/消歧义等元信息） */
function parseWikiLead(root: Element): string | undefined {
  const paras = root.querySelectorAll('p');
  for (const p of paras) {
    p.querySelectorAll('sup, .reference, .noprint, .mw-empty-elt, style').forEach((n) => n.remove());
    const text = (p.textContent || '').replace(/\u00a0/g, ' ').trim();
    // 过滤空段、坐标段、消歧义段
    if (text && text.length > 20 && !text.startsWith('坐标') && !text.includes('消歧义')) {
      return text;
    }
  }
  return undefined;
}

/** 解析章节段落：按 H2/H3 标题划分 */
function parseWikiSections(root: Element): WikiSection[] {
  const sections: WikiSection[] = [];
  let current: WikiSection | null = null;

  for (const node of Array.from(root.children)) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'h2' || tag === 'h3') {
      const headline = node.querySelector('.mw-headline');
      const title = (headline?.textContent || node.textContent || '').trim();
      // 跳过「参考文献」「外部链接」「参见」等
      if (title && !/参考文献|外部链接|参见|注释|扩展阅读/.test(title)) {
        current = { title, paragraphs: [] };
        sections.push(current);
      } else {
        current = null;
      }
    } else if (tag === 'p' && current) {
      node.querySelectorAll('sup, .reference, .noprint, .mw-empty-elt, style').forEach((n) => n.remove());
      const text = (node.textContent || '').replace(/\u00a0/g, ' ').trim();
      if (text && text.length > 10) {
        current.paragraphs.push(text);
      }
    }
  }
  // 过滤空章节
  return sections.filter((s) => s.paragraphs.length > 0);
}

/** 解析图集：thumb 图 + 直接 img */
function parseWikiImages(root: Element): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  // 1. 缩略图（图说图）
  const thumbs = root.querySelectorAll('.thumb img, figure img, .thumbimage');
  for (const img of thumbs) {
    if (urls.length >= 6) break;
    const src =
      img.getAttribute('data-src') ||
      img.getAttribute('src') ||
      '';
    if (!src) continue;
    // 跳过 icon / svg / placeholder
    if (/icon|logo|svg|OOjs|placeholder|Edit-clear/i.test(src)) continue;
    const url = src.startsWith('//') ? `https:${src}` : src;
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  // 2. 兜底：所有 img
  if (urls.length === 0) {
    const imgs = root.querySelectorAll('img');
    for (const img of imgs) {
      if (urls.length >= 6) break;
      const src = img.getAttribute('src') || '';
      if (!src || /icon|logo|svg|OOjs|Edit-clear|\/static\//i.test(src)) continue;
      const url = src.startsWith('//') ? `https:${src}` : src;
      if (!seen.has(url) && (src.includes('upload.wikimedia') || src.includes('/thumb/'))) {
        seen.add(url);
        urls.push(url);
      }
    }
  }
  return urls;
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
  // 注意：不再附加 ' fruit 植物' 等后缀。
  // 原因：中文维基百科 search API 对中英混合搜索词命中率极差，
  // 比如搜「苹果 fruit 植物」会返回稀疏结果甚至空，导致正常品类检索为空。
  // 改为只搜关键词本身，命中所有相关词条，由用户从候选列表选择。
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: keyword,
    format: 'json',
    origin: '*',
    srlimit: '12',
    srprop: 'snippet|sectiontitle',
    srinfo: 'totalhits',
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

  // 过滤消歧义页 + 帮助页 + 用户页
  return results
    .filter(
      (r) =>
        r.title &&
        !r.title.includes('消歧义') &&
        !r.title.startsWith('Help:') &&
        !r.title.startsWith('Wikipedia:') &&
        !r.title.startsWith('User:')
    )
    .map((r) => ({
      title: r.title,
      description: r.snippet ? stripHtml(r.snippet) : undefined,
    }));
}
