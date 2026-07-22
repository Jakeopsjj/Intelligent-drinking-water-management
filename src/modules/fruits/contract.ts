/**
 * 水果模块契约（fruits module contract）
 *
 * 职责：水果元素含量库（内置 + 自定义）的存储、检索、增删
 *
 * 发布事件：fruits:* 三类
 * 订阅事件：无
 */

import { useFruitsStore } from '@/store/useFruitsStore';
import { EVENT_NAMES } from '@/types/events';
import type { ModuleContract } from '../types';
import type { Fruit } from '@/types';

export interface FruitsExports {
  useStore: typeof useFruitsStore;
  actions: {
    addFruit: (fruit: Omit<Fruit, 'id' | 'isCustom' | 'level'>) => void;
    deleteFruit: (id: string) => void;
    replaceCustomFruits: (fruits: Fruit[]) => void;
  };
  selectors: {
    allFruits: () => Fruit[];
    getFruitById: (id: string) => Fruit | undefined;
    searchFruits: (query: string) => Fruit[];
  };
}

export const fruitsContract = {
  id: 'fruits',
  name: '水果库模块',
  responsibility: '水果元素含量库的存储与检索',
  exposes: {
    useStore: useFruitsStore,
    actions: {
      addFruit: (fruit) => useFruitsStore.getState().addFruit(fruit),
      deleteFruit: (id) => useFruitsStore.getState().deleteFruit(id),
      replaceCustomFruits: (fruits) =>
        useFruitsStore.getState().replaceCustomFruits(fruits),
    },
    selectors: {
      allFruits: () => useFruitsStore.getState().allFruits(),
      getFruitById: (id) => useFruitsStore.getState().getFruitById(id),
      searchFruits: (query) => useFruitsStore.getState().searchFruits(query),
    },
  } satisfies FruitsExports,
  publishes: [
    EVENT_NAMES.FRUITS_ADDED,
    EVENT_NAMES.FRUITS_DELETED,
    EVENT_NAMES.FRUITS_REPLACED,
  ] as const,
  subscribes: [] as const,
} satisfies ModuleContract<'fruits', FruitsExports>;

export type FruitsContract = typeof fruitsContract;
