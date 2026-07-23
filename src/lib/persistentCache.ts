/**
 * 通用 localStorage 持久化缓存工具，带 LRU 淘汰
 *
 * 设计要点：
 * - 内存 Map 与 localStorage 双写同步；get 时若内存未命中但 localStorage 命中，则回填内存
 * - 内部存储包一层 { value: T }，以区分「未命中」与「命中了 null / 空对象等假值」
 *   （百度百科会缓存 null 表示「查无此词条」，维基会缓存 {} / [] 表示查无，
 *    这些假值必须与 undefined「未命中」区分开）
 * - LRU：维护一份 key -> 访问时间戳 的索引（同样持久化到 localStorage），
 *    超出 maxEntries 时淘汰时间戳最小的条目
 * - 所有 localStorage 操作 try/catch 包裹，隐私模式 / 容量超限 / 序列化失败均不抛错
 * - 写入遇到 QuotaExceededError 时，先淘汰一半最旧条目再重试一次
 */

/** 持久化缓存配置 */
export interface PersistentCacheOptions {
  /** localStorage key 前缀，如 'baike_cache_' */
  prefix: string;
  /** 最大条目数，超出淘汰最旧的（默认 100） */
  maxEntries?: number;
}

/** 内部存储结构：包装一层 value，使 null 也能与「未命中」区分 */
interface StoredEntry<T> {
  value: T;
}

export class PersistentCache<T> {
  /** 内存缓存（与 localStorage 同步） */
  private readonly memory = new Map<string, T>();
  /** LRU 索引：key -> 最近访问时间戳（持久化到 localStorage） */
  private readonly order = new Map<string, number>();
  private readonly prefix: string;
  private readonly maxEntries: number;
  /** LRU 索引在 localStorage 中的 key */
  private readonly indexKey: string;

  constructor(options: PersistentCacheOptions) {
    this.prefix = options.prefix;
    this.maxEntries = options.maxEntries ?? 100;
    this.indexKey = `${this.prefix}__index__`;
    this.loadIndex();
  }

  /**
   * 读取：先读内存，没有再读 localStorage（命中则回填内存并刷新访问时间）。
   * @returns 命中返回存储值（可能是 null / {} / [] 等假值）；未命中返回 undefined
   */
  get(key: string): T | undefined {
    // 1. 内存命中
    if (this.memory.has(key)) {
      this.touch(key);
      return this.memory.get(key);
    }
    // 2. localStorage 命中：回填内存
    const raw = this.readStorage(this.storageKey(key));
    if (raw === null) {
      // localStorage.getItem 对不存在的 key 返回 null（JS null），与字符串 "null" 可区分
      return undefined;
    }
    const entry = this.parseEntry(raw);
    if (entry === undefined) return undefined; // 解析失败视为未命中
    this.memory.set(key, entry.value);
    this.touch(key);
    return entry.value;
  }

  /**
   * 写入：内存 + localStorage 同步，超出 maxEntries 淘汰最旧。
   * value 可以是 null / {} / [] 等任意值（包括假值）。
   */
  set(key: string, value: T): void {
    // 先写内存
    this.memory.set(key, value);
    this.touch(key);
    // 写 localStorage（含容量超限重试）
    this.writeStorage(key, value);
    // 容量控制
    this.evictIfNeeded();
    // 持久化 LRU 索引（含本次 touch 的时间戳）
    this.persistIndex();
  }

  /** 是否命中：内存或 localStorage 任一存在即算（对 null 等假值也返回 true） */
  has(key: string): boolean {
    if (this.memory.has(key)) return true;
    return this.readStorage(this.storageKey(key)) !== null;
  }

  // ---- 以下为内部实现 ----

  /** localStorage 实际 key：前缀 + encodeURIComponent(key) */
  private storageKey(key: string): string {
    return `${this.prefix}${encodeURIComponent(key)}`;
  }

  /** 读取 localStorage 原始字符串，失败或不存在的 key 均返回 null */
  private readStorage(storageKey: string): string | null {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      // 隐私模式 / 访问受限：视为未命中
      return null;
    }
  }

  /** 解析存储条目 { value: T }，失败或结构不符返回 undefined */
  private parseEntry(raw: string): StoredEntry<T> | undefined {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'value' in parsed) {
        return parsed as StoredEntry<T>;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /** 写入 localStorage（遇 QuotaExceededError 先淘汰一半最旧再重试一次） */
  private writeStorage(key: string, value: T): void {
    const storageKey = this.storageKey(key);
    const payload = JSON.stringify({ value } as StoredEntry<T>);
    try {
      localStorage.setItem(storageKey, payload);
    } catch (e) {
      if (this.isQuotaError(e)) {
        // 容量超限：先淘汰一半最旧条目再重试一次
        this.evictOldest(Math.max(1, Math.floor(this.order.size / 2)));
        try {
          localStorage.setItem(storageKey, payload);
        } catch {
          // 重试仍失败：放弃 localStorage 落地，仅保留内存缓存（不影响主流程）
        }
      }
      // 其它错误（隐私模式等）静默忽略，内存缓存仍可用
    }
  }

  /** 判断是否为容量超限错误（兼容各浏览器命名） */
  private isQuotaError(e: unknown): boolean {
    if (!(e instanceof DOMException)) return false;
    return (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22
    );
  }

  /** 刷新 key 的访问时间戳（仅内存，持久化由 set/evict 统一处理） */
  private touch(key: string): void {
    this.order.set(key, Date.now());
  }

  /** 条目数超限时淘汰最旧 */
  private evictIfNeeded(): void {
    if (this.order.size <= this.maxEntries) return;
    this.evictOldest(this.order.size - this.maxEntries);
  }

  /** 淘汰 count 个最旧条目（时间戳最小者优先） */
  private evictOldest(count: number): void {
    if (count <= 0) return;
    // 按时间戳升序取出待淘汰的 key
    const entries = Array.from(this.order.entries()).sort((a, b) => a[1] - b[1]);
    const toRemove = entries.slice(0, count);
    for (const [key] of toRemove) {
      this.memory.delete(key);
      this.order.delete(key);
      try {
        localStorage.removeItem(this.storageKey(key));
      } catch {
        // 删除失败忽略
      }
    }
  }

  /** 从 localStorage 加载 LRU 索引 */
  private loadIndex(): void {
    try {
      const raw = localStorage.getItem(this.indexKey);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, number>;
      for (const [k, ts] of Object.entries(obj)) {
        if (typeof ts === 'number') this.order.set(k, ts);
      }
    } catch {
      // 索引加载失败：忽略，按空索引继续（不影响功能，仅淘汰顺序精度略降）
    }
  }

  /** 持久化 LRU 索引到 localStorage */
  private persistIndex(): void {
    try {
      const obj: Record<string, number> = {};
      for (const [k, ts] of this.order) obj[k] = ts;
      localStorage.setItem(this.indexKey, JSON.stringify(obj));
    } catch {
      // 索引写入失败（如容量超限）：忽略，索引仅在内存维护，不影响主流程
    }
  }
}
