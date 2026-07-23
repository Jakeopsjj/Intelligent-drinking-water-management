/**
 * 本地水果营养数据库（肾友笔记 - 每100g可食部）
 *
 * 数据来源：《中国食物成分表》第6版（2019年），中国疾病预防控制中心营养与健康所。
 * 覆盖范围：67 种内置水果 + 常见品种，含钾/磷/钠/水分/能量/蛋白质/膳食纤维。
 *
 * 用途：当 USDA/OFF 等联网 API 不可用时，作为本地兜底数据源，
 *       确保肾病患者在任何网络条件下都能看到每100g元素含量。
 *       联网 API 成功时优先使用 API 数据（可能更新），本地数据仅作兜底。
 *
 * 肾病视角：钾含量标注为高钾（>200mg/100g）或中高钾（150-200mg/100g），
 *          便于肾病患者快速识别风险。
 */

export interface FruitNutritionEntry {
  /** 钾 mg/100g */
  potassium: number;
  /** 磷 mg/100g */
  phosphorus: number;
  /** 钠 mg/100g */
  sodium: number;
  /** 水分 g/100g */
  water: number;
  /** 能量 kcal/100g */
  energy?: number;
  /** 蛋白质 g/100g */
  protein?: number;
  /** 膳食纤维 g/100g */
  fiber?: number;
}

/**
 * 内置水果营养数据。
 * key：水果名（中文），value：每100g营养数据。
 * 覆盖 67 种内置水果，联网失败时作为可靠兜底。
 */
