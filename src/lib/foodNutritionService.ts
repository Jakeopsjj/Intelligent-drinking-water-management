/**
 * 食物营养数据服务
 *
 * 数据源（替代原 apihz.cn）：
 * 1. USDA FoodData Central（首选）：美国农业部食物数据库，Foundation/SR Legacy 数据
 *    为实验室分析值，营养数据完整可靠（含钾/磷/钠/水分），按每100g标准化。
 *    接口文档：https://fdc.nal.usda.gov/api-guide.html
 *    使用 DEMO_KEY（免费，限30次/小时），配合本地缓存降低请求频率。
 *    因 USDA 仅支持英文检索，内置中文→英文水果名映射表。
 * 2. Open Food Facts（兜底）：免费开源食物数据库，支持中文检索，无需API Key。
 *    数据为用户上报的产品级数据，质量参差，仅作 USDA 无英文映射时的补充。
 *    接口：https://world.openfoodfacts.org/cgi/search.pl
 *
 * 在 Capacitor WebView 中通过 CapacitorHttp 原生 HTTP 调用（绕过 CORS），
 * 浏览器环境降级为直接 fetch（OFF 支持 CORS）。
 * 带内存缓存 + 并发去重。
 */

export interface FoodNutrition {
  name: string;          // 食物名称
  potassium: number;     // 钾 mg
  phosphorus: number;    // 磷 mg
  sodium: number;        // 钠 mg
  water: number;         // 水分 g/ml
  energy?: number;       // 能量 kcal
  protein?: number;       // 蛋白质 g
  fat?: number;          // 脂肪 g
  carbohydrate?: number; // 糖类 g
  fiber?: number;        // 纤维 g
  calcium?: number;      // 钙 mg
  magnesium?: number;    // 镁 mg
  iron?: number;         // 铁 mg
  zinc?: number;         // 锌 mg
  vitaminC?: number;      // 维生素C mg
}

/** 请求超时 */
const TIMEOUT = 10000;

/** USDA API Key（DEMO_KEY 免费但限30次/小时，配合缓存足够个人使用） */
const USDA_API_KEY = 'DEMO_KEY';

/**
 * 中文水果名 → USDA 英文检索词映射。
 * 覆盖内置 67 种水果 + 常见品种，USDA 用英文检索才能命中。
 * 未在映射表中的水果会走 Open Food Facts 中文检索兜底。
 */
const FRUIT_EN_MAP: Record<string, string> = {
  苹果: 'apple',
  香蕉: 'banana',
  柚子: 'pomelo',
  葡萄: 'grape',
  橙子: 'orange',
  梨: 'pear',
  西瓜: 'watermelon',
  火龙果: 'dragon fruit',
  芒果: 'mango',
  桃子: 'peach',
  草莓: 'strawberry',
  猕猴桃: 'kiwi',
  樱桃: 'cherry',
  菠萝: 'pineapple',
  木瓜: 'papaya',
  柠檬: 'lemon',
  石榴: 'pomegranate',
  李子: 'plum',
  杏子: 'apricot',
  椰子: 'coconut',
  柿子: 'persimmon',
  哈密瓜: 'honeydew',
  蓝莓: 'blueberry',
  榴莲: 'durian',
  荔枝: 'lychee',
  龙眼: 'longan',
  桂圆: 'longan',
  山竹: 'mangosteen',
  杨梅: 'bayberry',
  枇杷: 'loquat',
  无花果: 'fig',
  红枣: 'jujube',
  枸杞: 'goji berry',
  牛油果: 'avocado',
  百香果: 'passion fruit',
  杨桃: 'carambola',
  莲雾: 'rose apple',
  释迦果: 'sugar apple',
  红毛丹: 'rambutan',
  人参果: 'pepino',
  桑葚: 'mulberry',
  覆盆子: 'raspberry',
  黑莓: 'blackberry',
  蔓越莓: 'cranberry',
  黑加仑: 'blackcurrant',
  青枣: 'jujube',
  西梅: 'prune',
  黄皮: 'wampee',
  油甘子: 'amla',
  刺梨: 'rose hip',
  蛇皮果: 'salak',
  蛋黄果: 'canistel',
  仙人掌果: 'cactus fruit',
  面包果: 'breadfruit',
  椰枣: 'date',
  罗望子: 'tamarind',
  橄榄: 'olive',
  番木瓜: 'papaya',
  雪莲果: 'yacon',
  葡萄柚: 'grapefruit',
  西柚: 'grapefruit',
  提子: 'grape',
  甜瓜: 'melon',
  甜橙: 'orange',
  柑橘: 'mandarin',
  橘子: 'mandarin',
  桔子: 'mandarin',
  甘蔗: 'sugarcane',
};

