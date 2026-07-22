/**
 * 百度百科抓取服务 —— 用于药物搜索
 *
 * 数据源：百度百科移动版页面（force=mobile，结构更简单）
 * - searchBaike：搜索词条列表（解析搜索结果页）
 * - fetchBaikeDetail：解析词条详情（标题、摘要、正文、图片、药物结构化字段）
 *
 * 注意：
 * - 百度百科有反爬机制，请求可能失败/404，失败时返回 null 或空数组，
 *   调用方应回退到维基百科（见 wikiSearchService.ts / wikiService.ts）。
 * - CORS 需在 Capacitor 配置中允许跨域请求（server.allowNavigation 或原生 HTTP 插件）。
 * - User-Agent 在浏览器 fetch 中会被忽略，保留以便配合原生 HTTP 插件使用。
 *
 * 带内存缓存 + 并发去重，同一关键词只请求一次。
 */

export interface BaikeSearchResult {
  title: string;
  url: string;
  summary: string;
}

export interface BaikeSection {
  title: string;
  content: string;
}

export interface BaikeDetail {
  title: string;
  summary: string;
  description?: string;       // 简介
  image?: string;            // 主图 URL
  images?: string[];         // 多图
  sections?: BaikeSection[]; // 正文段落
  // 药物结构化字段
  indications?: string;       // 适应症
  pharmacokinetics?: string;  // 药代动力学
  contraindications?: string; // 禁忌症
  sideEffects?: string;       // 不良反应
  warnings?: string;          // 注意事项
  useInPregnancy?: string;    // 孕妇用药
  useInChildren?: string;     // 儿童用药
  useInElderly?: string;     // 老年用药
  drugInteractions?: string; // 药物相互作用
  storage?: string;          // 贮藏
  overdose?: string;         // 药物过量
}

/** 搜索结果缓存 */
const searchCache = new Map<string, BaikeSearchResult[]>();
const searchPending = new Map<string, Promise<BaikeSearchResult[]>>();

/** 详情缓存（null 也缓存，避免重复请求失败的词条） */
const detailCache = new Map<string, BaikeDetail | null>();
const detailPending = new Map<string, Promise<BaikeDetail | null>>();

/** 移动端 User-Agent（更易拿到移动版页面） */
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';

/** 请求超时（毫秒） */
const TIMEOUT = 10000;

/**
 * CORS 代理列表（轮换使用，避免单点失败）
 * 在 Capacitor WebView 中，跨域请求需要通过 CORS 代理
 */
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

