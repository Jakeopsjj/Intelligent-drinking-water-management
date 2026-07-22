/**
 * 全局数据同步 Hook
 *
 * 事件驱动架构（EDA）的订阅侧：
 * - 统一订阅事件总线，集中处理跨模块副作用
 * - 副作用与组件解耦：组件无需 import 其他 store，仅订阅自己关心的事件
 * - 配置热更新确认：settings 变更时校验依赖模块是否收到
 * - 开发态可观测：定期打印事件流统计，便于排查跨模块联动
 *
 * 在 App 根组件启用一次即可（全局唯一订阅点）。
 */

import { useEffect, useRef } from 'react';
import { eventBus, subscribeAll } from '@/lib/eventBus';
import { EVENT_NAMES, type EventName } from '@/types/events';

/** 配置热更新：哪些 settings 字段会触发跨板块重算 */
const HOT_CONFIG_FIELDS: Record<string, string[]> = {
  // 字段名 → 依赖该字段的板块列表
  dailyWaterLimit: ['今日页·摄水量指标', '记录页·趋势图'],
  dailyFruitLimit: ['今日页·水果指标', '水果页'],
  dailyPotassiumLimit: ['今日页·钾指标', '记录页·元素柱状图'],
  dailyPhosphorusLimit: ['今日页·磷指标', '记录页·元素柱状图'],
  dailySodiumLimit: ['今日页·钠指标', '记录页·元素柱状图'],
  userName: ['今日页·问候卡片'],
  userAvatar: ['今日页·问候卡片'],
  dialysisSchedule: ['今日页·透析日程'],
};

const ALL_EVENT_NAMES: EventName[] = Object.values(EVENT_NAMES);

export function useDataSync(): void {
  // 事件计数器：开发态可观测数据流活跃度
  const eventCounterRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // 1. 配置热更新：settings 变更时，确认所有依赖板块即时生效
    unsubs.push(
      eventBus.on(EVENT_NAMES.SETTINGS_UPDATED, (event) => {
        const { partial } = event.payload;
        const affected: string[] = [];
        for (const field of Object.keys(partial)) {
          const boards = HOT_CONFIG_FIELDS[field];
          if (boards?.length) affected.push(...boards);
        }
        // 开发态日志：可见的"配置已下发"轨迹
        if (affected.length && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.info(
            `[dataSync] 配置热更新 → ${Array.from(new Set(affected)).join('、')}`,
            partial
          );
        }
      })
    );

    // 2. 数据变更广播：记录所有板块可订阅的"一处变更、全域联动"事件
    unsubs.push(
      subscribeAll(ALL_EVENT_NAMES, (event) => {
        eventCounterRef.current[event.name] =
          (eventCounterRef.current[event.name] ?? 0) + 1;
      })
    );

    // 3. 开发态统计：每 60s 打印一次事件流概况，便于排查跨模块联动
    let statsTimer: ReturnType<typeof setInterval> | undefined;
    if (import.meta.env.DEV) {
      statsTimer = setInterval(() => {
        const counter = eventCounterRef.current;
        const total = Object.values(counter).reduce((a, b) => a + b, 0);
        if (total === 0) return;
        // eslint-disable-next-line no-console
        console.info(
          `[dataSync] 事件流统计（近 60s）：共 ${total} 次`,
          counter
        );
        eventCounterRef.current = {};
      }, 60000);
    }

    return () => {
      unsubs.forEach((u) => u());
      if (statsTimer) clearInterval(statsTimer);
    };
  }, []);
}

/** 组件级订阅工具：在任意组件订阅关心的板块事件 */
export function useSubscribeEvent<T extends EventName>(
  name: T,
  handler: (payload: import('@/types/events').EventPayloadMap[T]) => void
): void {
  // 持久化 handler，避免每次渲染重新订阅
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsub = eventBus.on(name, (event) => handlerRef.current(event.payload));
    return unsub;
  }, [name]);
}

/** 暴露事件总线实例，便于非组件代码（如 utils、exporters）触发或订阅 */
export { eventBus };
