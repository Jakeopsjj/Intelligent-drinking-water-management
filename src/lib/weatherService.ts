/**
 * 天气服务
 *
 * 基于博客方案实现：
 * - ipapi.co 获取用户经纬度（IP定位，无需授权）
 * - Open-Meteo API 获取实时天气数据（免费，无需 API Key）
 * - 本地缓存减少请求频率
 *
 * Open-Meteo WMO Weather Code 参考：
 * https://open-meteo.com/en/docs
 */

/** 天气类型（用于背景渲染） */
export type WeatherType =
  | 'clear'        // 晴天
  | 'cloudy'       // 多云
  | 'overcast'     // 阴天
  | 'fog'          // 雾
  | 'drizzle'      // 毛毛雨
  | 'rain'         // 雨
  | 'heavy-rain'   // 大雨
  | 'snow'         // 雪
  | 'thunderstorm'; // 雷暴

/** 天气数据 */
export interface WeatherData {
  type: WeatherType;
  code: number;
  description: string;
  temperature: number;
  isDay: boolean;
  /** 风速 m/s */
  windSpeed: number;
  /** 湿度 % */
  humidity: number;
  /** 更新时间 */
  fetchedAt: number;
}

/** 位置信息 */
export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  /** 缓存时间戳 */
  cachedAt?: number;
}

/** WMO 天气代码映射 */
const WMO_CODE_MAP: Record<number, { type: WeatherType; description: string }> = {
  0: { type: 'clear', description: '晴天' },
  1: { type: 'clear', description: '大部晴朗' },
  2: { type: 'cloudy', description: '局部多云' },
  3: { type: 'overcast', description: '阴天' },
  45: { type: 'fog', description: '雾' },
  48: { type: 'fog', description: '雾凇' },
  51: { type: 'drizzle', description: '毛毛雨' },
  53: { type: 'drizzle', description: '毛毛雨' },
  55: { type: 'drizzle', description: '毛毛雨' },
  56: { type: 'drizzle', description: '冻雨' },
  57: { type: 'drizzle', description: '冻雨' },
  61: { type: 'rain', description: '小雨' },
  63: { type: 'rain', description: '中雨' },
  65: { type: 'heavy-rain', description: '大雨' },
  66: { type: 'rain', description: '冻雨' },
  67: { type: 'heavy-rain', description: '冻雨' },
  71: { type: 'snow', description: '小雪' },
  73: { type: 'snow', description: '中雪' },
  75: { type: 'snow', description: '大雪' },
  77: { type: 'snow', description: '雪粒' },
  80: { type: 'rain', description: '阵雨' },
  81: { type: 'rain', description: '中阵雨' },
  82: { type: 'heavy-rain', description: '大阵雨' },
  85: { type: 'snow', description: '阵雪' },
  86: { type: 'snow', description: '大阵雪' },
  95: { type: 'thunderstorm', description: '雷暴' },
  96: { type: 'thunderstorm', description: '雷暴伴有冰雹' },
  99: { type: 'thunderstorm', description: '雷暴伴有大冰雹' },
};

/** 缓存有效期：30分钟 */
const CACHE_TTL = 30 * 60 * 1000;
const CACHE_KEY_LOCATION = 'weather_location';
const CACHE_KEY_WEATHER = 'weather_data';

/**
 * 获取用户位置
 * 优先使用浏览器 Geolocation API（精确），失败则回退到 ipapi.co（IP定位）
 */
export async function getLocation(): Promise<LocationData | null> {
  // 检查缓存
  try {
    const cached = localStorage.getItem(CACHE_KEY_LOCATION);
    if (cached) {
      const data = JSON.parse(cached) as LocationData;
      if (data.cachedAt && Date.now() - data.cachedAt < CACHE_TTL * 4) {
        return data;
      }
    }
  } catch {
    // 缓存读取失败，继续
  }

  // 方案1：尝试浏览器 Geolocation API（精确，但需用户授权）
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: CACHE_TTL,
        });
      });
      const loc: LocationData = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      cacheLocation(loc);
      return loc;
    } catch {
      // 用户拒绝或超时，回退到 IP 定位
    }
  }

  // 方案2：ipapi.co IP 定位（无需授权）
  try {
    const resp = await fetch('https://ipapi.co/json/');
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.latitude && data.longitude) {
      const loc: LocationData = {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
      };
      cacheLocation(loc);
      return loc;
    }
  } catch {
    // 网络失败
  }

  return null;
}

function cacheLocation(loc: LocationData) {
  try {
    localStorage.setItem(CACHE_KEY_LOCATION, JSON.stringify(loc));
  } catch {
    // 存储失败忽略
  }
}

/**
 * 获取实时天气数据
 * 使用 Open-Meteo API（免费，无需 API Key）
 */
export async function getWeather(loc: LocationData): Promise<WeatherData | null> {
  // 检查缓存
  try {
    const cached = localStorage.getItem(CACHE_KEY_WEATHER);
    if (cached) {
      const data = JSON.parse(cached) as WeatherData;
      if (Date.now() - data.fetchedAt < CACHE_TTL) {
        return data;
      }
    }
  } catch {
    // 缓存读取失败
  }

  const params = new URLSearchParams({
    latitude: loc.latitude.toString(),
    longitude: loc.longitude.toString(),
    current: 'weather_code,temperature_2m,is_day,wind_speed_10m,relative_humidity_2m',
    timezone: 'auto',
  });

  try {
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!resp.ok) return null;
    const data = await resp.json();

    const code = data.current?.weather_code as number;
    const mapping = WMO_CODE_MAP[code] || { type: 'cloudy' as WeatherType, description: '未知' };

    const weather: WeatherData = {
      type: mapping.type,
      code,
      description: mapping.description,
      temperature: Math.round(data.current?.temperature_2m ?? 0),
      isDay: data.current?.is_day === 1,
      windSpeed: Math.round(data.current?.wind_speed_10m ?? 0),
      humidity: data.current?.relative_humidity_2m ?? 0,
      fetchedAt: Date.now(),
    };

    // 缓存
    try {
      localStorage.setItem(CACHE_KEY_WEATHER, JSON.stringify(weather));
    } catch {
      // 存储失败忽略
    }

    return weather;
  } catch {
    return null;
  }
}

/** 获取天气与位置的组合查询 */
export async function getWeatherWithLocation(): Promise<{
  weather: WeatherData | null;
  location: LocationData | null;
}> {
  const location = await getLocation();
  if (!location) return { weather: null, location: null };
  const weather = await getWeather(location);
  return { weather, location };
}
