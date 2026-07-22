/**
 * 服药计划 Store
 *
 * 管理每日服药计划（药名、时间、剂量）。
 * 数据变更通过事件总线广播至关联模块。
 * 通知调度由 notificationService 负责，在 App 启动和计划变更时触发。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MedicationPlanItem } from '@/types';
import { generateId } from '@/utils/calc';
import { nativeJSONStorage } from '@/lib/nativeStorage';
import { eventBus } from '@/lib/eventBus';
import { EVENT_NAMES } from '@/types/events';

interface MedicationPlanState {
  plans: MedicationPlanItem[];
  addPlan: (plan: Omit<MedicationPlanItem, 'id' | 'createdAt'>) => string;
  updatePlan: (id: string, updates: Partial<MedicationPlanItem>) => void;
  deletePlan: (id: string) => void;
  togglePlan: (id: string) => void;
  getEnabledPlans: () => MedicationPlanItem[];
  getPlanById: (id: string) => MedicationPlanItem | undefined;
}

export const useMedicationPlanStore = create<MedicationPlanState>()(
  persist(
    (set, get) => ({
      plans: [],

      addPlan: (plan) => {
        const newPlan: MedicationPlanItem = {
          ...plan,
          id: `plan-${generateId()}`,
          createdAt: Date.now(),
        };
        set((state) => {
          const plans = [...state.plans, newPlan];
          eventBus.emit(
            EVENT_NAMES.MEDICATION_PLAN_ADDED,
            { plan: newPlan, total: plans.length },
            'useMedicationPlanStore.addPlan'
          );
          return { plans };
        });
        return newPlan.id;
      },

      updatePlan: (id, updates) => {
        set((state) => {
          const plans = state.plans.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          );
          eventBus.emit(
            EVENT_NAMES.MEDICATION_PLAN_UPDATED,
            { id, updates },
            'useMedicationPlanStore.updatePlan'
          );
          return { plans };
        });
      },

      deletePlan: (id) => {
        set((state) => {
          const plans = state.plans.filter((p) => p.id !== id);
          eventBus.emit(
            EVENT_NAMES.MEDICATION_PLAN_DELETED,
            { id, total: plans.length },
            'useMedicationPlanStore.deletePlan'
          );
          return { plans };
        });
      },

      togglePlan: (id) => {
        set((state) => {
          const plans = state.plans.map((p) =>
            p.id === id ? { ...p, enabled: !p.enabled } : p
          );
          const updated = plans.find((p) => p.id === id);
          if (updated) {
            eventBus.emit(
              EVENT_NAMES.MEDICATION_PLAN_UPDATED,
              { id, updates: { enabled: updated.enabled } },
              'useMedicationPlanStore.togglePlan'
            );
          }
          return { plans };
        });
      },

      getEnabledPlans: () => get().plans.filter((p) => p.enabled),

      getPlanById: (id) => get().plans.find((p) => p.id === id),
    }),
    {
      name: 'dialysis_medication_plans',
      storage: nativeJSONStorage,
    }
  )
);
