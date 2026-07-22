/**
 * 记录模块契约（records module contract）
 *
 * 职责：饮水/超滤/水果摄入记录的存储、查询、聚合统计
 *
 * 发布事件：records:* 七类
 * 订阅事件：
 * - fruits:deleted —— 水果被删除时，仅清理展示态（记录本身保留历史快照）
 */

import { useRecordsStore } from '@/store/useRecordsStore';
import { EVENT_NAMES } from '@/types/events';
import type { ModuleContract } from '../types';
import type { AnyRecord, DailyMetrics, HourlyDistribution } from '@/types';

export interface RecordsExports {
  useStore: typeof useRecordsStore;
  actions: {
    addWaterRecord: (input: { amount: number; timestamp?: number }) => void;
    addUltrafiltrationRecord: (input: {
      amount: number;
      timestamp?: number;
    }) => void;
    addFruitRecord: (input: {
      fruit: import('@/types').Fruit;
      weight: number;
      timestamp?: number;
    }) => void;
    addMedicationRecord: (input: {
      medication: import('@/types').Medication;
      dose?: number;
      timesOfDay?: string;
      note?: string;
      timestamp?: number;
    }) => void;
    deleteRecord: (id: string) => void;
    clearAll: () => void;
  };
  selectors: {
    getTodayRecords: () => AnyRecord[];
    getTodayMetrics: () => DailyMetrics;
    getDailyMetrics: (dateKey: string) => DailyMetrics;
    getHourlyDistribution: (dateKey: string) => HourlyDistribution[];
    getTodayMedicationCount: () => number;
  };
}

export const recordsContract = {
  id: 'records',
  name: '记录模块',
  responsibility: '饮水/超滤/水果摄入记录的存储与统计',
  exposes: {
    useStore: useRecordsStore,
    actions: {
      addWaterRecord: (input) => useRecordsStore.getState().addWaterRecord(input),
      addUltrafiltrationRecord: (input) =>
        useRecordsStore.getState().addUltrafiltrationRecord(input),
      addFruitRecord: (input) =>
        useRecordsStore.getState().addFruitRecord(input),
      addMedicationRecord: (input) =>
        useRecordsStore.getState().addMedicationRecord(input),
      deleteRecord: (id) => useRecordsStore.getState().deleteRecord(id),
      clearAll: () => useRecordsStore.getState().clearAll(),
    },
    selectors: {
      getTodayRecords: () => useRecordsStore.getState().getTodayRecords(),
      getTodayMetrics: () => useRecordsStore.getState().getTodayMetrics(),
      getDailyMetrics: (dateKey) =>
        useRecordsStore.getState().getDailyMetrics(dateKey),
      getHourlyDistribution: (dateKey) =>
        useRecordsStore.getState().getHourlyDistribution(dateKey),
      getTodayMedicationCount: () =>
        useRecordsStore.getState().getTodayMedicationCount(),
    },
  } satisfies RecordsExports,
  publishes: [
    EVENT_NAMES.RECORDS_WATER_ADDED,
    EVENT_NAMES.RECORDS_UF_ADDED,
    EVENT_NAMES.RECORDS_FRUIT_ADDED,
    EVENT_NAMES.RECORDS_MEDICATION_ADDED,
    EVENT_NAMES.RECORDS_DELETED,
    EVENT_NAMES.RECORDS_CLEARED,
    EVENT_NAMES.RECORDS_REPLACED,
    EVENT_NAMES.RECORDS_MERGED,
  ] as const,
  subscribes: [] as const,
} satisfies ModuleContract<'records', RecordsExports>;

export type RecordsContract = typeof recordsContract;
