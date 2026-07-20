import type { Fruit } from '@/types';

// 内置水果数据，钾含量参考中国食物成分表
export const BUILTIN_FRUITS: Fruit[] = [
  { id: 'apple', name: '苹果', emoji: '🍎', potassiumPer100g: 119, level: 'low', suggestion: '可适量食用，建议每日不超过 200g' },
  { id: 'pear', name: '梨', emoji: '🍐', potassiumPer100g: 119, level: 'low', suggestion: '可适量食用' },
  { id: 'banana', name: '香蕉', emoji: '🍌', potassiumPer100g: 256, level: 'high', suggestion: '高钾水果，透析患者慎食' },
  { id: 'orange', name: '橙子', emoji: '🍊', potassiumPer100g: 181, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'watermelon', name: '西瓜', emoji: '🍉', potassiumPer100g: 112, level: 'low', suggestion: '含水高，需计入摄水量' },
  { id: 'grape', name: '葡萄', emoji: '🍇', potassiumPer100g: 191, level: 'medium', suggestion: '中等钾含量' },
  { id: 'mango', name: '芒果', emoji: '🥭', potassiumPer100g: 168, level: 'medium', suggestion: '中等钾含量' },
  { id: 'peach', name: '桃子', emoji: '🍑', potassiumPer100g: 190, level: 'medium', suggestion: '中等钾含量' },
  { id: 'strawberry', name: '草莓', emoji: '🍓', potassiumPer100g: 153, level: 'medium', suggestion: '可适量食用' },
  { id: 'kiwi', name: '猕猴桃', emoji: '🥝', potassiumPer100g: 312, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'cherry', name: '樱桃', emoji: '🍒', potassiumPer100g: 222, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'pineapple', name: '菠萝', emoji: '🍍', potassiumPer100g: 113, level: 'low', suggestion: '可适量食用' },
  { id: 'papaya', name: '木瓜', emoji: '🫐', potassiumPer100g: 18, level: 'low', suggestion: '可适量食用' },
  { id: 'lemon', name: '柠檬', emoji: '🍋', potassiumPer100g: 138, level: 'low', suggestion: '可适量泡水' },
  { id: 'pomegranate', name: '石榴', emoji: '🟠', potassiumPer100g: 231, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'dragonfruit', name: '火龙果', emoji: '🩷', potassiumPer100g: 143, level: 'low', suggestion: '可适量食用' },
  { id: 'plum', name: '李子', emoji: '🟣', potassiumPer100g: 144, level: 'low', suggestion: '可适量食用' },
  { id: 'apricot', name: '杏子', emoji: '🟡', potassiumPer100g: 226, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'coconut', name: '椰子', emoji: '🥥', potassiumPer100g: 291, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'avocado', name: '牛油果', emoji: '🥑', potassiumPer100g: 599, level: 'high', suggestion: '极高钾，严格避免' },
  { id: 'durian', name: '榴莲', emoji: '🍈', potassiumPer100g: 436, level: 'high', suggestion: '极高钾，严格避免' },
  { id: 'persimmon', name: '柿子', emoji: '🍅', potassiumPer100g: 151, level: 'medium', suggestion: '中等钾含量' },
  { id: 'honeydew', name: '哈密瓜', emoji: '🟢', potassiumPer100g: 190, level: 'medium', suggestion: '含水高，需控制摄入' },
  { id: 'blueberry', name: '蓝莓', emoji: '🫐', potassiumPer100g: 77, level: 'low', suggestion: '可适量食用' },
];

// 默认设置
export const DEFAULT_SETTINGS = {
  dailyWaterLimit: 1000, // 透析患者每日摄水通常限制在 1000ml
  dailyPotassiumLimit: 2000, // 每日钾摄入限额 mg
  dailyFruitLimit: 200, // 每日水果限额 g
  dailyUltrafiltrationTarget: 500, // 每日超滤目标 ml
  userName: '',
  dialysisSchedule: '周一 / 周三 / 周五',
  initialized: false,
};