/** 通过 CORS 代理发起请求，自动轮换代理 */
async function fetchWithCorsProxy(url: string, options?: RequestInit): Promise<Response | null> {
  // 先尝试直接请求（在某些环境下可能允许跨域）
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
 * 搜索百度百科，返回匹配的词条列表。
 * 失败返回空数组，不抛异常。
 */
export function searchBaike(keyword: string): Promise<BaikeSearchResult[]> {
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
 * 获取百度百科词条详情。
 * 解析标题、摘要、正文段落、图片、药物结构化字段。
 * 失败/反爬/404 返回 null。
 */
export function fetchBaikeDetail(keyword: string): Promise<BaikeDetail | null> {
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

/** 实际搜索逻辑：解析搜索结果页 */
async function doSearch(keyword: string): Promise<BaikeSearchResult[]> {
  const searchUrl = `https://baike.baidu.com/search?word=${encodeURIComponent(keyword)}&pn=0&rn=10`;
  const res = await fetchWithCorsProxy(searchUrl, {
    headers: {
      'User-Agent': MOBILE_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  });
  if (!res) return [];
  const html = await res.text();
  return parseSearchResults(html);
}

/** 解析搜索结果页 HTML，提取词条列表 */
function parseSearchResults(html: string): BaikeSearchResult[] {
  const results: BaikeSearchResult[] = [];
  const seen = new Set<string>();

  // 搜索结果项：<a href="/item/xxx">标题</a> + 摘要文本
  const itemRegex = /<a[^>]+href="(\/item\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(html)) && results.length < 10) {
    const url = match[1];
    const title = decodeHtml(stripTags(match[2])).trim();
    if (!title || seen.has(url)) continue;
    seen.add(url);

    // 尝试提取该结果项后的摘要文本（下一个 .result-summary 或 snippet）
    const after = html.slice(match.index + match[0].length, match.index + match[0].length + 600);
    const summaryMatch = /class="[^"]*(?:result-summary|snippet|abstract|content)[^"]*"[^>]*>([\s\S]*?)</.exec(after);
    const summary = summaryMatch ? decodeHtml(stripTags(summaryMatch[1])).trim() : '';

    results.push({ title, url: `https://baike.baidu.com${url}`, summary });
  }

  return results;
}

/** 实际抓取详情逻辑 */
async function doFetchDetail(keyword: string): Promise<BaikeDetail | null> {
  // 移动版页面结构更简单，便于解析
  const itemUrl = `https://baike.baidu.com/item/${encodeURIComponent(keyword)}?force=mobile`;
  const res = await fetchWithCorsProxy(itemUrl, {
    headers: {
      'User-Agent': MOBILE_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  });
  if (!res) return null;
  const html = await res.text();
  return parseDetail(html, keyword);
}

/** 解析词条详情 HTML */
function parseDetail(html: string, keyword: string): BaikeDetail | null {
  // 标题：<title> 标签或 .lemmaWgt-promotion-title
  const titleFromPage =
    extractFirstMatch(html, /<title>([^<|]+)/) ||
    extractFirstMatch(html, /class="lemmaWgt-promotion-title"[^>]*>\s*<h\d[^>]*>([\s\S]*?)<\/h\d>/);
  const title = titleFromPage ? decodeHtml(stripTags(titleFromPage)).trim() : keyword;

  // 摘要：lemma-summary 或第一段 .para
  const summaryHtml =
    extractFirstMatch(html, /<div[^>]*class="[^"]*lemma-summary[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
    extractFirstMatch(html, /<div[^>]*class="[^"]*summary[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
    '';
  let summary = decodeHtml(stripTags(summaryHtml)).trim();
  if (!summary) {
    const firstPara = extractFirstMatch(html, /<div[^>]*class="[^"]*para[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    summary = decodeHtml(stripTags(firstPara)).trim();
  }

  // 简介 description：meta description
  const metaDesc = extractFirstMatch(html, /<meta[^>]+name="description"[^>]+content="([^"]+)"/);
  const description = metaDesc ? decodeHtml(metaDesc) : undefined;

  // 图片
  const images = extractImages(html);

  // 正文段落
  const sections = extractSections(html);

  // 药物结构化字段
  const structured = extractDrugFields(sections);

  // 至少要有摘要/图片/段落，否则视为无效页面
  if (!summary && images.length === 0 && sections.length === 0) {
    return null;
  }

  const detail: BaikeDetail = {
    title,
    summary: summary || '',
  };
  if (description) detail.description = description;
  if (images[0]) detail.image = images[0];
  if (images.length > 1) detail.images = images.slice(0, 5);
  if (sections.length > 0) detail.sections = sections;
  Object.assign(detail, structured);

  return detail;
}

/** 提取所有图片 URL */
function extractImages(html: string): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  // 主图：summary-img / main-img / J-img 容器中的第一个 img
  const mainImgRegexes = [
    /<div[^>]*class="[^"]*(?:summary-img|main-img|J-img|lemma-img)[^"]*"[^>]*>[\s\S]*?<img[^>]+(?:data-src|src)=["']([^"']+)["']/,
    /<img[^>]+class="[^"]*(?:summary-img|main-img|J-img)[^"]*"[^>]+(?:data-src|src)=["']([^"']+)["']/,
  ];
  for (const re of mainImgRegexes) {
    const m = re.exec(html);
    if (m) {
      const url = normalizeImgUrl(m[1]);
      if (!seen.has(url)) {
        seen.add(url);
        images.push(url);
      }
    }
  }

  // 其他图片：百度图床域名
  const imgRegex = /<img[^>]+(?:data-src|src)=["'](https?:\/\/[^"']+(?:bdimg|baidu|bcebos|hiphotos)[^"']*\.(?:jpg|jpeg|png|webp))["']/g;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) && images.length < 8) {
    const url = normalizeImgUrl(match[1]);
    if (!seen.has(url)) {
      seen.add(url);
      images.push(url);
    }
  }

  return images;
}

/** 规范化图片 URL（处理协议相对路径） */
function normalizeImgUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  return url;
}

/** 提取正文段落：按段落标题分割 */
function extractSections(html: string): BaikeSection[] {
  const sections: BaikeSection[] = [];

  // 提取 lemma-content 或正文区域
  const contentArea =
    extractFirstMatch(html, /<div[^>]*class="[^"]*lemma-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*(?:edit-coll|lemma-stat)/) ||
    extractFirstMatch(html, /<div[^>]*class="[^"]*para-content[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
    extractFirstMatch(html, /<div[^>]*id="[^"]*bodyContent[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
    '';

  const source = contentArea || html;

  // 提取段落标题：<h2/h3> 或 <div>，class 含 para-title/headline/title/section-title
  // 使用反向引用保证开闭标签类型一致
  const titleRegex = /<(h[23]|div)[^>]*class="[^"]*(?:para-title|headline|section-title|sub-title)[^"]*"[^>]*>([\s\S]*?)<\/\1>/g;

  const titlePositions: { title: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = titleRegex.exec(source)) !== null) {
    const t = decodeHtml(stripTags(m[2])).trim();
    if (t) titlePositions.push({ title: t, index: m.index + m[0].length });
  }

  if (titlePositions.length > 0) {
    for (let i = 0; i < titlePositions.length; i++) {
      const { title, index } = titlePositions[i];
      const end = i + 1 < titlePositions.length ? titlePositions[i + 1].index : source.length;
      const block = source.slice(index, end);
      const content = collectParagraphs(block);
      if (content) sections.push({ title, content });
    }
  }

  // 兜底：所有 .para 段落合并为一个"正文"段
  if (sections.length === 0) {
    const paraRegex = /<div[^>]*class="[^"]*para[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    const paras: string[] = [];
    let pm: RegExpExecArray | null;
    while ((pm = paraRegex.exec(html)) !== null) {
      const t = decodeHtml(stripTags(pm[1])).trim();
      if (t) paras.push(t);
    }
    if (paras.length > 0) {
      sections.push({ title: '正文', content: paras.join('\n\n') });
    }
  }

  return sections;
}

/** 收集段落块中的 .para 段落文本 */
function collectParagraphs(block: string): string {
  const paraRegex = /<div[^>]*class="[^"]*para[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  const paragraphs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = paraRegex.exec(block)) !== null) {
    const t = decodeHtml(stripTags(m[1])).trim();
    if (t) paragraphs.push(t);
  }
  // 兜底：未匹配到 .para 时直接清理整块文本
  if (paragraphs.length === 0) {
    const t = decodeHtml(stripTags(block)).trim();
    if (t) paragraphs.push(t);
  }
  return paragraphs.join('\n\n');
}

/** 药物结构化字段（均为字符串值） */
type DrugStringField =
  | 'indications'
  | 'pharmacokinetics'
  | 'contraindications'
  | 'sideEffects'
  | 'warnings'
  | 'useInPregnancy'
  | 'useInChildren'
  | 'useInElderly'
  | 'drugInteractions'
  | 'storage'
  | 'overdose';

/** 药物结构化字段映射：百度百科段落标题 → 字段 */
const DRUG_FIELD_PATTERNS: Array<{ field: DrugStringField; patterns: RegExp[] }> = [
  { field: 'indications', patterns: [/适应症/, /适应症和主治/, /主治/, /功能主治/] },
  { field: 'pharmacokinetics', patterns: [/药代动力学/, /药代学/, /药动学/] },
  { field: 'contraindications', patterns: [/禁忌/, /禁忌症/] },
  { field: 'sideEffects', patterns: [/不良反应/, /副作用/] },
  { field: 'warnings', patterns: [/注意事项/, /注意/] },
  { field: 'useInPregnancy', patterns: [/孕妇及哺乳期妇女用药/, /孕妇用药/, /妊娠期/] },
  { field: 'useInChildren', patterns: [/儿童用药/] },
  { field: 'useInElderly', patterns: [/老年用药/, /老年人用药/] },
  { field: 'drugInteractions', patterns: [/药物相互作用/, /相互作用/] },
  { field: 'storage', patterns: [/贮藏/, /储藏/, /储存/, /保存/] },
  { field: 'overdose', patterns: [/药物过量/, /过量/] },
];

/** 从段落中提取药物结构化字段（按段落标题匹配） */
function extractDrugFields(sections: BaikeSection[]): Partial<BaikeDetail> {
  const result: Partial<BaikeDetail> = {};
  const assigned = new Set<DrugStringField>();

  for (const section of sections) {
    if (assigned.size >= DRUG_FIELD_PATTERNS.length) break;
    for (const { field, patterns } of DRUG_FIELD_PATTERNS) {
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

/** 提取第一个匹配的第一个捕获组（无匹配返回空串） */
function extractFirstMatch(html: string, regex: RegExp): string {
  const m = regex.exec(html);
  return m ? (m[1] ?? '') : '';
}

/** 去除 HTML 标签、脚本、样式，保留文本 */
function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ');
}

/** 解码常见 HTML 实体 */
function decodeHtml(s: string): string {
  if (!s) return '';
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
