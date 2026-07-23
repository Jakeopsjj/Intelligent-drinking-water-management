import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Fruit } from '@/types';
import { BUILTIN_FRUITS } from '@/data/fruits';
import { generateId, getLevelFromPotassium } from '@/utils/calc';
import { nativeJSONStorage } from '@/lib/nativeStorage';
import { eventBus } from '@/lib/eventBus';
import { EVENT_NAMES } from '@/types/events';

interface FruitsState {
  // 内置水果（仅用于展示，不可修改）
  fruits: Fruit[];
  // 用户自定义水果（持久化）
  customFruits: Fruit[];
  addFruit: (fruit: Omit<Fruit, 'id' | 'isCustom' | 'level'>) => void;
  deleteFruit: (id: string) => void;
  replaceCustomFruits: (fruits: Fruit[]) => void;
  getFruitById: (id: string) => Fruit | undefined;
  allFruits: () => Fruit[];
  searchFruits: (query: string) => Fruit[];
}

export const useFruitsStore = create<FruitsState>()(
  persist(
    (set, get) => ({
      fruits: BUILTIN_FRUITS,
      customFruits: [],
      addFruit: (fruit) => {
        const newFruit: Fruit = {
          ...fruit,
          id: `custom-${generateId()}`,
          level: getLevelFromPotassium(fruit.potassiumPer100g),
          isCustom: true,
        };
        set((state) => {
          // 去重：同名水果先删旧的，再加新的（避免 persist 旧数据干扰）
          const filtered = state.customFruits.filter(
            (f) => f.name !== fruit.name
          );
          const customFruits = [...filtered, newFruit];
          // 库存变更广播：水果选择器、水果页列表等订阅后即时刷新
          eventBus.emit(
            EVENT_NAMES.FRUITS_ADDED,
            { fruit: newFruit, total: customFruits.length },
            'useFruitsStore.addFruit'
          );
          return { customFruits };
        });
      },
      deleteFruit: (id) => {
        set((state) => {
          const customFruits = state.customFruits.filter((f) => f.id !== id);
          eventBus.emit(
            EVENT_NAMES.FRUITS_DELETED,
            { id, total: customFruits.length },
            'useFruitsStore.deleteFruit'
          );
          return { customFruits };
        });
      },
      replaceCustomFruits: (fruits) => {
        const custom = fruits.filter((f) => f.isCustom || f.id.startsWith('custom-'));
        set(() => {
          eventBus.emit(
            EVENT_NAMES.FRUITS_REPLACED,
            { total: custom.length },
            'useFruitsStore.replaceCustomFruits'
          );
          return { customFruits: custom };
        });
      },
      getFruitById: (id) => {
        const state = get();
        return (
          state.customFruits.find((f) => f.id === id) ||
          state.fruits.find((f) => f.id === id)
        );
      },
      allFruits: () => {
        const state = get();
        return [...state.customFruits, ...state.fruits];
      },
      searchFruits: (query) => {
        const all = get().allFruits();
        if (!query.trim()) return all;
        const q = query.toLowerCase().trim();
        return all.filter((f) => f.name.toLowerCase().includes(q));
      },
    }),
    {
      name: 'dialysis_fruits',
      partialize: (state) => ({ customFruits: state.customFruits }),
      storage: nativeJSONStorage,
      merge: (persistedState, currentState) => {
        const oldCustomFruits = (persistedState as Partial<FruitsState>)?.customFruits ?? [];
        // 去重：同名保留最新
        const seen = new Set<string>();
        const deduped: Fruit[] = [];
        for (let i = oldCustomFruits.length - 1; i >= 0; i--) {
          if (!seen.has(oldCustomFruits[i].name)) {
            seen.add(oldCustomFruits[i].name);
            deduped.unshift(oldCustomFruits[i]);
          }
        }
        return { ...currentState, customFruits: deduped };
      },
    }
  )
);
