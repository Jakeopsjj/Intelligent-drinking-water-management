/**
 * 设置模块契约（settings module contract）
 *
 * 职责：用户偏好、健康限额、头像、透析日程的存储与下发
 *
 * 对外暴露能力：
 * - useStore：状态订阅 hook（组件层使用）
 * - actions：状态变更操作（非组件代码使用）
 * - selectors：派生数据查询
 *
 * 发布事件：settings:* 三类
 * 订阅事件：无（设置模块是数据源头，不消费其他模块事件）
 */

import { useSettingsStore } from '@/store/useSettingsStore';
import { EVENT_NAMES } from '@/types/events';
import type { ModuleContract } from '../types';
import type { UserSettings } from '@/types';

/** 设置模块对外暴露的能力 */
export interface SettingsExports {
  /** React 组件层使用的状态订阅 hook */
  useStore: typeof useSettingsStore;
  /** 非 React 代码使用的 actions（直接操作 store） */
  actions: {
    updateSettings: (partial: Partial<UserSettings>) => void;
    resetSettings: () => void;
    setInitialized: () => void;
    setSettings: (settings: UserSettings) => void;
  };
  /** 派生 selectors（读取当前状态快照） */
  selectors: {
    getSettings: () => UserSettings;
    getDailyWaterLimit: () => number;
    getDailyFruitLimit: () => number;
    getDailyPotassiumLimit: () => number;
    getDailyPhosphorusLimit: () => number;
    getDailySodiumLimit: () => number;
  };
}

/** 配置热更新影响映射：字段 → 影响板块（供 effects 编排使用） */
export const SETTINGS_HOT_CONFIG: Record<string, readonly string[]> = {
  dailyWaterLimit: ['dashboard.water-metric', 'records.trend-chart'],
  dailyFruitLimit: ['dashboard.fruit-metric', 'fruits.list'],
  dailyPotassiumLimit: ['dashboard.potassium-metric', 'records.element-bar'],
  dailyPhosphorusLimit: ['dashboard.phosphorus-metric', 'records.element-bar'],
  dailySodiumLimit: ['dashboard.sodium-metric', 'records.element-bar'],
  userName: ['dashboard.greeting-card'],
  userAvatar: ['dashboard.greeting-card'],
  dialysisSchedule: ['dashboard.schedule-bar'],
};

/** 设置模块契约 */
export const settingsContract = {
  id: 'settings',
  name: '设置模块',
  responsibility: '用户偏好与健康限额的存储与下发',
  exposes: {
    useStore: useSettingsStore,
    actions: {
      updateSettings: (partial: Partial<UserSettings>) =>
        useSettingsStore.getState().updateSettings(partial),
      resetSettings: () => useSettingsStore.getState().resetSettings(),
      setInitialized: () => useSettingsStore.getState().setInitialized(),
      setSettings: (settings: UserSettings) =>
        useSettingsStore.getState().setSettings(settings),
    },
    selectors: {
      getSettings: () => useSettingsStore.getState().settings,
      getDailyWaterLimit: () =>
        useSettingsStore.getState().settings.dailyWaterLimit,
      getDailyFruitLimit: () =>
        useSettingsStore.getState().settings.dailyFruitLimit,
      getDailyPotassiumLimit: () =>
        useSettingsStore.getState().settings.dailyPotassiumLimit,
      getDailyPhosphorusLimit: () =>
        useSettingsStore.getState().settings.dailyPhosphorusLimit,
      getDailySodiumLimit: () =>
        useSettingsStore.getState().settings.dailySodiumLimit,
    },
  } satisfies SettingsExports,
  publishes: [
    EVENT_NAMES.SETTINGS_UPDATED,
    EVENT_NAMES.SETTINGS_RESET,
    EVENT_NAMES.SETTINGS_REPLACED,
  ] as const,
  subscribes: [] as const,
} satisfies ModuleContract<'settings', SettingsExports>;

export type SettingsContract = typeof settingsContract;
