/**
 * 百度百科内容抓取与解析服务
 *
 * 数据源：百度百科手机版页面
 *   https://baike.baidu.com/item/{encodeURIComponent(keyword)}
 *
 * 抓取策略：
 * - 直接请求优先（带手机 UA）；失败依次尝试 allorigins.win、corsproxy.io 两个 CORS 代理轮换
 * - 超时 12 秒
 * - 内存缓存 + 并发去重：同一关键词只发一次请求（参考 wikiService.ts 的 cache/pending Map 模式）
 *
 * 解析策略（DOMParser，浏览器内置，无额外依赖）：
 * - 摘要：.lemma-summary / .J-summary / meta[name=description]，去标签后取前 200 字
 * - 正文：.para / .J-lemma-content 内段落，去标签后用 \n\n 连接，最多取前 8 段
 * - 主图：.summary-img img 的 src（或懒加载 data-src）或 og:image meta
 * - 多图：.main-content img / .album-list img，最多 5 张，过滤 width<100 的 icon/logo
 * - 信息框：.basicInfo / .lemmaWgt-promotion 内 dt/dd 键值对
 * - 所有文本统一去 HTML 标签、解码实体、trim
 *
 * 容错：
 * - 任一字段解析失败返回 undefined，不抛错，返回部分填充对象
 * - 检测到「验证码」「安全验证」字样视为被风控拦截，返回 null
 * - 完全失败（无标题/摘要/正文）返回 null
 *
 * 注：CORS 代理模式参考 foodNutritionService.ts，但独立定义以解耦。
 */

export interface BaikeInfo {
  /** 词条标题 */
  title: string;
  /** 摘要（前 1-2 段纯文本） */
  summary: string;
  /** 正文详细内容（多段纯文本，用 \n\n 分隔） */
  content: string;
  /** 主图 URL */
  image?: string;
  /** 多图 URL */
  images?: string[];
  /** 信息框键值对（如「别名」「英文名称」「分子式」等） */
  infobox?: Record<string, string>;
}

/** 请求超时（毫秒） */
const TIMEOUT = 12000;

/** 模拟手机浏览器的 User-Agent（浏览器环境会忽略此 forbidden header，Capacitor 原生 HTTP 可识别） */
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

/**
 * CORS 代理列表（独立于 foodNutritionService，按顺序轮换）
 * 直接请求失败后依次尝试。
 */
const CORS_PROXIES: Array<(url: string) => string> = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

/** 详情缓存 + 并发去重（参考 wikiService.ts 的 cache/pending Map 模式） */
const baikeCache = new Map<string, BaikeInfo | null>();
const baikePending = new Map<string, Promise<BaikeInfo | null>>();

/** 风控/验证页特征关键词，命中任一即视为被拦截 */
const BLOCK_KEYWORDS = ['验证码', '安全验证', '百度安全验证', 'wappass.baidu.com'];

/**
 * 抓取并解析百度百科词条。
 * @param keyword 词条名（中文）
 * @returns 解析结果；完全失败或被风控拦截返回 null
 */
export function fetchBaikeInfo(keyword: string): Promise<BaikeInfo | null> {
  const key = keyword.trim().toLowerCase();
  if (!key) return Promise.resolve(null);

  // 命中缓存（含失败缓存 null）直接返回，避免重复请求
  if (baikeCache.has(key)) {
    return Promise.resolve(baikeCache.get(key) ?? null);
  }

  // 并发去重：同一关键词的并发调用复用同一个 Promise
  const inflight = baikePending.get(key);
  if (inflight) return inflight;

  const p = doFetchBaike(keyword.trim())
    .then((result) => {
      baikeCache.set(key, result);
      baikePending.delete(key);
      return result;
    })
    .catch(() => {
      // 兜底：异常时缓存 null，避免对失败关键词反复打请求
      baikeCache.set(key, null);
      baikePending.delete(key);
      return null;
    });

  baikePending.set(key, p);
  return p;
}

