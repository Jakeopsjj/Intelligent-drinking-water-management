import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnyRecord, WaterRecord, UltrafiltrationRecord, FruitRecord, MedicationRecord, Fruit, Medication, DailyMetrics, HourlyDistribution } from '@/types';
import { generateId, calculatePotassium, calculatePhosphorus, calculateSodium, calculateWater } from '@/utils/calc';
import { getTodayKey, getDayRange } from '@/utils/date';
import { nativeJSONStorage } from '@/lib/nativeStorage';
import { eventBus } from '@/lib/eventBus';
import { EVENT_NAMES } from '@/types/events';

interface AddWaterInput {
  amount: number;
  timestamp?: number;
}

interface AddUltrafiltrationInput {
  amount: number;
  timestamp?: number;
}

interface AddFruitInput {
  fruit: Fruit;
  weight: number;
  timestamp?: number;
}

interface AddMedicationInput {
  medication: Medication;
  dose?: number;
  timesOfDay?: string;
  note?: string;
  timestamp?: number;
}

interface RecordsState {
  records: AnyRecord[];
  addWaterRecord: (input: AddWaterInput) => void;
  addUltrafiltrationRecord: (input: AddUltrafiltrationInput) => void;
  addFruitRecord: (input: AddFruitInput) => void;
  addMedicationRecord: (input: AddMedicationInput) => void;
  deleteRecord: (id: string) => void;
  replaceAll: (records: AnyRecord[]) => void;
  mergeRecords: (records: AnyRecord[]) => number;
  getRecordsByDate: (dateKey: string) => AnyRecord[];
  getTodayRecords: () => AnyRecord[];
  getDailyMetrics: (dateKey: string) => DailyMetrics;
  getTodayMetrics: () => DailyMetrics;
  getRangeMetrics: (dateKeys: string[]) => DailyMetrics[];
  getHourlyDistribution: (dateKey: string) => HourlyDistribution[];
  getTodayMedicationCount: () => number;
  clearAll: () => void;
}

