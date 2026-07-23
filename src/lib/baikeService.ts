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
import { builtinFruitBaike } from '@/data/baikeFruits';
import { builtinMedicationBaike } from '@/data/baikeMedications';
import { builtinFruitBaikeExtra } from '@/data/baikeFruitsExtra';
import { builtinMedicationBaikeExtra } from '@/data/baikeMedicationsExtra';
import { fetchEntityInfo, type EntityInfo } from './wikiService';

/**
 * 本地内置百科数据（离线兜底数据源）。
 *
 * 合并水果 + 药物内置数据（基础 + 扩充），key 统一为小写。
 * 当联网抓取百度百科失败时，从此表查询作为可靠兜底，确保搜索/详情始终有结果。
 * 共约 127 个词条（30+37 水果 + 30+30 药物），覆盖肾病患者最常见场景。
 * 联网增强仍由维基百科 API + 百度百科抓取承担，本表保证离线兜底覆盖面。
 */
const builtinBaikeData: Record<string, BaikeInfo> = (() => {
  const merged: Record<string, BaikeInfo> = {};
  for (const [k, v] of Object.entries(builtinFruitBaike)) merged[k.toLowerCase()] = v;
  for (const [k, v] of Object.entries(builtinFruitBaikeExtra)) merged[k.toLowerCase()] = v;
  for (const [k, v] of Object.entries(builtinMedicationBaike)) merged[k.toLowerCase()] = v;
  for (const [k, v] of Object.entries(builtinMedicationBaikeExtra)) merged[k.toLowerCase()] = v;
  return merged;
})();

/**
 * 查询本地内置百科数据。
 * 支持精确匹配 + 模糊匹配（包含/被包含），适配用户输入变体（如"桂圆"匹配"龙眼"）。
 * @returns 本地命中返回 BaikeInfo（标记 _builtin）；未命中返回 null
 */
export function lookupBuiltinBaike(keyword: string): BaikeInfo | null {
  const key = keyword.trim().toLowerCase();
  if (!key) return null;
  // 1. 精确匹配
  if (builtinBaikeData[key]) return { ...builtinBaikeData[key] };
  // 2. 去除常见后缀后匹配（如"硝苯地平片"→"硝苯地平"、"柚子肉"→"柚子"）
  const stripped = key.replace(/(片|胶囊|注射液|口服液|缓释片|控释片|分散片|颗粒|丸|膏|露|素|果|肉|子|类)$/, '');
  if (stripped !== key && builtinBaikeData[stripped]) return { ...builtinBaikeData[stripped] };
  // 3. 包含匹配：内置 key 包含在用户输入中（如"硝苯地平缓释片"包含"硝苯地平"）
  for (const [k, v] of Object.entries(builtinBaikeData)) {
    if (k.length >= 2 && key.includes(k)) return { ...v };
  }
  // 4. 被包含匹配：用户输入是内置 key 的子串（如"柚"匹配"柚子"）
  let bestLen = 0;
  let best: BaikeInfo | null = null;
  for (const [k, v] of Object.entries(builtinBaikeData)) {
    if (k.length >= 2 && k.includes(key) && k.length > bestLen) {
      bestLen = k.length;
      best = { ...v };
    }
  }
  return best;
}

/** 百度百科正文章节（按词条内二级/三级标题划分） */
export interface BaikeSection {
  /** 章节标题（如「不良反应」「禁忌」「注意事项」「用法用量」「形态特征」） */
  title: string;
  /** 该章节下的段落文本列表（已去标签） */
  paragraphs: string[];
}

export interface BaikeInfo {
  /** 词条标题 */
  title: string;
  /** 摘要（前 1-2 段纯文本） */
  summary: string;
  /** 正文详细内容（多段纯文本，用 \n\n 分隔） */
  content: string;
  /** 结构化章节列表（药物覆盖适应症/用法用量/不良反应/禁忌/注意事项等全字段） */
  sections?: BaikeSection[];
  /** 主图 URL */
  image?: string;
  /** 多图 URL */
  images?: string[];
  /** 信息框键值对（如「别名」「英文名称」「分子式」等） */
  infobox?: Record<string, string>;
}

/** 百度百科「检索」候选条目（searchBaike 返回） */
export interface BaikeSearchItem {
  /** 词条标题 */
  title: string;
  /** 简短描述（搜索结果摘要 / 词条摘要） */
  description?: string;
  /** 词条 URL（/item/{title}/{id} 或绝对 URL） */
  url?: string;
  /** 缩略图（如有） */
  image?: string;
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

  // 4. 优先查本地内置百科数据（离线兜底数据源）
  //    本地命中即返回，并持久化到 localStorage，避免重复查询
  //    未命中再走联网抓取（CapacitorHttp 原生 HTTP 或浏览器 fetch）
  const builtin = lookupBuiltinBaike(keyword);
  if (builtin) {
    baikeCache.set(key, builtin);
    return Promise.resolve(builtin);
  }