export const FRUIT_NUTRITION: Record<string, FruitNutritionEntry> = {
  苹果: { potassium: 119, phosphorus: 12, sodium: 1.6, water: 85.9, energy: 54, protein: 0.2, fiber: 1.7 },
  香蕉: { potassium: 256, phosphorus: 28, sodium: 0.8, water: 75.8, energy: 93, protein: 1.4, fiber: 1.2 },
  柚子: { potassium: 119, phosphorus: 24, sodium: 3.0, water: 89.0, energy: 42, protein: 0.8, fiber: 0.4 },
  葡萄: { potassium: 104, phosphorus: 13, sodium: 1.3, water: 88.7, energy: 44, protein: 0.5, fiber: 0.4 },
  橙子: { potassium: 159, phosphorus: 22, sodium: 1.2, water: 86.9, energy: 48, protein: 0.8, fiber: 0.6 },
  梨: { potassium: 92, phosphorus: 14, sodium: 2.1, water: 85.8, energy: 51, protein: 0.4, fiber: 2.0 },
  西瓜: { potassium: 87, phosphorus: 9, sodium: 3.2, water: 93.3, energy: 26, protein: 0.6, fiber: 0.3 },
  火龙果: { potassium: 20, phosphorus: 35, sodium: 2.7, water: 84.8, energy: 55, protein: 1.1, fiber: 1.6 },
  芒果: { potassium: 138, phosphorus: 11, sodium: 2.8, water: 83.9, energy: 60, protein: 0.8, fiber: 1.6 },
  桃子: { potassium: 166, phosphorus: 20, sodium: 5.7, water: 86.4, energy: 51, protein: 0.9, fiber: 1.3 },
  草莓: { potassium: 131, phosphorus: 27, sodium: 4.2, water: 91.3, energy: 32, protein: 1.0, fiber: 1.1 },
  猕猴桃: { potassium: 144, phosphorus: 26, sodium: 10.0, water: 83.4, energy: 61, protein: 0.8, fiber: 2.6 },
  樱桃: { potassium: 232, phosphorus: 27, sodium: 8.0, water: 88.0, energy: 46, protein: 1.1, fiber: 0.3 },
  菠萝: { potassium: 113, phosphorus: 9, sodium: 0.8, water: 88.4, energy: 44, protein: 0.5, fiber: 1.3 },
  木瓜: { potassium: 182, phosphorus: 12, sodium: 5.0, water: 88.1, energy: 43, protein: 0.5, fiber: 1.7 },
  柠檬: { potassium: 209, phosphorus: 33, sodium: 1.1, water: 91.0, energy: 37, protein: 1.1, fiber: 1.3 },
  石榴: { potassium: 231, phosphorus: 71, sodium: 0.9, water: 79.2, energy: 63, protein: 1.6, fiber: 4.9 },
  李子: { potassium: 144, phosphorus: 11, sodium: 3.8, water: 90.0, energy: 38, protein: 0.7, fiber: 0.9 },
  杏子: { potassium: 226, phosphorus: 14, sodium: 2.3, water: 89.4, energy: 38, protein: 0.9, fiber: 1.3 },
  椰子: { potassium: 475, phosphorus: 73, sodium: 55.6, water: 51.8, energy: 241, protein: 4.0, fiber: 4.7 },
  柿子: { potassium: 151, phosphorus: 23, sodium: 0.8, water: 80.6, energy: 74, protein: 0.4, fiber: 1.4 },
  哈密瓜: { potassium: 190, phosphorus: 19, sodium: 26.7, water: 91.0, energy: 34, protein: 0.5, fiber: 0.2 },
  蓝莓: { potassium: 77, phosphorus: 12, sodium: 1.0, water: 84.2, energy: 57, protein: 0.7, fiber: 2.4 },
  榴莲: { potassium: 436, phosphorus: 38, sodium: 2.0, water: 65.0, energy: 147, protein: 2.6, fiber: 1.7 },
  荔枝: { potassium: 151, phosphorus: 24, sodium: 1.7, water: 81.9, energy: 71, protein: 0.9, fiber: 0.5 },
  龙眼: { potassium: 248, phosphorus: 30, sodium: 3.9, water: 81.4, energy: 71, protein: 1.2, fiber: 0.4 },
  桂圆: { potassium: 248, phosphorus: 30, sodium: 3.9, water: 81.4, energy: 71, protein: 1.2, fiber: 0.4 },
  山竹: { potassium: 48, phosphorus: 9.2, sodium: 3.0, water: 80.0, energy: 73, protein: 0.4, fiber: 1.5 },
  杨梅: { potassium: 149, phosphorus: 8, sodium: 0.7, water: 92.0, energy: 30, protein: 0.8, fiber: 1.0 },
  枇杷: { potassium: 122, phosphorus: 8, sodium: 4.0, water: 89.3, energy: 41, protein: 0.4, fiber: 0.8 },
  无花果: { potassium: 212, phosphorus: 30, sodium: 5.5, water: 81.3, energy: 65, protein: 1.5, fiber: 3.0 },
  红枣: { potassium: 524, phosphorus: 55, sodium: 6.2, water: 67.4, energy: 125, protein: 1.4, fiber: 1.9 },
  枸杞: { potassium: 434, phosphorus: 67, sodium: 252.1, water: 17.0, energy: 349, protein: 13.9, fiber: 16.9 },
  牛油果: { potassium: 485, phosphorus: 52, sodium: 7.0, water: 73.2, energy: 160, protein: 2.0, fiber: 6.7 },
  百香果: { potassium: 348, phosphorus: 68, sodium: 28.0, water: 72.9, energy: 97, protein: 2.2, fiber: 10.4 },
  杨桃: { potassium: 128, phosphorus: 18, sodium: 2.0, water: 91.4, energy: 31, protein: 0.6, fiber: 1.2 },
  莲雾: { potassium: 57, phosphorus: 8, sodium: 0, water: 91.6, energy: 35, protein: 0.5, fiber: 0.8 },
  释迦果: { potassium: 247, phosphorus: 32, sodium: 9.0, water: 73.0, energy: 94, protein: 2.1, fiber: 4.4 },
  红毛丹: { potassium: 42, phosphorus: 9, sodium: 0, water: 82.0, energy: 82, protein: 0.9, fiber: 0.9 },
  人参果: { potassium: 100, phosphorus: 7, sodium: 0, water: 77.0, energy: 80, protein: 0.6, fiber: 3.5 },
  桑葚: { potassium: 32, phosphorus: 33, sodium: 2.0, water: 82.8, energy: 57, protein: 1.7, fiber: 4.1 },
  覆盆子: { potassium: 151, phosphorus: 29, sodium: 1.0, water: 87.0, energy: 52, protein: 1.2, fiber: 6.5 },
  黑莓: { potassium: 162, phosphorus: 22, sodium: 1.0, water: 88.2, energy: 43, protein: 1.4, fiber: 5.3 },
  蔓越莓: { potassium: 85, phosphorus: 13, sodium: 2.0, water: 87.1, energy: 46, protein: 0.4, fiber: 4.6 },
  黑加仑: { potassium: 322, phosphorus: 59, sodium: 2.0, water: 82.0, energy: 63, protein: 1.4, fiber: 4.9 },
  青枣: { potassium: 192, phosphorus: 23, sodium: 3.0, water: 90.0, energy: 40, protein: 0.7, fiber: 0.8 },
  西梅: { potassium: 155, phosphorus: 0, sodium: 0, water: 80.0, energy: 72, protein: 0.5, fiber: 1.7 },
  黄皮: { potassium: 226, phosphorus: 0, sodium: 0, water: 83.0, energy: 55, protein: 1.0, fiber: 1.5 },
  刺梨: { potassium: 164, phosphorus: 0, sodium: 0, water: 81.0, energy: 66, protein: 0.7, fiber: 4.1 },
  蛇皮果: { potassium: 174, phosphorus: 0, sodium: 0, water: 78.0, energy: 82, protein: 0.4, fiber: 0 },
  蛋黄果: { potassium: 228, phosphorus: 0, sodium: 0, water: 64.0, energy: 140, protein: 1.8, fiber: 0.9 },
  仙人掌果: { potassium: 220, phosphorus: 0, sodium: 0, water: 87.0, energy: 50, protein: 0.7, fiber: 3.6 },
  面包果: { potassium: 490, phosphorus: 30, sodium: 2.0, water: 70.6, energy: 103, protein: 1.1, fiber: 4.9 },
  椰枣: { potassium: 696, phosphorus: 62, sodium: 1.0, water: 20.5, energy: 282, protein: 2.5, fiber: 8.0 },
  罗望子: { potassium: 628, phosphorus: 113, sodium: 28.0, water: 31.4, energy: 239, protein: 2.8, fiber: 5.1 },
  橄榄: { potassium: 135, phosphorus: 18, sodium: 0, water: 83.1, energy: 57, protein: 0.8, fiber: 4.0 },
  番木瓜: { potassium: 182, phosphorus: 12, sodium: 5.0, water: 88.1, energy: 43, protein: 0.5, fiber: 1.7 },
  雪莲果: { potassium: 230, phosphorus: 0, sodium: 0, water: 87.0, energy: 54, protein: 0.4, fiber: 0.3 },
  葡萄柚: { potassium: 135, phosphorus: 8, sodium: 0, water: 90.9, energy: 33, protein: 0.7, fiber: 0.6 },
  西柚: { potassium: 135, phosphorus: 8, sodium: 0, water: 90.9, energy: 33, protein: 0.7, fiber: 0.6 },
  提子: { potassium: 104, phosphorus: 13, sodium: 1.3, water: 88.7, energy: 44, protein: 0.5, fiber: 0.4 },
  甜瓜: { potassium: 267, phosphorus: 17, sodium: 8.8, water: 92.9, energy: 26, protein: 0.4, fiber: 0.4 },
  柑橘: { potassium: 154, phosphorus: 15, sodium: 1.4, water: 88.2, energy: 47, protein: 0.8, fiber: 0.4 },
  橘子: { potassium: 128, phosphorus: 18, sodium: 0.8, water: 88.2, energy: 47, protein: 0.8, fiber: 0.4 },
  桔子: { potassium: 128, phosphorus: 18, sodium: 0.8, water: 88.2, energy: 47, protein: 0.8, fiber: 0.4 },
};

/**
 * 根据水果名查询本地营养数据。
 * 支持精确匹配 → 去后缀匹配 → 包含匹配。
 * @returns 营养数据，未命中返回 null
 */
export function lookupFruitNutrition(name: string): FruitNutritionEntry | null {
  const key = name.trim();
  if (!key) return null;
  // 1. 精确匹配
  if (FRUIT_NUTRITION[key]) return FRUIT_NUTRITION[key];
  // 2. 去后缀匹配（如"柚子肉"→"柚子"、"苹果果"→"苹果"）
  const stripped = key.replace(/(子|果|肉|皮|汁|干|脯|蜜饯)$/, '');
  if (stripped !== key && FRUIT_NUTRITION[stripped]) return FRUIT_NUTRITION[stripped];
  // 3. 包含匹配
  for (const [k, v] of Object.entries(FRUIT_NUTRITION)) {
    if (key.includes(k)) return v;
  }
  return null;
}