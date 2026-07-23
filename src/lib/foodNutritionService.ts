/**
 * 食物营养数据服务
 *
 * 数据源：apihz.cn 免费API（1700+食物，25种营养成分，含钾/磷/钠/水分）
 * 接口文档：https://cn.apihz.cn/api/jiankang/food.php
 *
 * 在 Capacitor WebView 中通过 CORS 代理调用。
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

/** CORS 代理列表（轮换使用） */
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

/** 通过 CORS 代理发起请求 */
async function fetchWithCorsProxy(url: string): Promise<Response | null> {
  // 先尝试直接请求
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (res.ok) return res;
  } catch {
    // 继续
  }
  // 尝试 CORS 代理
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(TIMEOUT) });
      if (res.ok) return res;
    } catch {
      // 继续
    }
  }
  return null;
}

/** 详情缓存 */
const nutritionCache = new Map<string, FoodNutrition | null>();
const nutritionPending = new Map<string, Promise<FoodNutrition | null>>();

/** 解析 API 返回的单条数据 */
function parseFoodItem(item: Record<string, string>): FoodNutrition {
  const num = (v: string | undefined): number => {
    if (!v || v === '0' || v === '') return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  return {
    name: item.food || '',
    potassium: num(item.jia),
    phosphorus: num(item.lin),
    sodium: num(item.na),
    water: num(item.shui),
    energy: num(item.nl),
    protein: num(item.dbz),
    fat: num(item.zf),
    carbohydrate: num(item.tang),
    fiber: num(item.xw),
    calcium: num(item.gai),
    magnesium: num(item.mei),
    iron: num(item.tie),
    zinc: num(item.xin),
    vitaminC: num(item.vc),
  };
}

/**
 * 搜索食物营养数据。
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

/** 实际请求逻辑 */
async function doFetchNutrition(keyword: string): Promise<FoodNutrition | null> {
  // apihz.cn 公共测试 key（共享频率限制）
  const apiUrl = `https://cn.apihz.cn/api/jiankang/food.php?id=88888888&key=88888888&page=1&words=${encodeURIComponent(keyword)}`;

  const res = await fetchWithCorsProxy(apiUrl);
  if (!res) return null;

  const data = await res.json();
  if (!data || data.code !== 200 || !data.datas || !Array.isArray(data.datas)) {
    return null;
  }

  // 从结果中找最匹配的（优先精确匹配，否则取第一个含有效数据的）
  const items = data.datas as Record<string, string>[];
  if (items.length === 0) return null;

  // 优先精确匹配
  const exact = items.find((item) => item.food === keyword);
  const best = exact || items[0];

  const nutrition = parseFoodItem(best);
  if (!nutrition.name) return null;

  return nutrition;
}
