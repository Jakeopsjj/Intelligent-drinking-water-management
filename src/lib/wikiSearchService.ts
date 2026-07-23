/**
 * 维基百科搜索服务 —— 用于水果搜索
 *
 * 数据源：维基百科 API（支持 CORS，origin=*）
 * - searchWiki：使用 OpenSearch API 搜索词条
 * - fetchWikiDetail：使用 REST summary + parse API 获取详情
 *
 * 中文版优先，无结果时尝试英文版回退。
 * 带内存缓存 + 并发去重，同一关键词只请求一次。
 */

export interface WikiSearchResult {
  title: string;
  description: string;
  url: string;
}

export interface WikiSection {
  title: string;
  content: string;
}

export interface WikiDetail {
  title: string;
  summary: string;        // 摘要
  image?: string;          // 主图
  images?: string[];       // 多图
  sections?: WikiSection[]; // 正文段落
  // 水果相关字段
  origin?: string;         // 起源与分布
  varieties?: string;     // 品种
  cultivation?: string;    // 栽培
  culture?: string;        // 文化历史
  healthBenefits?: string; // 健康益处
  precautions?: string;    // 食用禁忌
  storage?: string;        // 保存方法
  // 每100g营养数据（从营养模板/表格中提取）
  potassiumPer100g?: number;  // 钾 mg
  phosphorusPer100g?: number; // 磷 mg
  sodiumPer100g?: number;     // 钠 mg
  waterPer100g?: number;      // 水分 g/ml
}

/** 搜索缓存 */
const searchCache = new Map<string, WikiSearchResult[]>();
const searchPending = new Map<string, Promise<WikiSearchResult[]>>();

/** 详情缓存（null 也缓存，避免重复请求失败的关键词） */
const detailCache = new Map<string, WikiDetail | null>();
const detailPending = new Map<string, Promise<WikiDetail | null>>();

/** 请求超时（毫秒） */
const TIMEOUT = 10000;

/** 支持的语言版本（中文优先，英文回退） */
const LANGS = ['zh', 'en'] as const;

/**
 * CORS 代理列表（轮换使用，避免单点失败）
 * 在 Capacitor WebView 中，跨域请求可能需要通过 CORS 代理
 */
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

/** 通过 CORS 代理发起请求，自动轮换代理 */
async function fetchWithCorsProxy(url: string, options?: RequestInit): Promise<Response | null> {
  // 先尝试直接请求（Wikipedia API 支持 CORS，可能直接成功）
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT) });
    if (res.ok) return res;
  } catch {
    // 直接请求失败，继续尝试代理
  }

  // 尝试 CORS 代理
  for (const proxy of CORS_PROXIES) {
    try {
      const proxiedUrl = proxy(url);
      const res = await fetch(proxiedUrl, { ...options, signal: AbortSignal.timeout(TIMEOUT) });
      if (res.ok) return res;
    } catch {
      // 继续尝试下一个代理
    }
  }
  return null;
}

/**
 * 搜索维基百科词条（OpenSearch API）。
 * 失败返回空数组，不抛异常。
 */
export function searchWiki(keyword: string): Promise<WikiSearchResult[]> {
  const key = keyword.trim().toLowerCase();
  if (!key) return Promise.resolve([]);

  const cached = searchCache.get(key);
  if (cached) return Promise.resolve(cached);

  const inflight = searchPending.get(key);
  if (inflight) return inflight;

  const p = doSearch(keyword.trim())
    .then((results) => {
      searchCache.set(key, results);
      searchPending.delete(key);
      return results;
    })
    .catch(() => {
      searchCache.set(key, []);
      searchPending.delete(key);
      return [];
    });

  searchPending.set(key, p);
  return p;
}

/**
 * 获取维基百科词条详情。
 * 使用 REST summary API 获取摘要和图片，使用 parse API 获取完整正文段落。
 * 中文版无结果时尝试英文版回退。失败/无结果返回 null。
 */