export const useRecordsStore = create<RecordsState>()(
  persist(
    (set, get) => ({
      records: [],

      addWaterRecord: ({ amount, timestamp = Date.now() }) => {
        const record: WaterRecord = {
          id: generateId(),
          timestamp,
          type: 'water',
          amount: Math.max(0, Math.round(amount)),
        };
        set((state) => {
          const records = [...state.records, record];
          // 数据事件广播：关联模块（今日页指标、记录页趋势图等）订阅后实时刷新
          eventBus.emit(
            EVENT_NAMES.RECORDS_WATER_ADDED,
            { record, total: records.length },
            'useRecordsStore.addWaterRecord'
          );
          return { records };
        });
      },

      addUltrafiltrationRecord: ({ amount, timestamp = Date.now() }) => {
        const record: UltrafiltrationRecord = {
          id: generateId(),
          timestamp,
          type: 'ultrafiltration',
          amount: Math.max(0, Math.round(amount)),
        };
        set((state) => {
          const records = [...state.records, record];
          eventBus.emit(
            EVENT_NAMES.RECORDS_UF_ADDED,
            { record, total: records.length },
            'useRecordsStore.addUltrafiltrationRecord'
          );
          return { records };
        });
      },

      addFruitRecord: ({ fruit, weight, timestamp = Date.now() }) => {
        const record: FruitRecord = {
          id: generateId(),
          timestamp,
          type: 'fruit',
          fruitId: fruit.id,
          fruitName: fruit.name,
          fruitEmoji: fruit.emoji,
          weight: Math.max(0, Math.round(weight)),
          potassium: calculatePotassium(fruit, weight),
          phosphorus: calculatePhosphorus(fruit, weight),
          sodium: calculateSodium(fruit, weight),
          water: calculateWater(fruit, weight),
        };
        set((state) => {
          const records = [...state.records, record];
          eventBus.emit(
            EVENT_NAMES.RECORDS_FRUIT_ADDED,
            { record, total: records.length },
            'useRecordsStore.addFruitRecord'
          );
          return { records };
        });
      },

      addMedicationRecord: ({
        medication,
        dose,
        timesOfDay,
        note,
        timestamp = Date.now(),
      }) => {
        const record: MedicationRecord = {
          id: generateId(),
          timestamp,
          type: 'medication',
          medicationId: medication.id,
          medicationName: medication.name,
          medicationEmoji: medication.emoji,
          dose: dose ?? medication.usage.defaultDose,
          unit: medication.usage.unit,
          timesOfDay,
          note: note ?? medication.usage.timing,
        };
        set((state) => {
          const records = [...state.records, record];
          eventBus.emit(
            EVENT_NAMES.RECORDS_MEDICATION_ADDED,
            { record, total: records.length },
            'useRecordsStore.addMedicationRecord'
          );
          return { records };
        });
      },

      deleteRecord: (id) => {
        set((state) => {
          const records = state.records.filter((r) => r.id !== id);
          eventBus.emit(
            EVENT_NAMES.RECORDS_DELETED,
            { id, total: records.length },
            'useRecordsStore.deleteRecord'
          );
          return { records };
        });
      },

      replaceAll: (records) => {
        const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
        set(() => {
          eventBus.emit(
            EVENT_NAMES.RECORDS_REPLACED,
            { total: sorted.length },
            'useRecordsStore.replaceAll'
          );
          return { records: sorted };
        });
      },

      mergeRecords: (incoming) => {
        const existing = get().records;
        const existingIds = new Set(existing.map((r) => r.id));
        const newOnes = incoming.filter((r) => !existingIds.has(r.id));
        if (newOnes.length === 0) return 0;
        const merged = [...existing, ...newOnes].sort((a, b) => a.timestamp - b.timestamp);
        set(() => {
          eventBus.emit(
            EVENT_NAMES.RECORDS_MERGED,
            { added: newOnes.length, total: merged.length },
            'useRecordsStore.mergeRecords'
          );
          return { records: merged };
        });
        return newOnes.length;
      },

      getRecordsByDate: (dateKey) => {
        const [start, end] = getDayRange(dateKey);
        return get()
          .records.filter((r) => r.timestamp >= start && r.timestamp <= end)
          .sort((a, b) => b.timestamp - a.timestamp);
      },

      getTodayRecords: () => get().getRecordsByDate(getTodayKey()),

      getDailyMetrics: (dateKey) => {
        const records = get().getRecordsByDate(dateKey);
        const metrics: DailyMetrics = {
          date: dateKey,
          water: 0,
          ultrafiltration: 0,
          fruit: 0,
          potassium: 0,
          phosphorus: 0,
          sodium: 0,
          fruitWater: 0,
          medicationCount: 0,
          records,
        };
        for (const r of records) {
          if (r.type === 'water') metrics.water += r.amount;
          else if (r.type === 'ultrafiltration') metrics.ultrafiltration += r.amount;
          else if (r.type === 'fruit') {
            metrics.fruit += r.weight;
            metrics.potassium += r.potassium;
            metrics.phosphorus += r.phosphorus;
            metrics.sodium += r.sodium;
            metrics.fruitWater += r.water;
            metrics.water += r.water;
          } else if (r.type === 'medication') {
            metrics.medicationCount += 1;
          }
        }
        return metrics;
      },

      getTodayMetrics: () => get().getDailyMetrics(getTodayKey()),

      getTodayMedicationCount: () => get().getTodayMetrics().medicationCount,

      getRangeMetrics: (dateKeys) => {
        return dateKeys.map((k) => get().getDailyMetrics(k));
      },

      getHourlyDistribution: (dateKey) => {
        const records = get().getRecordsByDate(dateKey);
        const hours: HourlyDistribution[] = [];
        for (let h = 6; h <= 22; h++) {
          const hourStr = `${String(h).padStart(2, '0')}时`;
          const amount = records
            .filter((r) => r.type === 'water' && new Date(r.timestamp).getHours() === h)
            .reduce((sum, r) => sum + (r.type === 'water' ? r.amount : 0), 0);
          hours.push({ hour: hourStr, amount });
        }
        return hours;
      },

      clearAll: () =>
        set(() => {
          eventBus.emit(
            EVENT_NAMES.RECORDS_CLEARED,
            undefined,
            'useRecordsStore.clearAll'
          );
          return { records: [] };
        }),
    }),
    {
      name: 'dialysis_records',
      storage: nativeJSONStorage,
    }
  )
);
