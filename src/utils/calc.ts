import type { Fruit, PotassiumLevel, AnyRecord, DailyMetrics, HourlyDistribution } from '@/types';
import { getDayRange } from '@/utils/date';

// 根据钾含量推算等级
export function getLevelFromPotassium(potassiumPer100g: number): PotassiumLevel {
  if (potassiumPer100g < 150) return 'low';
  if (potassiumPer100g < 200) return 'medium';
  return 'high';
}

// 计算水果摄入产生的钾量
export function calculatePotassium(fruit: Fruit, weightGram: number): number {
  return Math.round((fruit.potassiumPer100g * weightGram) / 100);
}

// 计算水果摄入产生的磷量
export function calculatePhosphorus(fruit: Fruit, weightGram: number): number {
  return Math.round((fruit.phosphorusPer100g * weightGram) / 100);
}

// 计算水果摄入产生的钠量
export function calculateSodium(fruit: Fruit, weightGram: number): number {
  return Math.round((fruit.sodiumPer100g * weightGram) / 100);
}

// 计算水果摄入产生的水分量（ml）
export function calculateWater(fruit: Fruit, weightGram: number): number {
  return Math.round((fruit.waterPer100g * weightGram) / 100);
}

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// 等级文本映射
export const LEVEL_TEXT: Record<PotassiumLevel, string> = {
  low: '低钾',
  medium: '中钾',
  high: '高钾',
};

// 等级颜色映射
export const LEVEL_COLORS: Record<PotassiumLevel, { bg: string; text: string; ring: string }> = {
  low: { bg: 'bg-sage-100', text: 'text-sage-600', ring: 'ring-sage-200' },
  medium: { bg: 'bg-clay-100', text: 'text-clay-600', ring: 'ring-clay-200' },
  high: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200' },
};

// 进度状态：正常、警告、超标
export function getProgressStatus(current: number, limit: number): 'normal' | 'warning' | 'exceeded' {
  if (limit <= 0) return 'normal';
  const ratio = current / limit;
  if (ratio >= 1) return 'exceeded';
  if (ratio >= 0.8) return 'warning';
  return 'normal';
}

// 进度条颜色
export function getProgressColor(status: 'normal' | 'warning' | 'exceeded'): string {
  switch (status) {
    case 'exceeded':
      return 'text-red-500';
    case 'warning':
      return 'text-clay-400';
    default:
      return 'text-teal-500';
  }
}

// 环形进度条颜色（用于 SVG stroke）
export function getProgressStroke(status: 'normal' | 'warning' | 'exceeded'): string {
  switch (status) {
    case 'exceeded':
      return '#EF4444';
    case 'warning':
      return '#D97757';
    default:
      return '#2D5F5D';
  }
}

// 格式化数值显示
export function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

// 将克转换为千克显示字符串：1250 -> "1.25 kg"，300 -> "0.3 kg"
export function formatWeightKg(grams: number): string {
  if (!Number.isFinite(grams)) return '0 kg';
  const kg = grams / 1000;
  // 去除多余尾零：保留最多 2 位小数
  const str = kg.toFixed(2).replace(/\.?0+$/, '');
  return `${str} kg`;
}

// 按日期筛选记录（纯函数）
export function getRecordsByDate(records: AnyRecord[], dateKey: string): AnyRecord[] {
  const [start, end] = getDayRange(dateKey);
  return records
    .filter((r) => r.timestamp >= start && r.timestamp <= end)
    .sort((a, b) => b.timestamp - a.timestamp);
}

// 计算单日指标（纯函数）
export function getDailyMetrics(records: AnyRecord[], dateKey: string): DailyMetrics {
  const dayRecords = getRecordsByDate(records, dateKey);
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
    records: dayRecords,
  };
  for (const r of dayRecords) {
    if (r.type === 'water') metrics.water += r.amount;
    else if (r.type === 'ultrafiltration') metrics.ultrafiltration += r.amount;
    else if (r.type === 'fruit') {
      metrics.fruit += r.weight;
      metrics.potassium += r.potassium;
      metrics.phosphorus += r.phosphorus;
      metrics.sodium += r.sodium;
      // 水果水分计入总摄水量，并单独记录 fruitWater
      metrics.fruitWater += r.water;
      metrics.water += r.water;
    } else if (r.type === 'medication') {
      metrics.medicationCount += 1;
    }
  }
  return metrics;
}

// 计算饮水时段分布（纯函数）
export function getHourlyDistribution(records: AnyRecord[], dateKey: string): HourlyDistribution[] {
  const dayRecords = getRecordsByDate(records, dateKey);
  const hours: HourlyDistribution[] = [];
  for (let h = 6; h <= 22; h++) {
    const hourStr = `${String(h).padStart(2, '0')}时`;
    const amount = dayRecords
      .filter((r) => r.type === 'water' && new Date(r.timestamp).getHours() === h)
      .reduce((sum, r) => sum + (r.type === 'water' ? r.amount : 0), 0);
    hours.push({ hour: hourStr, amount });
  }
  return hours;
}

// 计算区间指标（纯函数）
export function getRangeMetrics(records: AnyRecord[], dateKeys: string[]): DailyMetrics[] {
  return dateKeys.map((k) => getDailyMetrics(records, k));
}
