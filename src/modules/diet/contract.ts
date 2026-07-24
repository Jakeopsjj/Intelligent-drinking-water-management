/**
 * 饮食模块契约（diet module contract）
 *
 * 职责：饮食板块中水果营养查询与重量换算
 *       复用水果库数据，提供按重量计算元素含量的能力
 *
 * 发布事件：无
 * 订阅事件：fruits:*（水果库变更时自动同步）
 */

import { useFruitsStore } from '@/store/useFruitsStore';
import { EVENT_NAMES } from '@/types/events';
import type { ModuleContract } from '../types';
import type { Fruit } from '@/types';

export type WeightUnit = 'g' | 'kg' | 'jin' | 'liang';

export interface WeightUnitInfo {
  key: WeightUnit;
  label: string;
  toGram: (value: number) => number;
  fromGram: (grams: number) => number;
}

export const WEIGHT_UNITS: WeightUnitInfo[] = [
  { key: 'g', label: '克 (g)', toGram: (v) => v, fromGram: (g) => g },
  { key: 'kg', label: '千克 (kg)', toGram: (v) => v * 1000, fromGram: (g) => g / 1000 },
  { key: 'jin', label: '斤', toGram: (v) => v * 500, fromGram: (g) => g / 500 },
  { key: 'liang', label: '两', toGram: (v) => v * 50, fromGram: (g) => g / 50 },
];

export interface CalculatedNutrients {
  weightGrams: number;
  potassiumMg: number;
  phosphorusMg: number;
  sodiumMg: number;
  waterMl: number;
  potassiumG: number;
  phosphorusG: number;
  sodiumG: number;
  waterG: number;
}

export function calculateNutrients(fruit: Fruit, weightGrams: number): CalculatedNutrients {
  const ratio = weightGrams / 100;
  const potassiumMg = Math.round(fruit.potassiumPer100g * ratio * 100) / 100;
  const phosphorusMg = Math.round(fruit.phosphorusPer100g * ratio * 100) / 100;
  const sodiumMg = Math.round(fruit.sodiumPer100g * ratio * 100) / 100;
  const waterMl = Math.round(fruit.waterPer100g * ratio * 100) / 100;
  return {
    weightGrams,
    potassiumMg,
    phosphorusMg,
    sodiumMg,
    waterMl,
    potassiumG: Math.round((potassiumMg / 1000) * 1000) / 1000,
    phosphorusG: Math.round((phosphorusMg / 1000) * 1000) / 1000,
    sodiumG: Math.round((sodiumMg / 1000) * 1000) / 1000,
    waterG: waterMl,
  };
}

export interface DietExports {
  useStore: typeof useFruitsStore;
  selectors: {
    allFruits: () => Fruit[];
    getFruitById: (id: string) => Fruit | undefined;
  };
  utils: {
    calculateNutrients: typeof calculateNutrients;
    WEIGHT_UNITS: typeof WEIGHT_UNITS;
  };
}

export const dietContract = {
  id: 'diet',
  name: '饮食模块',
  responsibility: '饮食板块水果营养查询与重量换算',
  exposes: {
    useStore: useFruitsStore,
    selectors: {
      allFruits: () => useFruitsStore.getState().allFruits(),
      getFruitById: (id: string) => useFruitsStore.getState().getFruitById(id),
    },
    utils: {
      calculateNutrients,
      WEIGHT_UNITS,
    },
  } satisfies DietExports,
  publishes: [] as const,
  subscribes: [
    EVENT_NAMES.FRUITS_ADDED,
    EVENT_NAMES.FRUITS_DELETED,
    EVENT_NAMES.FRUITS_REPLACED,
  ] as const,
} satisfies ModuleContract<'diet', DietExports>;

export type DietContract = typeof dietContract;
