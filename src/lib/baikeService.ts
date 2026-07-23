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

import { PersistentCache } from './persistentCache';

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

/** 请求超时（毫秒）—— 提升至 15s 应对 CORS 代理慢响应 */
const TIMEOUT = 15000;

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
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
];

/** 详情持久化缓存（localStorage + 内存，离线二次访问）+ 并发去重 */
const baikeCache = new PersistentCache<BaikeInfo | null>({ prefix: 'baike_cache_', maxEntries: 80 });
/** 内存临时缓存（仅本次会话），用于「失败不持久化」策略：避免失败永久卡死，下次重启应用仍可重试 */
const baikeMemoryCache = new Map<string, BaikeInfo | null>();
const baikePending = new Map<string, Promise<BaikeInfo | null>>();

/**
 * 风控/验证页特征关键词。
 *
 * 判定策略（避免误杀正常词条）：
 * - wappass.baidu.com（百度安全验证页 URL）→ 单独命中即视为拦截
 * - 「百度安全验证」+「验证码」必须同时出现才算拦截
 * - 「请完成下方验证」单独命中即视为拦截
 *
 * 旧策略「单关键词命中即拦截」会导致正常词条被误判为空（问题3根因）。
 */
const BLOCK_KEYWORDS_STRONG = ['wappass.baidu.com', '请完成下方验证', 'baidu.com/secures'];
const BLOCK_KEYWORDS_PAIR = ['百度安全验证', '验证码'];

/**
 * 抓取并解析百度百科词条。
 *
 * 关键修复（问题3）：检索逻辑漏洞
 * - 命中「持久化缓存」时直接返回（仅缓存成功结果）
 * - 命中「内存临时缓存」时也直接返回（包含失败 null，仅本次会话有效）
 * - 不持久化 null，避免下次联网恢复后仍读出空数据
 *
 * @param keyword 词条名（中文）
 * @returns 解析结果；完全失败或被风控拦截返回 null
 */