/** 实际抓取 + 解析流程 */
async function doFetchBaike(keyword: string): Promise<BaikeInfo | null> {
  const targetUrl = `https://baike.baidu.com/item/${encodeURIComponent(keyword)}`;

  // 1. 抓取 HTML 文本（直接 → 代理轮换）
  const html = await fetchHtml(targetUrl);
  if (!html) return null;

  // 2. 风控 / 验证页检测：百度百科可能返回 302 跳转到验证页
  if (isBlockedPage(html)) return null;

  // 3. DOMParser 解析（浏览器内置，无额外依赖）
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return null;
  }

  // 4. 逐字段解析，任一字段失败不影响其它字段（safe 包装兜底）
  const title = safe(() => parseTitle(doc)) ?? '';
  const summary = safe(() => parseSummary(doc)) ?? '';
  const content = safe(() => parseContent(doc)) ?? '';

  // 至少要有标题/摘要/正文之一才算抓取成功
  if (!title && !summary && !content) return null;

  const info: BaikeInfo = { title, summary, content };

  const image = safe(() => parseMainImage(doc));
  if (image) info.image = image;

  const images = safe(() => parseImages(doc));
  if (images && images.length > 0) info.images = images;

  const infobox = safe(() => parseInfobox(doc));
  if (infobox && Object.keys(infobox).length > 0) info.infobox = infobox;

  return info;
}

/** 直接 + 代理轮换抓取 HTML 文本 */
async function fetchHtml(url: string): Promise<string | null> {
  // 直接请求（带手机 UA）
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': MOBILE_UA, Accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (res.ok) {
      const text = await res.text();
      if (text) return text;
    }
  } catch {
    // 浏览器环境会忽略 User-Agent，部分场景 CORS 也会失败，继续走代理
  }

  // 代理轮换：allorigins.win → corsproxy.io
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(TIMEOUT) });
      if (res.ok) {
        const text = await res.text();
        if (text) return text;
      }
    } catch {
      // 继续尝试下一个代理
    }
  }

  return null;
}

/** 检测页面是否被风控拦截（验证码 / 安全验证页） */
function isBlockedPage(html: string): boolean {
  // 只检查前 8KB：验证页通常在头部注入跳转脚本
  const head = html.slice(0, 8192);
  return BLOCK_KEYWORDS.some((kw) => head.includes(kw));
}

/** 安全执行：失败返回 undefined，不抛错 */
function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

/**
 * 获取元素的纯文本（去 HTML 标签 + 解码实体 + trim）。
 * 利用 textContent 自动剥离标签并解码 HTML 实体。
 */
function elText(el: Element | null | undefined): string {
  if (!el) return '';
  // 移除 script/style 子节点，避免脚本/样式文本混入正文
  el.querySelectorAll('script, style').forEach((n) => n.remove());
  return (el.textContent || '').replace(/\u00a0/g, ' ').trim();
}

/** 解析标题：优先 <h1>，降级 <title>（形如「苹果_百度百科」取下划线前部分） */
function parseTitle(doc: Document): string {
  const h1 = doc.querySelector('h1');
  if (h1?.textContent) return h1.textContent.trim();
  const titleEl = doc.querySelector('title');
  if (titleEl?.textContent) {
    return titleEl.textContent.split(/[_\-|【]/)[0].trim();
  }
  return '';
}

/** 解析摘要：.lemma-summary / .J-summary / meta description，取前 200 字 */
function parseSummary(doc: Document): string {
  // 1. 优先取正文摘要块
  const summaryEl =
    doc.querySelector('.lemma-summary') ||
    doc.querySelector('.J-summary') ||
    doc.querySelector('.summary');
  if (summaryEl) {
    const text = elText(summaryEl);
    if (text) return text.slice(0, 200);
  }
  // 2. 降级：meta description（getAttribute 已自动解码实体）
  const meta = doc.querySelector('meta[name="description"]');
  const content = (meta?.getAttribute('content') || '').trim();
  if (content) return content.slice(0, 200);
  return '';
}

