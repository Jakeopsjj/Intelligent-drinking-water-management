/**
 * 跨模块副作用编排（Module Effects Orchestrator）
 *
 * 集中声明跨模块联动副作用：
 * - 当某模块发布事件时，触发其他模块的响应行为
 * - 副作用与组件解耦：组件不感知跨模块依赖
 *
 * 设计原则：
 * - 副作用集中可读、可追溯、可维护
 * - 显式声明"哪个模块事件 → 触发哪个模块行为"
 * - 单点订阅，避免散落在各组件中
 *
 * 当前已实现的跨模块联动：
 * 1. 配置热更新：settings:updated → 通知 dashboard 受影响板块刷新
 * 2. 配置重置：settings:reset → 通知所有依赖板块刷新
 * 3. 水果删除：fruits:deleted → 记录侧保留历史快照（记录侧仅做日志，不修改历史记录）
 */

import { eventBus } from '@/lib/eventBus';
import { EVENT_NAMES } from '@/types/events';
import { SETTINGS_HOT_CONFIG } from './settings';
import { getSubscribersOf } from './registry';

type Unsubscribe = () => void;

/**
 * 注册所有跨模块副作用
 * 在 App 根组件调用一次即可
 * @returns 取消注册函数（组件卸载时调用）
 */
export function registerModuleEffects(): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  // 1. 配置热更新：settings 字段变更 → 计算影响板块并广播可观测日志
  unsubs.push(
    eventBus.on(EVENT_NAMES.SETTINGS_UPDATED, (event) => {
      const { partial } = event.payload;
      const affected: string[] = [];
      for (const field of Object.keys(partial)) {
        const boards = SETTINGS_HOT_CONFIG[field];
        if (boards?.length) affected.push(...boards);
      }
      if (affected.length && import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info(
          `[effects] 配置热更新 → 影响板块：${Array.from(new Set(affected)).join('、')}`,
          partial
        );
      }
    })
  );

  // 2. 配置重置：通知所有依赖 settings 的模块刷新
  unsubs.push(
    eventBus.on(EVENT_NAMES.SETTINGS_RESET, () => {
      const subscribers = getSubscribersOf(EVENT_NAMES.SETTINGS_RESET);
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info(
          `[effects] 配置已重置 → 通知模块：${subscribers.join('、') || '无'}`
        );
      }
    })
  );

  // 3. 数据变更可观测性：记录板块事件 → 影响订阅方
  const recordEvents = [
    EVENT_NAMES.RECORDS_WATER_ADDED,
    EVENT_NAMES.RECORDS_UF_ADDED,
    EVENT_NAMES.RECORDS_FRUIT_ADDED,
    EVENT_NAMES.RECORDS_DELETED,
    EVENT_NAMES.RECORDS_CLEARED,
  ];
  for (const evt of recordEvents) {
    unsubs.push(
      eventBus.on(evt, (event) => {
        const subs = getSubscribersOf(evt);
        if (import.meta.env.DEV && subs.length) {
          // eslint-disable-next-line no-console
          console.debug(
            `[effects] ${event.name} → 通知模块：${subs.join('、')}`,
            `total=${(event.payload as any)?.total ?? '-'}`
          );
        }
      })
    );
  }

  // 4. 水果库变更 → 订阅方通知（今日页水果选择器、水果页列表）
  const fruitEvents = [
    EVENT_NAMES.FRUITS_ADDED,
    EVENT_NAMES.FRUITS_DELETED,
    EVENT_NAMES.FRUITS_REPLACED,
  ];
  for (const evt of fruitEvents) {
    unsubs.push(
      eventBus.on(evt, (event) => {
        const subs = getSubscribersOf(evt);
        if (import.meta.env.DEV && subs.length) {
          // eslint-disable-next-line no-console
          console.debug(
            `[effects] ${event.name} → 通知模块：${subs.join('、')}`,
            `total=${(event.payload as any)?.total ?? '-'}`
          );
        }
      })
    );
  }

  // 5. 药物库变更 → 订阅方通知（今日页药物选择器、药物页列表）
  const medicationEvents = [
    EVENT_NAMES.MEDICATION_ADDED,
    EVENT_NAMES.MEDICATION_DELETED,
    EVENT_NAMES.MEDICATION_REPLACED,
  ];
  for (const evt of medicationEvents) {
    unsubs.push(
      eventBus.on(evt, (event) => {
        const subs = getSubscribersOf(evt);
        if (import.meta.env.DEV && subs.length) {
          // eslint-disable-next-line no-console
          console.debug(
            `[effects] ${event.name} → 通知模块：${subs.join('、')}`,
            `total=${(event.payload as any)?.total ?? '-'}`
          );
        }
      })
    );
  }

  // 6. 服药记录变更 → 通知今日页药物次数刷新
  unsubs.push(
    eventBus.on(EVENT_NAMES.RECORDS_MEDICATION_ADDED, (event) => {
      const subs = getSubscribersOf(EVENT_NAMES.RECORDS_MEDICATION_ADDED);
      if (import.meta.env.DEV && subs.length) {
        // eslint-disable-next-line no-console
        console.debug(
          `[effects] ${event.name} → 通知模块：${subs.join('、')}`,
          `total=${event.payload.total}`
        );
      }
    })
  );

  return () => unsubs.forEach((u) => u());
}