export function fetchBaikeInfo(keyword: string): Promise<BaikeInfo | null> {
  const key = keyword.trim().toLowerCase();
  if (!key) return Promise.resolve(null);

  // 1. 命中持久化缓存（仅成功结果）直接返回
  if (baikeCache.has(key)) {
    return Promise.resolve(baikeCache.get(key) ?? null);
  }

  // 2. 命中内存临时缓存（含失败 null，仅本次会话）也返回，避免短时间内重复打请求
  if (baikeMemoryCache.has(key)) {
    return Promise.resolve(baikeMemoryCache.get(key) ?? null);
  }

  // 3. 并发去重：同一关键词的并发调用复用同一个 Promise
  const inflight = baikePending.get(key);
  if (inflight) return inflight;

  const p = doFetchBaike(keyword.trim())
    .then((result) => {
      if (result) {
        // 成功：持久化到 localStorage，离线二次访问直接读本地
        baikeCache.set(key, result);
      } else {
        // 失败：只存内存，下次重启应用可重新尝试联网
        // 修复问题3：原策略持久化 null 导致后续永远读出空数据
        baikeMemoryCache.set(key, null);
      }
      baikePending.delete(key);
      return result;
    })
    .catch(() => {
      baikeMemoryCache.set(key, null);
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

/**
 * 检测页面是否被风控拦截（验证码 / 安全验证页）。
 *
 * 修复问题3：原策略只命中任一关键词即判定拦截，
 * 但百度百科正文模板内含「安全验证」等防御性反爬提示文字，
 * 导致正常词条被误判为空。
 *
 * 新策略：
 * - 强关键词单独命中（wappass.baidu.com 等）即拦截
 * - 弱关键词对（百度安全验证 + 验证码）必须同时出现才拦截
 * - 检查范围扩展到前 32KB（验证页脚本通常在前部，但部分延迟加载）
 */
function isBlockedPage(html: string): boolean {
  const head = html.slice(0, 32768);
  // 强关键词：单独命中即视为风控页
  if (BLOCK_KEYWORDS_STRONG.some((kw) => head.includes(kw))) return true;
  // 弱关键词对：必须同时出现
  if (BLOCK_KEYWORDS_PAIR.every((kw) => head.includes(kw))) return true;
  return false;
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

/** 解析摘要：.lemma-summary / .J-summary / meta description，取前 400 字（提升信息密度） */
function parseSummary(doc: Document): string {
  // 1. 优先取正文摘要块（扩展多个选择器，适配新旧版百度百科 DOM 结构）
  const summaryEl =
    doc.querySelector('.lemma-summary') ||
    doc.querySelector('.J-summary') ||
    doc.querySelector('.summary') ||
    doc.querySelector('.lemma-content > .para') ||
    doc.querySelector('.abstract');
  if (summaryEl) {
    const text = elText(summaryEl);
    if (text) return text.slice(0, 400);
  }
  // 2. 降级：meta description（getAttribute 已自动解码实体）
  const meta = doc.querySelector('meta[name="description"]');
  const content = (meta?.getAttribute('content') || '').trim();
  if (content) return content.slice(0, 400);
  return '';
}

/**
 * 解析正文段落：最多前 20 段（提升内容完整性）。
 *
 * 修复问题2：原策略只取 8 段，长词条信息严重不全（如「碳酸司维拉姆片」有药理、适应症、
 * 不良反应、注意事项等多个段落，8 段不足覆盖）。
 */
function parseContent(doc: Document): string {
  const container =
    doc.querySelector('.J-lemma-content') ||
    doc.querySelector('.main-content') ||
    doc.querySelector('.lemma-content') ||
    doc.querySelector('#bodyContent') ||
    doc.body;
  if (!container) return '';

  const paras: string[] = [];
  // 收集段落：多种选择器组合，适配不同版本的百度百科 DOM
  const paraEls = container.querySelectorAll(
    '.para, .J-para-content, .para_X, p.para, div > p, p'
  );
  const seen = new Set<string>();
  for (const el of paraEls) {
    if (paras.length >= 20) break;
    const text = elText(el);
    // 跳过过短/重复段落
    if (!text || text.length < 2) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    paras.push(text);
  }
  return paras.join('\n\n');
}

/** 解析主图：扩展选择器适配新版百度百科 DOM，覆盖 .summary-img / .summary-pic / .J-summary-img 等 */
function parseMainImage(doc: Document): string {
  // 1. 摘要配图（多版本选择器）
  const img = doc.querySelector(
    '.summary-img img, .summary-pic img, .J-summary-img img, .summary img, .lemma-picture img, .lemma-content img'
  );
  const src = normalizeImgUrl(img);
  if (src) return src;
  // 2. 降级：og:image meta
  const og = doc.querySelector('meta[property="og:image"]');
  const ogc = (og?.getAttribute('content') || '').trim();
  if (ogc) return toAbsoluteUrl(ogc);
  // 3. 降级：itemprop image
  const itemImg = doc.querySelector('img[itemprop="image"]');
  const itemSrc = normalizeImgUrl(itemImg);
  if (itemSrc) return itemSrc;
  return '';
}

/** 解析多图：扩展选择器，最多 8 张，过滤 icon/logo（width<100） */
function parseImages(doc: Document): string[] {
  const imgs = doc.querySelectorAll(
    '.main-content img, .album-list img, .lemma-content img, .summary-pic img, .J-summary-img img, .para img'
  );
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const img of imgs) {
    if (urls.length >= 8) break;
    const url = normalizeImgUrl(img);
    if (!url || seen.has(url)) continue;
    // 过滤小图标 / logo：width 属性 < 100 或 URL 含 icon/logo/sprite
    const w = parseInt(img.getAttribute('width') || '0', 10);
    if (w > 0 && w < 100) continue;
    if (/icon|logo|sprite|blank\.gif|placeholder|loading\.gif|baike_med/i.test(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

/** 解析信息框：扩展选择器，覆盖 .basicInfo / .lemmaWgt-promotion / .basic-info / .J-basic-info */
function parseInfobox(doc: Document): Record<string, string> {
  const result: Record<string, string> = {};
  const container =
    doc.querySelector('.basicInfo') ||
    doc.querySelector('.lemmaWgt-promotion') ||
    doc.querySelector('.basic-info') ||
    doc.querySelector('.J-basic-info') ||
    doc.querySelector('.basicInfo-item-wrap');
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
    const items = container.querySelectorAll('.basicInfo-item, .item, .J-basic-info-item');
    for (const item of items) {
      const label = item.querySelector('.label, dt, .name, .basicInfo-item-name');
      const value = item.querySelector('.value, dd, .text, .basicInfo-item-value');
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