/** 解析正文：.para / .J-lemma-content 段落，最多前 8 段，用 \n\n 连接 */
function parseContent(doc: Document): string {
  const container =
    doc.querySelector('.J-lemma-content') ||
    doc.querySelector('.main-content') ||
    doc.body;
  if (!container) return '';

  const paras: string[] = [];
  // 收集段落：优先 .para / .J-para-content，兜底用 p
  const paraEls = container.querySelectorAll('.para, .J-para-content, p');
  for (const el of paraEls) {
    if (paras.length >= 8) break;
    const text = elText(el);
    if (text && text.length >= 2) paras.push(text);
  }
  return paras.join('\n\n');
}

/** 解析主图：.summary-img img（含懒加载 data-src）或 og:image meta */
function parseMainImage(doc: Document): string {
  // 1. 摘要配图
  const img = doc.querySelector('.summary-img img, .summary img, .lemma-picture img');
  const src = normalizeImgUrl(img);
  if (src) return src;
  // 2. 降级：og:image meta
  const og = doc.querySelector('meta[property="og:image"]');
  const ogc = (og?.getAttribute('content') || '').trim();
  if (ogc) return toAbsoluteUrl(ogc);
  return '';
}

/** 解析多图：.main-content img / .album-list img，最多 5 张，过滤 icon/logo（width<100） */
function parseImages(doc: Document): string[] {
  const imgs = doc.querySelectorAll(
    '.main-content img, .album-list img, .lemma-content img',
  );
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const img of imgs) {
    if (urls.length >= 5) break;
    const url = normalizeImgUrl(img);
    if (!url || seen.has(url)) continue;
    // 过滤小图标 / logo：width 属性 < 100 或 URL 含 icon/logo/sprite
    const w = parseInt(img.getAttribute('width') || '0', 10);
    if (w > 0 && w < 100) continue;
    if (/icon|logo|sprite|blank\.gif|placeholder/i.test(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

/** 解析信息框：.basicInfo / .lemmaWgt-promotion 内 dt/dd 键值对 */
function parseInfobox(doc: Document): Record<string, string> {
  const result: Record<string, string> = {};
  const container =
    doc.querySelector('.basicInfo') ||
    doc.querySelector('.lemmaWgt-promotion') ||
    doc.querySelector('.basic-info');
  if (!container) return result;

  // 1. 优先按 dl 内 dt/dd 配对（百度百科信息框标准结构）
  const dts = container.querySelectorAll('dt');
  const dds = container.querySelectorAll('dd');
  if (dts.length > 0 && dds.length > 0) {
    const pairs = Math.min(dts.length, dds.length);
    for (let i = 0; i < pairs; i++) {
      const key = elText(dts[i]);
      const val = elText(dds[i]);
      if (key && val) result[key] = val;
    }
  }

  // 2. 降级：按行表 .basicInfo-item / .item 内 label/value 配对
  if (Object.keys(result).length === 0) {
    const items = container.querySelectorAll('.basicInfo-item, .item');
    for (const item of items) {
      const label = item.querySelector('.label, dt, .name');
      const value = item.querySelector('.value, dd, .text');
      const k = elText(label);
      const v = elText(value);
      if (k && v) result[k] = v;
    }
  }
  return result;
}

/** 规范化图片 URL：优先懒加载属性 data-src / data-original，再处理协议相对 URL */
function normalizeImgUrl(img: Element | null): string {
  if (!img) return '';
  const src =
    img.getAttribute('data-src') ||
    img.getAttribute('data-original') ||
    img.getAttribute('src') ||
    '';
  return toAbsoluteUrl(src);
}

/** 将协议相对 / 相对 URL 转为绝对 URL */
function toAbsoluteUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `https://baike.baidu.com${trimmed}`;
  return trimmed;
}
