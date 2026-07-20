import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Fruit } from '@/types';
import { BUILTIN_FRUITS } from '@/data/fruits';
import { generateId, getLevelFromPotassium } from '@/utils/calc';

interface FruitsState {
  // 内置水果（仅用于展示，不可修改）
  fruits: Fruit[];
  // 用户自定义水果（持久化）
  customFruits: Fruit[];
  addFruit: (fruit: Omit<Fruit, 'id' | 'isCustom' | 'level'>) => void;
  deleteFruit: (id: string) => void;
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
        set((state) => ({
          customFruits: [...state.customFruits, newFruit],
        }));
      },
      deleteFruit: (id) => {
        set((state) => ({
          customFruits: state.customFruits.filter((f) => f.id !== id),
        }));
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
    }
  )
);