/**
 * USDA 营养素 ID → FoodNutrition 字段映射。
 * Foundation/SR Legacy 数据均按每100g标准化，单位已包含在返回值中。
 */
const USDA_NUTRIENT_MAP: Record<number, keyof FoodNutrition> = {
  1092: 'potassium',    // Potassium, K (mg)
  1093: 'sodium',       // Sodium, Na (mg)
  1091: 'phosphorus',   // Phosphorus, P (mg)
  1051: 'water',        // Water (g)
  2047: 'energy',       // Energy (Atwater General Factors) (kcal)
  1003: 'protein',      // Protein (g)
  1004: 'fat',          // Total lipid (fat) (g)
  1005: 'carbohydrate', // Carbohydrate, by difference (g)
  1079: 'fiber',        // Fiber, total dietary (g)
  1087: 'calcium',      // Calcium, Ca (mg)
  1090: 'magnesium',    // Magnesium, Mg (mg)
  1089: 'iron',         // Iron, Fe (mg)
  1095: 'zinc',         // Zinc, Zn (mg)
  1162: 'vitaminC',     // Vitamin C, total ascorbic acid (mg)
};

/** 详情缓存 */
const nutritionCache = new Map<string, FoodNutrition | null>();
const nutritionPending = new Map<string, Promise<FoodNutrition | null>>();

/**
 * 搜索食物营养数据。
 * 优先 USDA（英文映射），兜底 Open Food Facts（中文检索）。
 * 返回第一个匹配项的完整营养数据，未找到返回 null。
 */
export function fetchFoodNutrition(keyword: string): Promise<FoodNutrition | null> {
  const key = keyword.trim().toLowerCase();
  if (!key) return Promise.resolve(null);

  const cached = nutritionCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  const inflight = nutritionPending.get(key);
  if (inflight) return inflight;

  const p = doFetchNutrition(keyword.trim())
    .then((result) => {
      nutritionCache.set(key, result);
      nutritionPending.delete(key);
      return result;
    })
    .catch(() => {
      nutritionCache.set(key, null);
      nutritionPending.delete(key);
      return null;
    });

  nutritionPending.set(key, p);
  return p;
}

/** 实际请求逻辑：USDA 优先 → Open Food Facts 兜底 */
async function doFetchNutrition(keyword: string): Promise<FoodNutrition | null> {
  // 策略1：USDA FoodData Central（英文映射命中时，数据最可靠）
  const englishName = FRUIT_EN_MAP[keyword] || FRUIT_EN_MAP[keyword.replace(/(子|果|肉)$/, '')];
  if (englishName) {
    const usdaResult = await fetchFromUsda(englishName, keyword);
    if (usdaResult) return usdaResult;
  }

  // 策略2：Open Food Facts（中文检索兜底，覆盖 USDA 无映射的水果）
  const offResult = await fetchFromOff(keyword);
  if (offResult) return offResult;

  return null;
}

/**
 * 从 USDA FoodData Central 获取营养数据。
 * 优先 Foundation（实验室分析值），无结果时放宽到 SR Legacy。
 *
 * 匹配策略（关键修复）：不同样品的营养完整度差异大（如"Bananas, overripe"缺钾数据，
 * 而"Bananas, ripe"有完整钾磷钠）。肾病患者核心关注钾/磷/钠，必须优先选取
 * 含有这些关键营养素数据的条目，避免误报为0（如香蕉实际高钾却显示0会危及患者）。
 */
