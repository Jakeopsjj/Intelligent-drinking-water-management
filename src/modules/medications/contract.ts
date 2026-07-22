/**
 * 药物模块契约（medications module contract）
 *
 * 职责：药物库（内置 + 自定义）的存储、检索、增删
 *
 * 发布事件：medications:* 三类
 * 订阅事件：无（药物库是数据源头）
 */

import { useMedicationsStore } from '@/store/useMedicationsStore';
import { EVENT_NAMES } from '@/types/events';
import type { ModuleContract } from '../types';
import type { Medication } from '@/types';

export interface MedicationsExports {
  useStore: typeof useMedicationsStore;
  actions: {
    addMedication: (med: Omit<Medication, 'id' | 'isCustom'>) => void;
    deleteMedication: (id: string) => void;
    replaceCustomMedications: (meds: Medication[]) => void;
  };
  selectors: {
    allMedications: () => Medication[];
    getMedicationById: (id: string) => Medication | undefined;
    searchMedications: (query: string) => Medication[];
  };
}

export const medicationsContract = {
  id: 'medications',
  name: '药物库模块',
  responsibility: '透析患者用药库的存储与检索',
  exposes: {
    useStore: useMedicationsStore,
    actions: {
      addMedication: (med) => useMedicationsStore.getState().addMedication(med),
      deleteMedication: (id) =>
        useMedicationsStore.getState().deleteMedication(id),
      replaceCustomMedications: (meds) =>
        useMedicationsStore.getState().replaceCustomMedications(meds),
    },
    selectors: {
      allMedications: () => useMedicationsStore.getState().allMedications(),
      getMedicationById: (id) =>
        useMedicationsStore.getState().getMedicationById(id),
      searchMedications: (q) =>
        useMedicationsStore.getState().searchMedications(q),
    },
  } satisfies MedicationsExports,
  publishes: [
    EVENT_NAMES.MEDICATION_ADDED,
    EVENT_NAMES.MEDICATION_DELETED,
    EVENT_NAMES.MEDICATION_REPLACED,
  ] as const,
  subscribes: [] as const,
} satisfies ModuleContract<'medications', MedicationsExports>;

export type MedicationsContract = typeof medicationsContract;
