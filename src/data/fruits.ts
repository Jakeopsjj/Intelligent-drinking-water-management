import type { Fruit } from '@/types';

/** 真实配图 URL 生成（按图片规范使用内置 text_to_image API） */
function imageFor(prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encoded}&image_size=square`;
}

// 内置水果数据（参考《中国食物成分表》第 6 版 + USDA FoodData Central）
// 单位统一：钾/磷/钠 mg / 100g，水分 ml / 100g（约等于 g）
// 等级判定：<150 低钾，150-200 中钾，>200 高钾
export const BUILTIN_FRUITS: Fruit[] = [
  {
    id: 'apple', name: '苹果', emoji: '🍎',
    potassiumPer100g: 119, phosphorusPer100g: 12, sodiumPer100g: 1.6, waterPer100g: 86,
    level: 'low', suggestion: '可适量食用，建议每日不超过 200g',
    aliases: '苹果·西洋苹果',
    description: '苹果为蔷薇科苹果属水果，富含果胶、维生素C和少量矿物质。其钾含量较低，是透析患者较为安全的水果选择。',
    usage: '建议带皮食用以获得更多膳食纤维；可生食、榨汁或煮水。每次100-200g为宜。',
    nutrients: '每100g含：水分86g、碳水13.5g、膳食纤维2.4g、维生素C 4mg、钾119mg、磷12mg。',
    image: imageFor('a fresh red apple, whole and sliced, on a clean white surface, top view, realistic food photography, high detail'),
  },
  {
    id: 'pear', name: '梨', emoji: '🍐',
    potassiumPer100g: 119, phosphorusPer100g: 14, sodiumPer100g: 2.1, waterPer100g: 84,
    level: 'low', suggestion: '可适量食用，含水较高',
    aliases: '梨·雪梨·鸭梨',
    description: '梨为蔷薇科梨属水果，水分高、性凉，有润肺生津作用。钾含量较低，适合透析患者适量食用。',
    usage: '可生食、炖煮或榨汁。注意梨含水较高，需计入每日摄水量。',
    nutrients: '每100g含：水分84g、碳水13.3g、膳食纤维3.1g、钾119mg、磷14mg。',
    image: imageFor('a fresh yellow asian pear, whole and sliced, on white background, realistic food photography, high detail'),
  },
  {
    id: 'banana', name: '香蕉', emoji: '🍌',
    potassiumPer100g: 256, phosphorusPer100g: 28, sodiumPer100g: 0.8, waterPer100g: 75,
    level: 'high', suggestion: '高钾水果，透析患者慎食',
    aliases: '香蕉·甘蕉',
    description: '香蕉为芭蕉科芭蕉属水果，富含钾元素和碳水。钾含量极高，透析患者应严格限制或避免食用。',
    usage: '高钾风险，建议避免。如必须食用，单次不超过50g，且需密切监测血钾。',
    nutrients: '每100g含：水分75g、碳水22g、膳食纤维1.2g、钾256mg、磷28mg、镁43mg。',
    image: imageFor('a bunch of yellow bananas, on white background, realistic food photography, high detail'),
  },
  {
    id: 'orange', name: '橙子', emoji: '🍊',
    potassiumPer100g: 181, phosphorusPer100g: 18, sodiumPer100g: 1.2, waterPer100g: 87,
    level: 'medium', suggestion: '中等钾含量，控制摄入',
    aliases: '橙子·甜橙·脐橙',
    description: '橙子为芸香科柑橘属水果，富含维生素C和水分。钾含量中等，需控制摄入量。',
    usage: '可生食或榨汁。建议每次半个中等大小橙子（约100g），每周不超过2-3次。',
    nutrients: '每100g含：水分87g、碳水11g、维生素C 53mg、钾181mg、磷18mg。',
    image: imageFor('a fresh orange, whole and sliced, on white background, realistic food photography, high detail'),
  },
  {
    id: 'watermelon', name: '西瓜', emoji: '🍉',
    potassiumPer100g: 112, phosphorusPer100g: 9, sodiumPer100g: 2.3, waterPer100g: 93,
    level: 'low', suggestion: '含水极高，需计入摄水量',
    aliases: '西瓜·寒瓜',
    description: '西瓜为葫芦科西瓜属水果，水分高达93%，是夏季解暑佳品。钾含量虽低，但水分极高，透析患者需严格计入摄水量。',
    usage: '每次建议不超过100g，且需相应减少当日饮水量。注意避免冰镇刺激。',
    nutrients: '每100g含：水分93g、碳水5.8g、钾112mg、磷9mg、番茄红素4mg。',
    image: imageFor('a slice of red watermelon with green rind, on white background, realistic food photography, high detail'),
  },
  { id: 'grape', name: '葡萄', emoji: '🍇', potassiumPer100g: 191, phosphorusPer100g: 13, sodiumPer100g: 1.5, waterPer100g: 81, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'mango', name: '芒果', emoji: '🥭', potassiumPer100g: 168, phosphorusPer100g: 12, sodiumPer100g: 2.8, waterPer100g: 83, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'peach', name: '桃子', emoji: '🍑', potassiumPer100g: 190, phosphorusPer100g: 11, sodiumPer100g: 1.7, waterPer100g: 88, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'strawberry', name: '草莓', emoji: '🍓', potassiumPer100g: 153, phosphorusPer100g: 24, sodiumPer100g: 4.2, waterPer100g: 90, level: 'medium', suggestion: '可适量食用' },
  { id: 'kiwi', name: '猕猴桃', emoji: '🥝', potassiumPer100g: 312, phosphorusPer100g: 26, sodiumPer100g: 3.0, waterPer100g: 83, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'cherry', name: '樱桃', emoji: '🍒', potassiumPer100g: 222, phosphorusPer100g: 23, sodiumPer100g: 8.0, waterPer100g: 80, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'pineapple', name: '菠萝', emoji: '🍍', potassiumPer100g: 113, phosphorusPer100g: 9, sodiumPer100g: 0.8, waterPer100g: 87, level: 'low', suggestion: '可适量食用' },
  { id: 'papaya', name: '木瓜', emoji: '🟠', potassiumPer100g: 182, phosphorusPer100g: 12, sodiumPer100g: 28, waterPer100g: 88, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'lemon', name: '柠檬', emoji: '🍋', potassiumPer100g: 138, phosphorusPer100g: 16, sodiumPer100g: 1.1, waterPer100g: 91, level: 'low', suggestion: '可适量泡水' },
  { id: 'pomegranate', name: '石榴', emoji: '🟠', potassiumPer100g: 231, phosphorusPer100g: 11, sodiumPer100g: 0.9, waterPer100g: 79, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'dragonfruit', name: '火龙果', emoji: '🩷', potassiumPer100g: 143, phosphorusPer100g: 21, sodiumPer100g: 2.7, waterPer100g: 83, level: 'low', suggestion: '可适量食用' },
  { id: 'plum', name: '李子', emoji: '🟣', potassiumPer100g: 144, phosphorusPer100g: 16, sodiumPer100g: 1.4, waterPer100g: 88, level: 'low', suggestion: '可适量食用' },
  { id: 'apricot', name: '杏子', emoji: '🟡', potassiumPer100g: 226, phosphorusPer100g: 15, sodiumPer100g: 1.9, waterPer100g: 86, level: 'high', suggestion: '高钾水果，应避免' },
  { id: 'coconut', name: '椰子', emoji: '🥥', potassiumPer100g: 291, phosphorusPer100g: 90, sodiumPer100g: 55, waterPer100g: 47, level: 'high', suggestion: '高钾高磷高钠，应避免' },
  { id: 'avocado', name: '牛油果', emoji: '🥑', potassiumPer100g: 599, phosphorusPer100g: 52, sodiumPer100g: 7, waterPer100g: 73, level: 'high', suggestion: '极高钾，严格避免' },
  { id: 'durian', name: '榴莲', emoji: '🍈', potassiumPer100g: 436, phosphorusPer100g: 38, sodiumPer100g: 2.0, waterPer100g: 65, level: 'high', suggestion: '极高钾，严格避免' },
  { id: 'persimmon', name: '柿子', emoji: '🍅', potassiumPer100g: 151, phosphorusPer100g: 18, sodiumPer100g: 0.8, waterPer100g: 80, level: 'medium', suggestion: '中等钾含量，控制摄入' },
  { id: 'honeydew', name: '哈密瓜', emoji: '🟢', potassiumPer100g: 190, phosphorusPer100g: 13, sodiumPer100g: 26.7, waterPer100g: 90, level: 'medium', suggestion: '含水高，需控制摄入' },
  { id: 'blueberry', name: '蓝莓', emoji: '🫐', potassiumPer100g: 77, phosphorusPer100g: 12, sodiumPer100g: 1, waterPer100g: 84, level: 'low', suggestion: '可适量食用' },
];

// 默认设置（透析患者常用限额参考）
export const DEFAULT_SETTINGS = {
  dailyWaterLimit: 1000, // 透析患者每日摄水通常限制在 1000ml（含水果水分）
  dailyPotassiumLimit: 2000, // 每日钾摄入限额 mg
  dailyPhosphorusLimit: 800, // 每日磷摄入限额 mg（建议 800-1000mg）
  dailySodiumLimit: 2000, // 每日钠摄入限额 mg（约 5g 食盐）
  dailyFruitLimit: 200, // 每日水果限额 g
  dailyUltrafiltrationTarget: 500, // 每日超滤目标 ml
  userName: '',
  userAvatar: '🧑',
  dialysisSchedule: '周一 / 周三 / 周五',
  initialized: false,
};
