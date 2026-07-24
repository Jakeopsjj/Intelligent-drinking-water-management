/**
 * 天气-关键词映射 JS 对象（独立模块）
 *
 * 用途：
 *   - 供 weather_theme/index.html 引用（也可独立 import 用于 React 组件）
 *   - 供离线素材批量下载脚本参考（OFFLINE_ASSETS_LIST.md）
 *
 * 包含两套映射：
 *   1. static —— 静态图关键词（用于 Pexels Photo API / 离线 .jpg 命名）
 *   2. video  —— 循环视频关键词（用于 Pexels Video API / 离线 .mp4 命名）
 *
 * 命名规则：{weatherType}-{period}
 *   weatherType ∈ clear | cloudy | overcast | fog | drizzle | rain | heavy-rain | snow | thunderstorm
 *   period      ∈ dawn  | day    | dusk     | night
 *
 * WMO Weather Code → weatherType 映射见 WMO_CODE_MAP
 */
'use strict';

/** WMO Weather Code → 天气类型 */
const WMO_CODE_MAP = {
  0:  'clear',         // 晴朗
  1:  'clear',         // 多数晴朗
  2:  'cloudy',        // 局部多云
  3:  'overcast',      // 阴天
  45: 'fog',           // 雾
  48: 'fog',           // 雾凇
  51: 'drizzle',       // 轻度毛毛雨
  53: 'drizzle',       // 中度毛毛雨
  55: 'drizzle',       // 强度毛毛雨
  56: 'drizzle',       // 轻度冻毛毛雨
  57: 'drizzle',       // 强度冻毛毛雨
  61: 'rain',          // 小雨
  63: 'rain',          // 中雨
  65: 'heavy-rain',    // 大雨
  66: 'rain',          // 轻度冻雨
  67: 'heavy-rain',    // 强度冻雨
  71: 'snow',          // 小雪
  73: 'snow',          // 中雪
  75: 'snow',          // 大雪
  77: 'snow',          // 雪粒
  80: 'rain',          // 小阵雨
  81: 'rain',          // 中阵雨
  82: 'heavy-rain',    // 大阵雨
  85: 'snow',          // 小阵雪
  86: 'snow',          // 大阵雪
  95: 'thunderstorm',  // 雷暴
  96: 'thunderstorm',  // 雷暴伴小冰雹
  99: 'thunderstorm',  // 雷暴伴大冰雹
};

/** 时段列表 */
const TIME_PERIODS = ['dawn', 'day', 'dusk', 'night'];

/** 天气类型列表 */
const WEATHER_TYPES = [
  'clear', 'cloudy', 'overcast', 'fog', 'drizzle',
  'rain', 'heavy-rain', 'snow', 'thunderstorm'
];

/**
 * 静态图关键词映射
 * 键：{weatherType}-{period}
 * 值：{ en: 英文关键词(Pexels搜索), zh: 中文描述 }
 */
const STATIC_KEYWORD_MAP = {
  // === 晴天 ===
  'clear-dawn':      { en: 'sunrise mountain landscape',       zh: '日出 山景' },
  'clear-day':       { en: 'clear blue sky landscape',         zh: '晴天 蓝天 风景' },
  'clear-dusk':      { en: 'sunset golden hour landscape',     zh: '日落 黄昏 风景' },
  'clear-night':     { en: 'starry night sky landscape',       zh: '星空 夜景' },

  // === 多云 ===
  'cloudy-dawn':     { en: 'cloudy sunrise landscape',         zh: '多云 日出' },
  'cloudy-day':      { en: 'partly cloudy sky landscape',      zh: '多云 风景' },
  'cloudy-dusk':     { en: 'cloudy sunset landscape',          zh: '多云 日落' },
  'cloudy-night':    { en: 'cloudy night sky landscape',       zh: '多云 夜景' },

  // === 阴天 ===
  'overcast-dawn':   { en: 'overcast sky morning landscape',   zh: '阴天 早晨' },
  'overcast-day':    { en: 'overcast sky landscape',           zh: '阴天 风景' },
  'overcast-dusk':   { en: 'overcast sunset landscape',        zh: '阴天 黄昏' },
  'overcast-night':  { en: 'overcast night landscape',         zh: '阴天 夜景' },

  // === 雾 ===
  'fog-dawn':        { en: 'foggy morning forest landscape',   zh: '雾 早晨 森林' },
  'fog-day':         { en: 'foggy landscape mountains',        zh: '雾 风景 山' },
  'fog-dusk':        { en: 'foggy sunset landscape',           zh: '雾 黄昏' },
  'fog-night':       { en: 'foggy night landscape',            zh: '雾 夜景' },

  // === 毛毛雨 ===
  'drizzle-dawn':    { en: 'light rain morning landscape',     zh: '小雨 早晨' },
  'drizzle-day':     { en: 'light rain landscape',             zh: '小雨 风景' },
  'drizzle-dusk':    { en: 'light rain sunset landscape',     zh: '小雨 日落' },
  'drizzle-night':   { en: 'light rain night landscape',       zh: '小雨 夜景' },

  // === 雨 ===
  'rain-dawn':       { en: 'rainy morning landscape',          zh: '雨 早晨' },
  'rain-day':        { en: 'rainy day landscape',              zh: '雨 风景' },
  'rain-dusk':       { en: 'rainy sunset landscape',           zh: '雨 日落' },
  'rain-night':      { en: 'rainy night street landscape',     zh: '雨 夜景' },

  // === 大雨 ===
  'heavy-rain-dawn': { en: 'heavy rain storm landscape',       zh: '大雨 暴雨' },
  'heavy-rain-day':  { en: 'heavy rain storm landscape',       zh: '大雨 暴雨' },
  'heavy-rain-dusk': { en: 'heavy rain storm sunset',          zh: '大雨 暴雨 日落' },
  'heavy-rain-night':{ en: 'heavy rain night storm',           zh: '大雨 夜景' },

  // === 雪 ===
  'snow-dawn':       { en: 'snowy morning landscape',          zh: '雪 早晨' },
  'snow-day':        { en: 'snowy landscape mountains',        zh: '雪 风景' },
  'snow-dusk':       { en: 'snowy sunset landscape',           zh: '雪 日落' },
  'snow-night':      { en: 'snowy night landscape',            zh: '雪 夜景' },

  // === 雷暴 ===
  'thunderstorm-dawn':  { en: 'thunderstorm lightning landscape', zh: '雷雨 闪电' },
  'thunderstorm-day':   { en: 'thunderstorm lightning landscape', zh: '雷雨 闪电' },
  'thunderstorm-dusk':  { en: 'thunderstorm sunset lightning',    zh: '雷雨 日落' },
  'thunderstorm-night': { en: 'thunderstorm night lightning',     zh: '雷雨 夜景' },
};