async function fetchFromUsda(englishName: string, displayName: string): Promise<FoodNutrition | null> {
  const query = encodeURIComponent(`${englishName} raw`);
  // 先查 Foundation（最严谨），再查全部数据类型兜底
  for (const dataType of ['Foundation', '']) {
    try {
      let url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${query}&pageSize=10`;
      if (dataType) url += `&dataType=${dataType}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
      if (!res.ok) continue;
      const data = await res.json();
      const foods = data?.foods;
      if (!Array.isArray(foods) || foods.length === 0) continue;

      const nameLc = englishName.toLowerCase();
      // 评分：含钾/磷/钠数据的条目优先（避免误选缺关键营养素的样品）
      const scored = foods
        .map((f: any) => {
          const desc = (f.description || '').toLowerCase();
          const nutrients = Array.isArray(f.foodNutrients) ? f.foodNutrients : [];
          const hasK = nutrients.some((n: any) => n.nutrientId === 1092);
          const hasP = nutrients.some((n: any) => n.nutrientId === 1091);
          const hasNa = nutrients.some((n: any) => n.nutrientId === 1093);
          // 关键营养素覆盖度（0-3分）：肾病患者核心指标
          let score = (hasK ? 1 : 0) + (hasP ? 1 : 0) + (hasNa ? 1 : 0);
          // 名称匹配度：描述以水果名开头（排除"Peppers, banana"等误匹配）
          if (desc.startsWith(nameLc) && desc.includes('raw')) score += 5;
          else if (desc.startsWith(nameLc)) score += 4;
          else if (desc.includes(nameLc) && desc.includes('raw')) score += 3;
          else if (desc.includes(nameLc)) score += 2;
          else score -= 2; // 不含水果名，降权
          return { food: f, score };
        })
        .sort((a: any, b: any) => b.score - a.score);

      for (const { food } of scored) {
        const nutrition = parseUsdaFood(food, displayName);
        if (nutrition) return nutrition;
      }
    } catch {
      // 继续尝试下一个 dataType
    }
  }
  return null;
}

/** 解析 USDA food 对象为 FoodNutrition */
function parseUsdaFood(food: any, displayName: string): FoodNutrition | null {
  const nutrients = food?.foodNutrients;
  if (!Array.isArray(nutrients)) return null;

  const result: any = { name: displayName };
  let hasAny = false;

  for (const n of nutrients) {
    const field = USDA_NUTRIENT_MAP[n.nutrientId];
    if (field && typeof n.value === 'number') {
      // water 字段单位为 g，钾/钠/磷/钙/镁/铁/锌为 mg，能量为 kcal，蛋白质/脂肪/糖类/纤维为 g
      result[field] = n.value;
      hasAny = true;
    }
  }

  // 至少要有钾/磷/钠/水分之一才算有效（肾病患者核心关注指标）
  if (!hasAny || (!result.potassium && !result.phosphorus && !result.sodium && !result.water)) {
    return null;
  }

  return result as FoodNutrition;
}

/**
 * 从 Open Food Facts 获取营养数据（中文检索兜底）。
 * OFF 返回产品级数据，筛选最匹配的产品并解析 nutriments。
 */
async function fetchFromOff(keyword: string): Promise<FoodNutrition | null> {
  try {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(keyword)}` +
      `&search_simple=1&action=process&json=1&page_size=10` +
      `&fields=product_name,categories,nutriments`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return null;
    const data = await res.json();
    const products = data?.products;
    if (!Array.isArray(products) || products.length === 0) return null;

    // 匹配优先级：product_name 精确/包含匹配，优先非加工品（categories 含 fruit/新鲜）
    let best: any = null;
    // 1. 名称精确匹配
    best = products.find((p: any) => (p.product_name || '') === keyword);
    // 2. 名称包含关键词
    if (!best) {
      best = products.find((p: any) => (p.product_name || '').includes(keyword));
    }
    // 3. 取第一个有 nutriments 的
    if (!best) {
      best = products.find((p: any) => p.nutriments && Object.keys(p.nutriments).length > 0);
    }
    if (!best) return null;

    return parseOffProduct(best, keyword);
  } catch {
    return null;
  }
}

/** 解析 OFF product 的 nutriments 为 FoodNutrition */
function parseOffProduct(product: any, displayName: string): FoodNutrition | null {
  const n = product?.nutriments;
  if (!n) return null;

  const num = (v: any): number => {
    if (v == null) return 0;
    const x = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(x) ? 0 : x;
  };

  const result: FoodNutrition = {
    name: displayName,
    potassium: num(n.potassium_100g),
    phosphorus: num(n.phosphorus_100g),
    sodium: num(n.sodium_100g),
    water: num(n.water_100g),
    energy: num(n['energy-kcal_100g'] ?? n.energy_100g),
    protein: num(n.proteins_100g),
    fat: num(n.fat_100g),
    carbohydrate: num(n.carbohydrates_100g),
    fiber: num(n.fiber_100g),
    calcium: num(n.calcium_100g),
    magnesium: num(n.magnesium_100g),
    iron: num(n.iron_100g),
    zinc: num(n.zinc_100g),
    vitaminC: num(n['vitamin-c_100g']),
  };

  // 至少要有钾/磷/钠/水分之一才算有效
  if (!result.potassium && !result.phosphorus && !result.sodium && !result.water) {
    return null;
  }

  return result;
}