export function fetchWikiDetail(keyword: string): Promise<WikiDetail | null> {
  const key = keyword.trim().toLowerCase();
  if (!key) return Promise.resolve(null);

  const cached = detailCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  const inflight = detailPending.get(key);
  if (inflight) return inflight;

  const p = doFetchDetail(keyword.trim())
    .then((detail) => {
      detailCache.set(key, detail);
      detailPending.delete(key);
      return detail;
    })
    .catch(() => {
      detailCache.set(key, null);
      detailPending.delete(key);
      return null;
    });

  detailPending.set(key, p);
  return p;
}

/** 实际搜索逻辑：调用 OpenSearch API，中文优先 */
async function doSearch(keyword: string): Promise<WikiSearchResult[]> {
  for (const lang of LANGS) {
    try {
      const params = new URLSearchParams({
        action: 'opensearch',
        search: keyword,
        limit: '5',
        namespace: '0',
        format: 'json',
        origin: '*',
      });
      const res = await fetchWithCorsProxy(
        `https://${lang}.wikipedia.org/w/api.php?${params.toString()}`
      );
      if (!res) continue;
      const data = await res.json();
      // OpenSearch 返回格式：[keyword, [titles], [descriptions], [urls]]
      const titles: string[] = data?.[1] ?? [];
      const descriptions: string[] = data?.[2] ?? [];
      const urls: string[] = data?.[3] ?? [];
      const results: WikiSearchResult[] = titles.map((title, i) => ({
        title,
        description: descriptions[i] ?? '',
        url: urls[i] ?? '',
      }));
      if (results.length > 0) return results;
    } catch {
      // 继续尝试下一个语言
    }
  }
  return [];
}

/** 实际获取详情逻辑：REST summary + parse API，中文优先英文回退 */
async function doFetchDetail(keyword: string): Promise<WikiDetail | null> {
  for (const lang of LANGS) {
    try {
      const detail = await fetchDetailFromLang(lang, keyword);
      if (detail) return detail;
    } catch {
      // 继续尝试下一个语言
    }
  }
  return null;
}

/** 从指定语言版本获取详情 */
async function fetchDetailFromLang(lang: string, keyword: string): Promise<WikiDetail | null> {
  // 1. REST summary API —— 摘要 + 主图
  const encoded = encodeURIComponent(keyword);
  const summaryRes = await fetchWithCorsProxy(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}?redirect=true`,
    { headers: { Accept: 'application/json' } }
  );
  if (!summaryRes) return null;
  const summaryData = await summaryRes.json();
  // 消歧义页跳过
  if (summaryData.type === 'disambiguation') return null;

  const title: string = summaryData?.title ?? keyword;
  const summary: string = summaryData?.extract ?? '';
  const image: string | undefined = summaryData?.originalimage?.source || summaryData?.thumbnail?.source;

  if (!summary && !image) return null;

  // 2. parse API —— wikitext 正文段落
  let sections: WikiSection[] = [];
  let extraImages: string[] = [];
  let nutrition: Partial<WikiDetail> = {};
  const wikitext = await fetchWikitext(lang, title);
  if (wikitext) {
    sections = parseWikitext(wikitext);
    extraImages = extractWikitextImages(wikitext);
    nutrition = extractNutritionFromWikitext(wikitext);
  }

  // 水果相关结构化字段
  const structured = extractFruitFields(sections);

  const detail: WikiDetail = {
    title,
    summary,
    ...nutrition,
  };
  if (image) {
    detail.image = image;
    const allImgs = [image, ...extraImages.filter((u) => u !== image)];
    if (allImgs.length > 1) detail.images = allImgs.slice(0, 5);
  } else if (extraImages.length > 0) {
    detail.images = extraImages.slice(0, 5);
  }
  if (sections.length > 0) detail.sections = sections;
  Object.assign(detail, structured);

  return detail;
}

/** 调用 parse API 获取 wikitext 原文 */
async function fetchWikitext(lang: string, title: string): Promise<string | undefined> {
  try {
    const params = new URLSearchParams({
      action: 'parse',
      page: title,
      prop: 'wikitext',
      format: 'json',
      origin: '*',
    });
    const res = await fetchWithCorsProxy(
      `https://${lang}.wikipedia.org/w/api.php?${params.toString()}`
    );
    if (!res) return undefined;
    const data = await res.json();
    const wikitext: string | undefined = data?.parse?.wikitext?.['*'];
    return wikitext;
  } catch {
    return undefined;
  }
}

