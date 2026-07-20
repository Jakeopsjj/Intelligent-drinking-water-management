import type { Fruit, PotassiumLevel } from '@/types';

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
