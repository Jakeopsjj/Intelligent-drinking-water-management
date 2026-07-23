/**
 * 药物库 Store
 *
 * 管理内置药物 + 自定义药物。
 * 数据变更通过事件总线广播至关联模块（dashboard 等）。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Medication } from '@/types';
import { BUILTIN_MEDICATIONS } from '@/data/medications';
import { generateId } from '@/utils/calc';
import { nativeJSONStorage } from '@/lib/nativeStorage';
import { eventBus } from '@/lib/eventBus';
import { EVENT_NAMES } from '@/types/events';

interface MedicationsState {
  builtinMedications: Medication[];
  customMedications: Medication[];
  addMedication: (
    med: Omit<Medication, 'id' | 'isCustom'>
  ) => void;
  deleteMedication: (id: string) => void;
  replaceCustomMedications: (meds: Medication[]) => void;
  allMedications: () => Medication[];
  getMedicationById: (id: string) => Medication | undefined;
  searchMedications: (query: string) => Medication[];
}

export const useMedicationsStore = create<MedicationsState>()(
  persist(
    (set, get) => ({
      builtinMedications: BUILTIN_MEDICATIONS,
      customMedications: [],

      addMedication: (med) => {
        const newMed: Medication = {
          ...med,
          id: `custom-med-${generateId()}`,
          isCustom: true,
        };
        set((state) => {
          // 去重：同名药物先删旧的，再加新的（避免 persist 旧数据干扰）
          const filtered = state.customMedications.filter(
            (m) => m.name !== med.name
          );
          const customMedications = [...filtered, newMed];
          eventBus.emit(
            EVENT_NAMES.MEDICATION_ADDED,
            { medication: newMed, total: customMedications.length },
            'useMedicationsStore.addMedication'
          );
          return { customMedications };
        });
      },

      deleteMedication: (id) => {
        set((state) => {
          const customMedications = state.customMedications.filter(
            (m) => m.id !== id
          );
          eventBus.emit(
            EVENT_NAMES.MEDICATION_DELETED,
            { id, total: customMedications.length },
            'useMedicationsStore.deleteMedication'
          );
          return { customMedications };
        });
      },

      replaceCustomMedications: (meds) => {
        const custom = meds.filter((m) => m.isCustom || m.id.startsWith('custom-med-'));
        set(() => {
          eventBus.emit(
            EVENT_NAMES.MEDICATION_REPLACED,
            { total: custom.length },
            'useMedicationsStore.replaceCustomMedications'
          );
          return { customMedications: custom };
        });
      },

      allMedications: () => {
        const { customMedications, builtinMedications } = get();
        return [...customMedications, ...builtinMedications];
      },

      getMedicationById: (id) => get().allMedications().find((m) => m.id === id),

      searchMedications: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return get().allMedications();
        return get()
          .allMedications()
          .filter(
            (m) =>
              m.name.toLowerCase().includes(q) ||
              m.purpose?.toLowerCase().includes(q)
          );
      },
    }),
    {
      name: 'dialysis_medications',
      storage: nativeJSONStorage,
      // 只持久化自定义药物，内置药物每次从代码加载
      partialize: (state) => ({ customMedications: state.customMedications }),
    }
  )
);
