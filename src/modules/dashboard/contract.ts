/**
 * 今日模块契约（dashboard module contract）
 *
 * 职责：今日总览、问候卡片、快速记录入口
 * 作为数据消费方，订阅 settings 与 records 事件实现配置热更新与数据联动
 *
 * 发布事件：无（今日模块是纯展示层，不产出数据）
 * 订阅事件：
 * - settings:* —— 配置热更新，限额/头像/透析日程变更即时生效
 * - records:* —— 数据变更广播，今日指标自动刷新
 * - fruits:* —— 水果库变更，水果选择器列表刷新
 */

import { EVENT_NAMES } from '@/types/events';
import type { ModuleContract } from '../types';

interface DashboardExports {
  /** 今日模块为纯展示层，暂不对外暴露业务能力 */
  readonly _kind: 'display-only';
}

export const dashboardContract = {
  id: 'dashboard',
  name: '今日模块',
  responsibility: '今日总览、问候卡片、快速记录入口',
  exposes: {
    _kind: 'display-only',
  } satisfies DashboardExports,
  publishes: [] as const,
  subscribes: [
    EVENT_NAMES.SETTINGS_UPDATED,
    EVENT_NAMES.SETTINGS_RESET,
    EVENT_NAMES.SETTINGS_REPLACED,
    EVENT_NAMES.RECORDS_WATER_ADDED,
    EVENT_NAMES.RECORDS_UF_ADDED,
    EVENT_NAMES.RECORDS_FRUIT_ADDED,
    EVENT_NAMES.RECORDS_MEDICATION_ADDED,
    EVENT_NAMES.RECORDS_DELETED,
    EVENT_NAMES.RECORDS_CLEARED,
    EVENT_NAMES.FRUITS_ADDED,
    EVENT_NAMES.FRUITS_DELETED,
    EVENT_NAMES.FRUITS_REPLACED,
    EVENT_NAMES.MEDICATION_ADDED,
    EVENT_NAMES.MEDICATION_DELETED,
    EVENT_NAMES.MEDICATION_REPLACED,
  ] as const,
} satisfies ModuleContract<'dashboard', DashboardExports>;

export type DashboardContract = typeof dashboardContract;