/**
 * 解析 wikitext，按 `== 标题 ==` 分割段落。
 * 过滤模板、表格、HTML 注释、引用等，保留纯文本。
 */
function parseWikitext(wikitext: string): WikiSection[] {
  const sections: WikiSection[] = [];
  const cleaned = cleanWikitext(wikitext);

  // 匹配二级标题 == 标题 ==（用负向断言排除三级及以上标题）
  const sectionRegex = /^==\s*([^=].*?)\s*==\s*$/gm;
  const positions: { title: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(cleaned)) !== null) {
    positions.push({ title: m[1].trim(), index: m.index + m[0].length });
  }

  // 标题之前的导言
  const lead = positions.length > 0 ? cleaned.slice(0, positions[0].index).trim() : cleaned.trim();
  if (lead) {
    sections.push({ title: '导言', content: lead });
  }

  for (let i = 0; i < positions.length; i++) {
    const { title, index } = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].index : cleaned.length;
    const block = cleaned.slice(index, end).trim();
    if (block) sections.push({ title, content: block });
  }

  return sections;
}

/** 清理 wikitext：移除模板、表格、注释、HTML 标签、引用、内部链接语法等 */
function cleanWikitext(text: string): string {
  let result = text
    // HTML 注释
    .replace(/<!--[\s\S]*?-->/g, '')
    // 表格 {| ... |}
    .replace(/\{\|[\s\S]*?\|\}/g, '')
    // 三级及以上标题（=== ... ===）—— 移除，避免干扰二级分段
    .replace(/^={3,}\s*.+?\s*={3,}\s*$/gm, '');

  // 模板 {{...}}（迭代处理嵌套）
  result = stripTemplates(result);

  return result
    // 图片/文件链接 [[File:...]]、[[Image:...]] → 移除（图片单独提取）
    .replace(/\[\[(?:File|Image|文件|图像|圖像):[^\]]*\]\]/gi, '')
    // 内部链接 [[目标|显示文字]] → 显示文字
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    // 外部链接 [http://... 显示文字] → 显示文字
    .replace(/\[https?:\/\/[^\s\]]*\s+([^\]]*)\]/g, '$1')
    .replace(/\[https?:\/\/[^\s\]]*\]/g, '')
    // 加粗/斜体 ''' '''、'' ''
    .replace(/'{2,}/g, '')
    // 引用 <ref>...</ref>
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    // HTML 标签
    .replace(/<[^>]+>/g, '')
    // 多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 迭代移除嵌套模板 {{...}} */
function stripTemplates(text: string): string {
  let prev: string;
  do {
    prev = text;
    text = text.replace(/\{\{[^{}]*\}\}/g, '');
  } while (text !== prev);
  return text;
}

/** 从 wikitext 中提取图片，转换为 commons Special:FilePath 直链 */
function extractWikitextImages(wikitext: string): string[] {
  const images: string[] = [];
  const seen = new Set<string>();
  // 匹配 [[File:xxx.jpg|thumb|描述]] 或 [[Image:xxx.png|...]]
  const imgRegex = /\[\[(?:File|Image|文件|图像|圖像):([^\]|]+)\|?[^\]]*\]\]/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(wikitext)) !== null && images.length < 8) {
    const filename = m[1].trim();
    if (!filename) continue;
    // Special:FilePath 会重定向到真实图片，可直接用于 <img>
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
    if (!seen.has(url)) {
      seen.add(url);
      images.push(url);
    }
  }
  return images;
}

/** 水果结构化字段（均为字符串值） */
type FruitStringField =
  | 'origin'
  | 'varieties'
  | 'cultivation'
  | 'culture'
  | 'healthBenefits'
  | 'precautions'
  | 'storage';

