/**
 * 统一事件总线（Event Bus / Pub-Sub）
 *
 * 模块间依托标准化通信接口建立弱依赖，代码互不侵入。
 * 当任意业务模块数据发生变更时，触发数据事件广播，
 * 所有关联模块自动接收变更消息，完成本地数据实时刷新。
 *
 * 设计：
 * - 类型化：事件名 + 载荷由 types/events.ts 契约约束
 * - 轻量：纯内存实现，无第三方依赖
 * - 同步派发：emit 立即触发所有订阅者，便于副作用可预测
 * - 可观测：内置订阅日志（开发态），数据流可追溯
 */

import type { DomainEvent, EventName, EventPayloadMap } from '@/types/events';

type Handler<T extends EventName> = (event: DomainEvent<T>) => void;

class EventBus {
  private listeners: Map<EventName, Set<Handler<any>>> = new Map();
  /** 最近 N 条事件流，便于调试和未来扩展（如远程同步重放） */
  private recentEvents: DomainEvent<any>[] = [];
  private readonly MAX_RECENT = 50;

  /**
   * 订阅指定事件
   * @returns 取消订阅函数
   */
  on<T extends EventName>(name: T, handler: Handler<T>): () => void {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, new Set());
    }
    this.listeners.get(name)!.add(handler);
    return () => this.off(name, handler);
  }

  /** 取消订阅 */
  off<T extends EventName>(name: T, handler: Handler<T>): void {
    this.listeners.get(name)?.delete(handler);
  }

  /** 发布事件 —— 同步派发给所有订阅者 */
  emit<T extends EventName>(
    name: T,
    payload: EventPayloadMap[T],
    source?: string
  ): void {
    const event: DomainEvent<T> = {
      name,
      payload,
      timestamp: Date.now(),
      source,
    };

    // 入队最近事件流
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.MAX_RECENT) {
      this.recentEvents.shift();
    }

    // 开发态日志（可观测性）
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[eventBus] ${name}`, payload ?? '', source ? `← ${source}` : '');
    }

    // 拷贝一份避免订阅中再次订阅/取消导致迭代异常
    const handlers = Array.from(this.listeners.get(name) ?? []);
    for (const h of handlers) {
      try {
        h(event);
      } catch (err) {
        // 单个订阅者异常不应阻断其他订阅者
        // eslint-disable-next-line no-console
        console.error(`[eventBus] handler error on "${name}":`, err);
      }
    }
  }

  /** 获取最近事件流（调试/重放用） */
  getRecentEvents(): readonly DomainEvent<any>[] {
    return this.recentEvents;
  }

  /** 清空所有订阅（仅在测试或应用销毁时调用） */
  clear(): void {
    this.listeners.clear();
    this.recentEvents = [];
  }
}

/** 全局单例事件总线 */
export const eventBus = new EventBus();

/** 便于按板块订阅全部事件的工具 */
export function subscribeAll(
  names: EventName[],
  handler: Handler<any>
): () => void {
  const unsubs = names.map((n) => eventBus.on(n, handler));
  return () => unsubs.forEach((u) => u());
}
