// 记录类型
export type RecordType = 'water' | 'ultrafiltration' | 'fruit' | 'medication' | 'weight' | 'bloodPressure' | 'dialysisLog';

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

// 体重记录
export interface WeightRecord extends BaseRecord {
  type: 'weight';
  value: number; // 体重 kg
}

// 血压记录
export interface BloodPressureRecord extends BaseRecord {
  type: 'bloodPressure';
  systolic: number; // 收缩压 mmHg
  diastolic: number; // 舒张压 mmHg
  heartRate?: number; // 心率 bpm（可选）
}

// 透析不适症状
export type DialysisSymptom =
  | 'cramps'        // 抽筋
  | 'hypotension'   // 低血压
  | 'stomachPain'   // 胃痛
  | 'fatigue'       // 乏力
  | 'headache'      // 头痛
  | 'nausea'        // 恶心
  | 'chestTightness' // 胸闷
  | 'dizziness'     // 头晕
  | 'itching'       // 皮肤瘙痒
  | 'musclePain'    // 肌肉酸痛
  | 'insomnia'      // 失眠
  | 'other';        // 其他

// 症状中文标签
export const SYMPTOM_LABELS: Record<DialysisSymptom, string> = {
  cramps: '抽筋',
  hypotension: '低血压',
  stomachPain: '胃痛',
  fatigue: '乏力',
  headache: '头痛',
  nausea: '恶心',
  chestTightness: '胸闷',
  dizziness: '头晕',
  itching: '皮肤瘙痒',
  musclePain: '肌肉酸痛',
  insomnia: '失眠',
  other: '其他',
};

// 症状 emoji
export const SYMPTOM_EMOJIS: Record<DialysisSymptom, string> = {
  cramps: '🦵',
  hypotension: '📉',
  stomachPain: '🤢',
  fatigue: '😴',
  headache: '🤕',
  nausea: '🤮',
  chestTightness: '💔',
  dizziness: '😵',
  itching: '🖐️',
  musclePain: '💪',
  insomnia: '😣',
  other: '❓',
};

// 透析日志记录
export interface DialysisLogRecord extends BaseRecord {
  type: 'dialysisLog';
  dialysisDate: number;   // 透析日期时间戳
  duration: number;        // 透析时长（分钟）
  preWeight: number;       // 透析前体重 kg
  postWeight: number;      // 透析后体重 kg
  ultrafiltrationVolume: number; // 超滤量 ml
  systolic: number;        // 透析中收缩压 mmHg
  diastolic: number;       // 透析中舒张压 mmHg
  heartRate: number;       // 透析中心率 bpm
  symptoms: DialysisSymptom[]; // 不适症状
  symptomNote?: string;    // 症状备注
  overallNote?: string;    // 总体备注
  accessType?: string;     // 血管通路类型（内瘘/导管等）
  dialyzerModel?: string;  // 透析器型号
}

// 预警类型
export type AlertType = 'waterExceeded' | 'weightGain' | 'weightGainSevere' | 'bpHigh' | 'bpLow' | 'bpCritical';

// 预警信息
export interface HealthAlert {
  type: AlertType;
  title: string;
  message: string;
  severity: 'warning' | 'danger';
  recommendation: string;
}

// 联合记录类型
export type AnyRecord =
  | WaterRecord
  | UltrafiltrationRecord
  | FruitRecord
  | MedicationRecord
  | WeightRecord
  | BloodPressureRecord
  | DialysisLogRecord;

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
  dryWeight: number; // 干体重 kg（透析后目标体重）
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
  latestWeight: number; // 最新体重 kg（取当日最后一次记录）
  latestSystolic: number; // 最新收缩压 mmHg
  latestDiastolic: number; // 最新舒张压 mmHg
  latestHeartRate: number; // 最新心率 bpm
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

// ============ 化验报告 ============

/** 化验指标项 */
export interface LabMetric {
  /** 指标键名 */
  key: LabMetricKey;
  /** 数值 */
  value: number;
  /** 单位 */
  unit: string;
}

/** 化验指标键名 */
export type LabMetricKey =
  | 'hemoglobin'       // 血红蛋白
  | 'creatinine'       // 血肌酐
  | 'bun'              // 尿素氮
  | 'potassium'        // 血钾
  | 'phosphorus'       // 血磷
  | 'calcium'          // 血钙
  | 'pth'              // 甲状旁腺激素
  | 'albumin'          // 白蛋白
  | 'tsat'             // 转铁蛋白饱和度
  | 'ferritin'         // 铁蛋白
  | 'crp'              // C反应蛋白
  | 'uricAcid';        // 尿酸

/** 化验指标元数据（名称、单位、正常范围） */
export interface LabMetricMeta {
  key: LabMetricKey;
  label: string;
  unit: string;
  /** 透析患者目标范围（下限） */
  min: number;
  /** 透析患者目标范围（上限） */
  max: number;
  /** 指标说明 */
  description: string;
  /** 偏低时的建议 */
  lowAdvice?: string;
  /** 偏高时的建议 */
  highAdvice?: string;
}