/** 水果结构化字段映射：维基段落标题 → 字段 */
const FRUIT_FIELD_PATTERNS: Array<{ field: FruitStringField; patterns: RegExp[] }> = [
  { field: 'origin', patterns: [/起源/, /分布/, /原产地/, /原产/, /产地/] },
  { field: 'varieties', patterns: [/品种/, /种类/, /主要品种/] },
  { field: 'cultivation', patterns: [/栽培/, /种植/, /生长/, /繁殖/] },
  { field: 'culture', patterns: [/文化/, /历史/, /传说/, /象征/] },
  { field: 'healthBenefits', patterns: [/健康/, /营养/, /功效/, /食疗/, /药用价值/] },
  { field: 'precautions', patterns: [/禁忌/, /食用禁忌/, /副作用/] },
  { field: 'storage', patterns: [/保存/, /储存/, /贮藏/, /储藏/] },
];

/** 从段落中提取水果结构化字段（按段落标题匹配） */
function extractFruitFields(sections: WikiSection[]): Partial<WikiDetail> {
  const result: Partial<WikiDetail> = {};
  const assigned = new Set<FruitStringField>();

  for (const section of sections) {
    if (assigned.size >= FRUIT_FIELD_PATTERNS.length) break;
    for (const { field, patterns } of FRUIT_FIELD_PATTERNS) {
      if (assigned.has(field)) continue;
      if (patterns.some((p) => p.test(section.title))) {
        result[field] = section.content;
        assigned.add(field);
        break;
      }
    }
  }

  return result;
}

/** 从维基百科 wikitext 中提取每100g营养数据（钾、磷、钠、水分） */
export function extractNutritionFromWikitext(wikitext: string): Partial<WikiDetail> {
  const nutrition: Partial<WikiDetail> = {};
  if (!wikitext) return nutrition;

  // 先定位到营养模板/营养段落（避免误匹配其他地方的字段）
  // 中文：{{Nutrition value、{{营养、{{营养成分；英文：{{Nutritional value、{{Nutrition value
  const nutritionStart = wikitext.search(
    /\{\{\s*(?:Nutrition value|Nutritional value|Nutritional value per 100\s*g|营养[^}]{0,20})/i
  );
  // 取营养模板后 4000 字符作为搜索范围（足够覆盖营养字段）
  const searchStart = nutritionStart >= 0 ? nutritionStart : 0;
  const searchEnd = nutritionStart >= 0 ? Math.min(wikitext.length, nutritionStart + 4000) : wikitext.length;
  const searchText = wikitext.slice(searchStart, searchEnd);

  // 提取钾 (potassium)：支持 | potassium_mg = 135、| 钾 = 135、|potassium=135 mg 等
  const extractMg = (patterns: RegExp[]): number | undefined => {
    for (const re of patterns) {
      const m = searchText.match(re);
      if (m) {
        // 提取第一个数字（可能带单位/空格/模板，取第一个数值）
        const numMatch = m[1].match(/([\d.]+)/);
        if (numMatch) {
          const val = parseFloat(numMatch[1]);
          if (!isNaN(val) && val > 0 && val < 10000) return Math.round(val);
        }
      }
    }
    return undefined;
  };

  // 钾：常见英文键 potassium_mg / potassium，中文键 钾
  nutrition.potassiumPer100g = extractMg([
    /\|\s*(?:potassium_mg|potassium|钾|k)\s*=\s*([^|}\n]+)/i,
  ]);

  // 磷：phosphorus_mg / phosphorus / 磷
  nutrition.phosphorusPer100g = extractMg([
    /\|\s*(?:phosphorus_mg|phosphorus|磷|p)\s*=\s*([^|}\n]+)/i,
  ]);

  // 钠：sodium_mg / sodium / 钠
  nutrition.sodiumPer100g = extractMg([
    /\|\s*(?:sodium_mg|sodium|钠|na)\s*=\s*([^|}\n]+)/i,
  ]);

  // 水分：water / 水分 / 水（值为百分比/克数，0-100）
  const wMatch = searchText.match(/\|\s*(?:water|水分|水)\s*=\s*([^|}\n]+)/i);
  if (wMatch) {
    const numMatch = wMatch[1].match(/([\d.]+)/);
    if (numMatch) {
      const val = parseFloat(numMatch[1]);
      if (!isNaN(val) && val > 0 && val < 100) nutrition.waterPer100g = Math.round(val);
    }
  }

  return nutrition;
}
