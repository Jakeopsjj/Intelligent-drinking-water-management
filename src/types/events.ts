/**
 * 领域事件契约（标准化通信接口）
 *
 * 各业务模块（settings / records / fruits）数据变更时，
 * 通过事件总线发布对应事件；订阅该数据的其余模块自动消费、更新本地状态，
 * 保障全域关联数据一致性。
 */

import type { AnyRecord, Fruit, UserSettings } from './index';

/** 事件命名空间：`<板块>:<动作>`，便于按板块过滤订阅 */
export const EVENT_NAMES = {
  // 设置板块（配置热更新）
  SETTINGS_UPDATED: 'settings:updated',
  SETTINGS_RESET: 'settings:reset',
  SETTINGS_REPLACED: 'settings:replaced',

  // 记录板块（数据变更广播）
  RECORDS_WATER_ADDED: 'records:water-added',
  RECORDS_UF_ADDED: 'records:uf-added',
  RECORDS_FRUIT_ADDED: 'records:fruit-added',
  RECORDS_DELETED: 'records:deleted',
  RECORDS_CLEARED: 'records:cleared',
  RECORDS_REPLACED: 'records:replaced',
  RECORDS_MERGED: 'records:merged',

  // 水果库板块（库存变更广播）
  FRUITS_ADDED: 'fruits:added',
  FRUITS_DELETED: 'fruits:deleted',
  FRUITS_REPLACED: 'fruits:replaced',
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

/** 事件载荷契约 —— 每个事件携带的标准化数据 */
export interface EventPayloadMap {
  [EVENT_NAMES.SETTINGS_UPDATED]: {
    partial: Partial<UserSettings>;
    settings: UserSettings;
  };
  [EVENT_NAMES.SETTINGS_RESET]: {
    settings: UserSettings;
  };
  [EVENT_NAMES.SETTINGS_REPLACED]: {
    settings: UserSettings;
  };

  [EVENT_NAMES.RECORDS_WATER_ADDED]: {
    record: AnyRecord;
    total: number;
  };
  [EVENT_NAMES.RECORDS_UF_ADDED]: {
    record: AnyRecord;
    total: number;
  };
  [EVENT_NAMES.RECORDS_FRUIT_ADDED]: {
    record: AnyRecord;
    total: number;
  };
  [EVENT_NAMES.RECORDS_DELETED]: {
    id: string;
    total: number;
  };
  [EVENT_NAMES.RECORDS_CLEARED]: void;
  [EVENT_NAMES.RECORDS_REPLACED]: {
    total: number;
  };
  [EVENT_NAMES.RECORDS_MERGED]: {
    added: number;
    total: number;
  };

  [EVENT_NAMES.FRUITS_ADDED]: {
    fruit: Fruit;
    total: number;
  };
  [EVENT_NAMES.FRUITS_DELETED]: {
    id: string;
    total: number;
  };
  [EVENT_NAMES.FRUITS_REPLACED]: {
    total: number;
  };
}

/** 领域事件 envelope —— 统一包裹，便于可观测性和扩展 */
export interface DomainEvent<T extends EventName = EventName> {
  name: T;
  payload: EventPayloadMap[T];
  /** 事件发生时间戳 */
  timestamp: number;
  /** 触发来源（便于调试） */
  source?: string;
}