/** 化验指标元数据常量 */
export const LAB_METRICS: LabMetricMeta[] = [
  {
    key: 'hemoglobin',
    label: '血红蛋白',
    unit: 'g/L',
    min: 110,
    max: 120,
    description: '反映贫血状况，透析患者目标 110-120 g/L',
    lowAdvice: '血红蛋白偏低，建议评估促红素用量和铁储备，必要时调整治疗方案',
    highAdvice: '血红蛋白偏高，促红素可能需减量，注意血栓风险',
  },
  {
    key: 'creatinine',
    label: '血肌酐',
    unit: 'μmol/L',
    min: 400,
    max: 800,
    description: '反映肾功能，透析患者通常显著升高',
    lowAdvice: '血肌酐偏低可能提示营养不足，需评估蛋白质摄入',
    highAdvice: '血肌酐偏高，可能与透析充分性有关，建议评估透析处方',
  },
  {
    key: 'bun',
    label: '尿素氮',
    unit: 'mmol/L',
    min: 7.1,
    max: 14.3,
    description: '反映蛋白质代谢和透析充分性',
    lowAdvice: '尿素氮偏低，可能提示蛋白质摄入不足',
    highAdvice: '尿素氮偏高，可能与蛋白质摄入过多或透析不充分有关',
  },
  {
    key: 'potassium',
    label: '血钾',
    unit: 'mmol/L',
    min: 3.5,
    max: 5.5,
    description: '电解质平衡，透析患者需严格控制',
    lowAdvice: '血钾偏低，注意补充含钾食物，避免低钾心律失常',
    highAdvice: '血钾偏高！严格控制高钾食物摄入，警惕心律失常风险',
  },
  {
    key: 'phosphorus',
    label: '血磷',
    unit: 'mmol/L',
    min: 0.87,
    max: 1.45,
    description: '磷代谢指标，透析患者目标 0.87-1.45',
    lowAdvice: '血磷偏低，注意磷结合剂用量',
    highAdvice: '血磷偏高，加强低磷饮食，调整磷结合剂用量',
  },
  {
    key: 'calcium',
    label: '血钙',
    unit: 'mmol/L',
    min: 2.1,
    max: 2.54,
    description: '钙磷代谢平衡，透析患者目标 2.1-2.54',
    lowAdvice: '血钙偏低，注意钙剂和活性维生素D补充',
    highAdvice: '血钙偏高，注意钙剂减量，监测血管钙化风险',
  },
  {
    key: 'pth',
    label: '甲状旁腺激素',
    unit: 'pg/mL',
    min: 150,
    max: 300,
    description: '骨矿物质代谢指标，透析患者目标 150-300',
    lowAdvice: 'PTH偏低，注意低转运骨病风险',
    highAdvice: 'PTH偏高，注意继发性甲旁亢，评估拟钙剂使用',
  },
  {
    key: 'albumin',
    label: '白蛋白',
    unit: 'g/L',
    min: 40,
    max: 55,
    description: '反映营养状态，透析患者目标 ≥40 g/L',
    lowAdvice: '白蛋白偏低，提示营养不良，需增加蛋白质摄入',
    highAdvice: '白蛋白正常偏高，营养状态良好',
  },
  {
    key: 'tsat',
    label: '转铁蛋白饱和度',
    unit: '%',
    min: 20,
    max: 50,
    description: '铁利用指标，透析患者目标 20-50%',
    lowAdvice: 'TSAT偏低，铁利用不足，建议补充静脉铁剂',
    highAdvice: 'TSAT偏高，注意铁过量风险',
  },
  {
    key: 'ferritin',
    label: '铁蛋白',
    unit: 'ng/mL',
    min: 200,
    max: 500,
    description: '铁储备指标，透析患者目标 200-500',
    lowAdvice: '铁蛋白偏低，铁储备不足，建议补铁',
    highAdvice: '铁蛋白偏高，暂停补铁，注意铁过载风险',
  },
  {
    key: 'crp',
    label: 'C反应蛋白',
    unit: 'mg/L',
    min: 0,
    max: 10,
    description: '炎症指标，反映体内炎症状态',
    lowAdvice: 'CRP正常，无明显炎症',
    highAdvice: 'CRP偏高，提示体内有炎症，需进一步排查感染或慢性炎症',
  },
  {
    key: 'uricAcid',
    label: '尿酸',
    unit: 'μmol/L',
    min: 200,
    max: 420,
    description: '嘌呤代谢指标',
    lowAdvice: '尿酸偏低，一般无临床意义',
    highAdvice: '尿酸偏高，注意低嘌呤饮食，必要时药物干预',
  },
];

/** 化验报告记录 */
export interface LabReport {
  id: string;
  /** 报告日期时间戳 */
  date: number;
  /** 医院名称（可选） */
  hospital?: string;
  /** 指标列表 */
  metrics: LabMetric[];
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: number;
}