  const p = doFetchBaike(keyword.trim())
    .then((result) => {
      if (result) {
        // 联网成功：持久化到 localStorage，离线二次访问直接读本地
        baikeCache.set(key, result);
      } else {
        // 联网失败：回退查本地内置数据作为最终兜底
        // （兜底匹配可能因大小写/后缀差异比第 4 步更宽，再次确认一次）
        const fallback = lookupBuiltinBaike(keyword);
        if (fallback) {
          baikeCache.set(key, fallback);
          baikePending.delete(key);
          return fallback;
        }
        // 完全失败：只存内存，下次重启应用可重新尝试联网
        baikeMemoryCache.set(key, null);
      }
      baikePending.delete(key);
      return result;
    })
    .catch(() => {
      // 异常兜底：再查一次本地内置数据
      const fallback = lookupBuiltinBaike(keyword);
      if (fallback) {
        baikeCache.set(key, fallback);
        baikePending.delete(key);
        return fallback;
      }
      baikeMemoryCache.set(key, null);
      baikePending.delete(key);
      return null;
    });

  baikePending.set(key, p);
  return p;
}

/** 实际抓取 + 解析流程
 *
 * 数据源优先级：
 * 1. 维基百科 REST/parse API（首选）：API 规范、无风控、有结构化章节/infobox/图集
 * 2. 百度百科 HTML 抓取（兜底）：覆盖维基百科未收录的中文词条
 *
 * 维基百科在国内可访问（虽偶有不稳定），且提供 origin=* CORS 支持，
 * 比百度百科 HTML 抓取成功率高很多。
 */
async function doFetchBaike(keyword: string): Promise<BaikeInfo | null> {
  // 策略1：维基百科 API（首选，覆盖率高、无风控）
  // 根据关键词特征判断类型：含药字后缀（片/胶囊/注射液等）视为药物，否则按水果处理
  const kind = /片|胶囊|注射液|口服液|缓释|控释|分散|颗粒|丸|膏|注射剂|滴剂|喷雾|贴剂|凝胶|乳膏/.test(keyword)
    ? 'medication'
    : 'fruit';
  try {
    const wikiInfo = await fetchEntityInfo(keyword, kind);
    const converted = wikiInfoToBaike(keyword, wikiInfo);
    if (converted) return converted;
  } catch {
    // 维基失败，继续走百度百科
  }

  // 策略2：百度百科 HTML 抓取（兜底）
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

  // 结构化章节：按词条内 H2/H3/para-title 标题划分，
  // 药物词条可覆盖「适应症/用法用量/不良反应/禁忌/注意事项/药理毒理/药代动力学」等全字段；
  // 水果词条可覆盖「形态特征/分布范围/主要价值/栽培技术」等。解析失败不影响 content 兜底。
  const sections = safe(() => parseSections(doc)) ?? [];
  if (sections.length > 0) info.sections = sections;

  const image = safe(() => parseMainImage(doc));
  if (image) info.image = image;

  const images = safe(() => parseImages(doc));
  if (images && images.length > 0) info.images = images;

  const infobox = safe(() => parseInfobox(doc));
  if (infobox && Object.keys(infobox).length > 0) info.infobox = infobox;

  return info;
}

/**
 * 将 wikiService 的 EntityInfo 转换为 BaikeInfo。
 * 维基百科数据结构比百度百科更规范，章节/信息框/图集都有专门字段。
 * 至少要有 lead 或 sections 或 description 才视为有效。
 */
