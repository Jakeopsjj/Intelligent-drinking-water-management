// 记录类型
export type RecordType = 'water' | 'ultrafiltration' | 'fruit' | 'medication';

// 钾含量等级
export type PotassiumLevel = 'low' | 'medium' | 'high';

// 基础记录
export interface BaseRecord {
  id: string;
  timestamp: number; // 记录时间戳
  type: RecordType;
}

// 饮水记录
export interface WaterRecord extends BaseRecord {
  type: 'water';
  amount: number; // 毫升
}

// 超滤量记录
export interface UltrafiltrationRecord extends BaseRecord {
  type: 'ultrafiltration';
  amount: number; // 毫升
}

// 水果摄入记录
export interface FruitRecord extends BaseRecord {
  type: 'fruit';
  fruitId: string;
  fruitName: string;
  fruitEmoji: string;
  weight: number; // 克
  potassium: number; // 自动计算所得的钾摄入量 mg
  phosphorus: number; // 自动计算所得的磷摄入量 mg
  sodium: number; // 自动计算所得的钠摄入量 mg
  water: number; // 自动计算所得的水分摄入量 ml（水果含水量）
}

// 服药记录
export interface MedicationRecord extends BaseRecord {
  type: 'medication';
  medicationId: string;
  medicationName: string;
  medicationEmoji: string;
  dose: number; // 本次剂量（单位按药物定义，如片/粒/ml）
  unit: string; // 剂量单位（片/粒/ml/支...）
  timesOfDay?: string; // 哪一次服用（早/中/晚/睡前）
  note?: string; // 备注（如饭后/空腹等）
}

// 联合记录类型
export type AnyRecord =
  | WaterRecord
  | UltrafiltrationRecord
  | FruitRecord
  | MedicationRecord;

// 水果定义
export interface Fruit {
  id: string;
  name: string;
  emoji: string;
  potassiumPer100g: number; // 每100g含钾量 mg
  phosphorusPer100g: number; // 每100g含磷量 mg
  sodiumPer100g: number; // 每100g含钠量 mg
  waterPer100g: number; // 每100g含水量 ml（约等于 g）
  level: PotassiumLevel; // 钾含量等级（主参考）
  suggestion: string; // 食用建议
  isCustom?: boolean; // 是否自定义添加
  // 详情扩展字段
  description?: string; // 水果介绍
  usage?: string; // 食用方法/注意事项
  nutrients?: string; // 营养成分描述（自由文本）
  image?: string; // 真实配图 URL
  aliases?: string; // 别名（如 苹果·西洋苹果）
  // 仿维基百科扩展字段
  origin?: string; // 起源与分布
  varieties?: string; // 主要品种
  cultivation?: string; // 栽培与生产
  culture?: string; // 文化与历史
  healthBenefits?: string; // 健康益处
  precautions?: string; // 食用禁忌与注意事项
  storage?: string; // 保存方法
}

// 药物使用方法
export interface MedicationUsage {
  unit: string; // 剂量单位：片/粒/ml/支/喷...
  defaultDose: number; // 单次默认剂量
  frequency: string; // 频次说明：每日1次 / 每日2次(早晚) / 隔日1次...
  timing: string; // 服用时间：饭后/空腹/睡前/随餐...
  schedule?: string[]; // 推荐时段：['早','晚'] 等
}

// 药物定义
export interface Medication {
  id: string;
  name: string;
  emoji: string;
  category: MedicationCategory; // 药物分类
  usage: MedicationUsage; // 使用方法
  purpose?: string; // 主要作用/适应症
  description?: string; // 药物介绍
  usageNotes?: string; // 使用说明/注意事项
  ingredients?: string; // 主要成分
  sideEffects?: string; // 常见不良反应
  contraindications?: string; // 禁忌症
  pharmacology?: string; // 药理毒理
  drugInteractions?: string; // 药物相互作用
  storage?: string; // 贮藏
  packaging?: string; // 包装
  shelfLife?: string; // 有效期
  manufacturer?: string; // 生产企业
  approvalNumber?: string; // 批准文号
  image?: string; // 真实配图 URL
  isCustom?: boolean;
  level?: PotassiumLevel; // 保留 level 字段以便复用 LEVEL_COLORS（默认 medium）
  // 仿百度百科扩展字段（不删除现有字段）
  indications?: string; // 适应症
  pharmacokinetics?: string; // 药代动力学
  overdose?: string; // 药物过量
  warnings?: string; // 警告与注意事项
  useInPregnancy?: string; // 孕妇及哺乳期妇女用药
  useInChildren?: string; // 儿童用药
  useInElderly?: string; // 老年患者用药
}

// 药物分类
export type MedicationCategory =
  | 'phosphate-binder' // 磷结合剂
  | 'vitamin' // 维生素/矿物质
  | 'antihypertensive' // 降压药
  | 'diuretic' // 利尿剂
  | 'esa' // 促红细胞生成剂
  | 'iron' // 铁剂
  | 'other'; // 其他

// 用户设置
export interface UserSettings {
  dailyWaterLimit: number; // 每日摄水限额 ml
  dailyPotassiumLimit: number; // 每日钾摄入限额 mg
  dailyPhosphorusLimit: number; // 每日磷摄入限额 mg
  dailySodiumLimit: number; // 每日钠摄入限额 mg
  dailyFruitLimit: number; // 每日水果限额 g
  dailyUltrafiltrationTarget: number; // 每日超滤目标 ml
  userName?: string;
  userAvatar?: string; // 用户头像（emoji 或 data:image base64 字符串）
  dialysisSchedule?: string; // 透析日程备注
  initialized: boolean; // 是否已完成初始设置
}

// 当日指标聚合
export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  water: number; // 当日摄水量 ml（饮水 + 水果水分）
  ultrafiltration: number; // 当日超滤量 ml
  fruit: number; // 当日水果摄入量 g
  potassium: number; // 当日钾摄入量 mg
  phosphorus: number; // 当日磷摄入量 mg
  sodium: number; // 当日钠摄入量 mg
  fruitWater: number; // 当日水果水分摄入量 ml（water 的子集）
  medicationCount: number; // 当日服药次数
  records: AnyRecord[]; // 当日所有记录
}

// 时段分布项
export interface HourlyDistribution {
  hour: string; // "08时"
  amount: number; // 该时段摄入量 ml
}

// 服药计划项
export interface MedicationPlanItem {
  id: string;
  medicationId: string;   // 关联药物库的 ID（可选，也可手动输入）
  medicationName: string;  // 药物名称
  emoji: string;           // 药物 emoji
  dosage: number;          // 每次剂量（数量）
  unit: string;            // 剂量单位（片/粒/ml...）
  times: string[];         // 服用时间列表 HH:mm（如 ["08:00", "20:00"]，每个时间点独立提醒）
  daysOfWeek: number[];    // 每周哪几天 [0-6]，[] 表示每天
  enabled: boolean;        // 是否启用
  notes?: string;         // 备注（如"饭后服用"）
  createdAt: number;      // 创建时间
}
