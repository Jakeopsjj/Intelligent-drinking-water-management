import type { Fruit } from '@/types';

// 内置水果数据，钾/磷/钠含量参考中国食物成分表
export const BUILTIN_FRUITS: Fruit[] = [
  { id: 'apple', name: '苹果', emoji: '🍎', potassiumPer100g: 119, phosphorusPer100g: 12, sodiumPer100g: 1.6, level: 'low', suggestion: '可适量食用，建议每日不超过 200g' },
  { id: 'pear', name: '梨', emoji: '🍐', potassiumPer100g: 119, phosphorusPer100g: 14, sodiumPer100g: 2.1, level: 'low', suggestion: '可适量食用' },
  { id: 'banana', name: '香蕉', emoji: '🍌', potassiumPer100g: 256, phosphorusPer100g: 28, sodiumPer100g: 0.8, level: 'high', suggestion: '高钾水果，透析患者慎食' },
  { id: 'orange', name: '橙子', emoji: '🍊', potassiumPer100g: 181, phosphorusPer100g: 18, sodiumPer100g: 1.2, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'watermelon', name: '西瓜', emoji: '🍉', potassiumPer100g: 112, phosphorusPer100g: 9, sodiumPer100g: 2.3, level: 'low', suggestion: '含水高，需计入摄水量' },
  { id: 'grape', name: '葡萄', emoji: '🍇', potassiumPer100g: 191, phosphorusPer100g: 13, sodiumPer100g: 1.5, level: 'medium', suggestion: '中等钾含量' },
  { id: 'mango', name: '芒果', emoji: '🥭', potassiumPer100g: 168, phosphorusPer100g: 12, sodiumPer100g: 2.8, level: 'medium', suggestion: '中等钾含量' },
  { id: 'peach', name: '桃子', emoji: '🍑', potassiumPer100g: 190, phosphorusPer100g: 11, sodiumPer100g: 1.7, level: 'medium', suggestion: '中等钾含量' },
  { id: 'strawberry', name: '草莓', emoji: '🍓', potassiumPer100g: 153, phosphorusPer100g: 24, sodiumPer100g: 4.2, level: 'medium', suggestion: '可适量食用' },
  { id: 'kiwi', name: '猕猴桃', emoji: '🥝', potassiumPer100g: 312, phosphorusPer100g: 26, sodiumPer100g: 3.0, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'cherry', name: '樱桃', emoji: '🍒', potassiumPer100g: 222, phosphorusPer100g: 23, sodiumPer100g: 8.0, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'pineapple', name: '菠萝', emoji: '🍍', potassiumPer100g: 113, phosphorusPer100g: 9, sodiumPer100g: 0.8, level: 'low', suggestion: '可适量食用' },
  { id: 'papaya', name: '木瓜', emoji: '🫐', potassiumPer100g: 18, phosphorusPer100g: 12, sodiumPer100g: 28, level: 'low', suggestion: '可适量食用' },
  { id: 'lemon', name: '柠檬', emoji: '🍋', potassiumPer100g: 138, phosphorusPer100g: 16, sodiumPer100g: 1.1, level: 'low', suggestion: '可适量泡水' },
  { id: 'pomegranate', name: '石榴', emoji: '🟠', potassiumPer100g: 231, phosphorusPer100g: 11, sodiumPer100g: 0.9, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'dragonfruit', name: '火龙果', emoji: '🩷', potassiumPer100g: 143, phosphorusPer100g: 21, sodiumPer100g: 2.7, level: 'low', suggestion: '可适量食用' },
  { id: 'plum', name: '李子', emoji: '🟣', potassiumPer100g: 144, phosphorusPer100g: 16, sodiumPer100g: 1.4, level: 'low', suggestion: '可适量食用' },
  { id: 'apricot', name: '杏子', emoji: '🟡', potassiumPer100g: 226, phosphorusPer100g: 15, sodiumPer100g: 1.9, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'coconut', name: '椰子', emoji: '🥥', potassiumPer100g: 291, phosphorusPer100g: 90, sodiumPer100g: 55, level: 'high', suggestion: '高钾高磷，应避免' },
  { id: 'avocado', name: '牛油果', emoji: '🥑', potassiumPer100g: 599, phosphorusPer100g: 52, sodiumPer100g: 7, level: 'high', suggestion: '极高钾，严格避免' },
  { id: 'durian', name: '榴莲', emoji: '🍈', potassiumPer100g: 436, phosphorusPer100g: 38, sodiumPer100g: 2.0, level: 'high', suggestion: '极高钾，严格避免' },
  { id: 'persimmon', name: '柿子', emoji: '🍅', potassiumPer100g: 151, phosphorusPer100g: 18, sodiumPer100g: 0.8, level: 'medium', suggestion: '中等钾含量' },
  { id: 'honeydew', name: '哈密瓜', emoji: '🟢', potassiumPer100g: 190, phosphorusPer100g: 13, sodiumPer100g: 26.7, level: 'medium', suggestion: '含水高，需控制摄入' },
  { id: 'blueberry', name: '蓝莓', emoji: '🫐', potassiumPer100g: 77, phosphorusPer100g: 12, sodiumPer100g: 1, level: 'low', suggestion: '可适量食用' },
];

// 默认设置（透析患者常用限额参考）
export const DEFAULT_SETTINGS = {
  dailyWaterLimit: 1000, // 透析患者每日摄水通常限制在 1000ml
  dailyPotassiumLimit: 2000, // 每日钾摄入限额 mg
  dailyPhosphorusLimit: 800, // 每日磷摄入限额 mg（建议 800-1000mg）
  dailySodiumLimit: 2000, // 每日钠摄入限额 mg（约 5g 食盐）
  dailyFruitLimit: 200, // 每日水果限额 g
  dailyUltrafiltrationTarget: 500, // 每日超滤目标 ml
  userName: '',
  dialysisSchedule: '周一 / 周三 / 周五',
  initialized: false,
};