function wikiInfoToBaike(keyword: string, wiki: EntityInfo): BaikeInfo | null {
  if (!wiki || Object.keys(wiki).length === 0) return null;

  const title = keyword;
  const summary = wiki.description || (wiki.lead ? wiki.lead.slice(0, 200) : '');
  const content = wiki.lead || wiki.description || '';

  // 至少要有摘要/正文/章节之一才算有效
  if (!summary && !content && (!wiki.sections || wiki.sections.length === 0)) {
    return null;
  }

  const info: BaikeInfo = { title, summary, content };

  // 章节：WikiSection 结构与 BaikeSection 兼容（title + paragraphs[]）
  if (wiki.sections && wiki.sections.length > 0) {
    info.sections = wiki.sections.map((s) => ({
      title: s.title,
      paragraphs: s.paragraphs,
    }));
  }

  if (wiki.image) info.image = wiki.image;
  if (wiki.images && wiki.images.length > 0) info.images = wiki.images;
  if (wiki.infobox && Object.keys(wiki.infobox).length > 0) info.infobox = wiki.infobox;

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

/**
 * 解析正文章节：按词条内 H2/H3/para-title 标题划分结构化章节。
 *
 * 百度百科 DOM 结构：
 * - 章节标题：`<h2><span class="title-1">不良反应</span></h2>`、`<h3 class="title-2">`、
 *   `<div class="para-title level-2"><span class="title-content">禁忌</span></div>` 等多种变体
 * - 章节段落：`<div class="para">` / `<p class="para">` / `<p>`
 *
 * 策略：在正文容器内按文档顺序遍历「标题 + 段落」节点序列，遇标题开启新章节，
 * 遇段落追加到当前章节。跳过「参考文献/参考资料/扩展阅读/外部链接/参见」等元章节。
 *
 * 药物词条由此可结构化输出：适应症、用法用量、不良反应、禁忌、注意事项、孕妇及哺乳期妇女用药、
 * 儿童用药、老年患者用药、药物相互作用、药物过量、药理毒理、药代动力学、贮藏、包装等全字段。
 */
function parseSections(doc: Document): BaikeSection[] {
  const container =
    doc.querySelector('.J-lemma-content') ||
    doc.querySelector('.main-content') ||
    doc.querySelector('.lemma-content') ||
    doc.querySelector('#bodyContent') ||
    doc.body;
  if (!container) return [];

  /** 非正文章节标题（参考资料/扩展阅读等），命中后丢弃当前章节上下文 */
  const SKIP_TITLES = /参考文献|参考资料|扩展阅读|外部链接|外部連接|参见|相關條目|相关条目|注释|词条编辑|词条标签|目录|免责声明/;
  /** 标题前缀序号清理：如「1、适应症」「2.用法用量」 */
  const LEADING_INDEX = /^[\d\s]+[、.．)]*\s*/;

  const sections: BaikeSection[] = [];
  let current: BaikeSection | null = null;
  const seen = new Set<string>();

  const nodes = container.querySelectorAll(
    'h2, h3, h4, .para-title, [class*="title-1"], [class*="title-2"], [class*="title-content"], .para, p'
  );

  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    const cls = typeof el.className === 'string' ? el.className : '';
    const isHeading =
      tag === 'h2' ||
      tag === 'h3' ||
      tag === 'h4' ||
      /para-title|title-1|title-2|title-content|headline/i.test(cls);

    if (isHeading) {
      const rawTitle = elText(el);
      const title = rawTitle.replace(LEADING_INDEX, '').trim();
      if (!title || title.length > 24) {
        current = null;
        continue;
      }
      if (SKIP_TITLES.test(title)) {
        current = null;
        continue;
      }
      current = { title, paragraphs: [] };
      sections.push(current);
      continue;
    }

    if (!current) continue;
    const text = elText(el);
    if (!text || text.length < 2 || seen.has(text)) continue;
    seen.add(text);
    current.paragraphs.push(text);
  }

  // 过滤空章节 + 合并同名相邻章节（不同标题级别可能重复出现）
  const merged: BaikeSection[] = [];
  for (const s of sections) {
    if (s.paragraphs.length === 0) continue;
    const last = merged[merged.length - 1];
    if (last && last.title === s.title) {
      last.paragraphs.push(...s.paragraphs);
    } else {
      merged.push({ title: s.title, paragraphs: [...s.paragraphs] });
    }
  }
  return merged;
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

// ============================================================
// 百度百科「检索」服务
//
// 背景：百度百科搜索结果页（/search?word=）的候选列表为前端 JS 渲染，
// 服务端 HTML 可能不含候选链接，且 baike 对服务端抓取有风控（百度安全验证）。
// 因此采用多策略 + 兜底，确保「检索有结果」：
//   策略1：解析 /search?word= 结果页 HTML 中的 /item/ 候选链接（命中即返回多候选）
//   策略2（兜底）：直接抓取 /item/{keyword}（baike 会 302 重定向到最佳匹配词条），
//                 解析其标题 + 摘要作为单条候选返回 —— 修复「检索无结果」异常
//
// 缓存 + 并发去重，模式同 fetchBaikeInfo。
// ============================================================

const baikeSearchCache = new PersistentCache<BaikeSearchItem[]>({ prefix: 'baike_search_cache_', maxEntries: 60 });
const baikeSearchMemoryCache = new Map<string, BaikeSearchItem[]>();
const baikeSearchPending = new Map<string, Promise<BaikeSearchItem[]>>();

/**
 * 检索百度百科词条。
 * @param keyword 关键词（中文水果/药物名）
 * @returns 候选列表（标题 + 描述 + URL）；完全失败返回空数组
 */