/**
 * 循环视频关键词映射
 * 键：{weatherType}-{period}
 * 值：{ en: 英文关键词(Pexels Video搜索), zh: 中文描述 }
 *
 * 注：视频素材可只覆盖主要场景（9种天气 × 4时段 = 36，实际覆盖 14 个核心场景即可）
 */
const VIDEO_KEYWORD_MAP = {
  // === 晴天 ===
  'clear-dawn':      { en: 'sunrise time lapse',          zh: '日出 延时' },
  'clear-day':       { en: 'blue sky clouds time lapse',  zh: '蓝天 云 延时' },
  'clear-dusk':      { en: 'sunset time lapse',           zh: '日落 延时' },
  'clear-night':     { en: 'starry night sky time lapse', zh: '星空 延时' },

  // === 多云 ===
  'cloudy-day':      { en: 'clouds moving time lapse',    zh: '云 流动 延时' },
  'cloudy-night':    { en: 'night clouds time lapse',     zh: '夜晚 云 延时' },

  // === 阴天 ===
  'overcast-day':    { en: 'overcast sky time lapse',     zh: '阴天 延时' },

  // === 雾 ===
  'fog-day':         { en: 'foggy forest video',          zh: '雾 森林 视频' },

  // === 雨 ===
  'rain-day':        { en: 'rain falling video',          zh: '下雨 视频' },
  'rain-night':      { en: 'rain night window video',     zh: '雨夜 窗户' },

  // === 大雨 ===
  'heavy-rain-day':  { en: 'heavy rain storm video',      zh: '暴雨 视频' },

  // === 雪 ===
  'snow-day':        { en: 'snow falling video',          zh: '雪 延时' },
  'snow-night':      { en: 'snow night video',            zh: '雪夜 视频' },

  // === 雷暴 ===
  'thunderstorm-day':  { en: 'thunderstorm lightning video', zh: '雷雨 闪电 视频' },
  'thunderstorm-night':{ en: 'thunderstorm night video',     zh: '雷雨 夜景' },
};

/**
 * 根据天气编码 + 时段获取素材关键词
 * @param {number} wmoCode  WMO Weather Code
 * @param {string} period   dawn | day | dusk | night
 * @param {string} kind     'static' | 'video'
 * @returns {{en: string, zh: string}}
 */
function getKeyword(wmoCode, period, kind = 'static') {
  const weatherType = WMO_CODE_MAP[wmoCode] || 'cloudy';
  const key = `${weatherType}-${period}`;
  const map = kind === 'video' ? VIDEO_KEYWORD_MAP : STATIC_KEYWORD_MAP;
  return map[key] || map['clear-day'];
}

/**
 * 根据 WMO Code 获取天气类型
 */
function getWeatherType(wmoCode) {
  return WMO_CODE_MAP[wmoCode] || 'cloudy';
}

/**
 * 生成离线素材完整清单（用于批量下载）
 * @returns {Array<{filename: string, keyword: string, zh: string}>}
 */
function generateOfflineAssetsList() {
  const list = [];
  for (const type of WEATHER_TYPES) {
    for (const period of TIME_PERIODS) {
      const key = `${type}-${period}`;
      const item = STATIC_KEYWORD_MAP[key];
      if (item) {
        list.push({
          filename: `${key}.jpg`,
          keyword: item.en,
          zh: item.zh,
        });
      }
    }
  }
  return list;
}

// CommonJS / ES Module 双兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WMO_CODE_MAP,
    TIME_PERIODS,
    WEATHER_TYPES,
    STATIC_KEYWORD_MAP,
    VIDEO_KEYWORD_MAP,
    getKeyword,
    getWeatherType,
    generateOfflineAssetsList,
  };
}

if (typeof window !== 'undefined') {
  window.WeatherKeywords = {
    WMO_CODE_MAP,
    TIME_PERIODS,
    WEATHER_TYPES,
    STATIC_KEYWORD_MAP,
    VIDEO_KEYWORD_MAP,
    getKeyword,
    getWeatherType,
    generateOfflineAssetsList,
  };
}