export function searchBaike(keyword: string): Promise<BaikeSearchItem[]> {
  const key = keyword.trim().toLowerCase();
  if (!key) return Promise.resolve([]);

  if (baikeSearchCache.has(key)) {
    return Promise.resolve(baikeSearchCache.get(key) ?? []);
  }
  if (baikeSearchMemoryCache.has(key)) {
    return Promise.resolve(baikeSearchMemoryCache.get(key) ?? []);
  }

  const inflight = baikeSearchPending.get(key);
  if (inflight) return inflight;

  const p = doSearchBaike(keyword.trim())
    .then((items) => {
      // 成功（含空数组，但只有解析到候选才视为成功持久化）才落 localStorage
      if (items.length > 0) baikeSearchCache.set(key, items);
      else baikeSearchMemoryCache.set(key, items);
      baikeSearchPending.delete(key);
      return items;
    })
    .catch(() => {
      baikeSearchMemoryCache.set(key, []);
      baikeSearchPending.delete(key);
      return [];
    });

  baikeSearchPending.set(key, p);
  return p;
}

/** 实际检索流程：本地内置数据 → 搜索结果页 → 兜底直接词条解析 */
async function doSearchBaike(keyword: string): Promise<BaikeSearchItem[]> {
  // 策略0：优先查本地内置百科数据，确保「搜索始终有结果」（联网失败时的可靠兜底）
  const builtin = lookupBuiltinBaike(keyword);
  if (builtin && builtin.title) {
    return [
      {
        title: builtin.title,
        description: builtin.summary || builtin.content?.slice(0, 120),
        url: `https://baike.baidu.com/item/${encodeURIComponent(builtin.title)}`,
        image: builtin.image,
      },
    ];
  }

  // 策略1：搜索结果页
  const searchUrl = `https://baike.baidu.com/search?word=${encodeURIComponent(keyword)}`;
  const html = await fetchHtml(searchUrl);
  if (html && !isBlockedPage(html)) {
    const items = safe(() => parseSearchResults(html)) ?? [];
    if (items.length > 0) return items;
  }

  // 策略2（兜底）：直接词条解析，确保「检索有结果」
  // baike 会把 /item/{keyword} 302 重定向到最佳匹配词条（含数字 ID）
  const item = await fetchBaikeInfo(keyword);
  if (item && item.title) {
    return [
      {
        title: item.title,
        description: item.summary || item.content?.slice(0, 120),
        url: `https://baike.baidu.com/item/${encodeURIComponent(item.title)}`,
        image: item.image,
      },
    ];
  }

  return [];
}

/**
 * 解析百度百科搜索结果页 HTML，提取候选词条。
 *
 * 候选链接形如 `<a href="/item/呋塞米片/5574234">呋塞米片</a>`。
 * 优先在结果容器（.searchResult / .search-list / .result）内查找，避免误抓页脚热门词条；
 * 容器未命中时退化为全页 /item/ 链接扫描。
 */
function parseSearchResults(html: string): BaikeSearchItem[] {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return [];
  }

  /** 从 /item/{titleSeg}/{id?} 链接中提取标题（优先链接文本，否则解码路径段） */
  const extractFromAnchor = (a: Element): BaikeSearchItem | null => {
    const href = a.getAttribute('href') || '';
    const match = href.match(/\/item\/([^/?#]+)/);
    if (!match) return null;
    // 过滤页脚/帮助/编辑服务类链接
    if (/bk_fr=pcFooter|\/item\/百度百科[:%]|help|usercenter|\/user\//i.test(href)) return null;

    let title = (a.textContent || '').trim();
    const url = toAbsoluteUrl(href);
    // 链接文本可能是「百度百科：本人词条编辑服务」之类，需过滤
    if (!title || title.length > 30 || /^百度百科[:：]/.test(title)) {
      try {
        title = decodeURIComponent(match[1]);
      } catch {
        title = match[1];
      }
    }
    if (!title || title.length > 30) return null;

    // 描述：向上找最近的结果容器，再找其中的摘要文本
    let description: string | undefined;
    const container = a.closest('.result, .search-result, .search-list, dl, li');
    if (container) {
      const abs = container.querySelector(
        '.result-abstract, .c-gap-top-small, .abstract, dd, .result-c_abstract, [class*="abstract"]'
      );
      const absText = elText(abs);
      if (absText && absText.length > 4) description = absText.slice(0, 160);
    }

    return { title, description, url };
  };

  const items: BaikeSearchItem[] = [];
  const seen = new Set<string>();

  // 1. 结果容器内链接
  let anchors = doc.querySelectorAll(
    '.searchResult a[href*="/item/"], .search-list a[href*="/item/"], .result a[href*="/item/"], .search-result a[href*="/item/"]'
  );
  // 2. 容器未命中 → 全页扫描
  if (anchors.length === 0) {
    anchors = doc.querySelectorAll('a[href*="/item/"]');
  }

  for (const a of anchors) {
    if (items.length >= 12) break;
    const item = extractFromAnchor(a);
    if (!item) continue;
    if (seen.has(item.title)) continue;
    seen.add(item.title);
    items.push(item);
  }

  return items;
}
