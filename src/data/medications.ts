/**
 * 内置药物库（透析患者常用药物）
 *
 * 覆盖肾友日常用药主要类别：
 * - 磷结合剂：碳酸钙、司维拉姆、碳酸镧
 * - 维生素/矿物质：骨化三醇、碳酸氢钠
 * - 降压药：氨氯地平、缬沙坦
 * - 促红素：重组人促红素 EPO
 * - 铁剂：蔗糖铁
 */

import type { Medication } from '@/types';

/** 真实配图 URL 生成（按图片规范使用内置 text_to_image API） */
function imageFor(prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encoded}&image_size=square`;
}

export const BUILTIN_MEDICATIONS: Medication[] = [
  // —— 磷结合剂 ——
  {
    id: 'med-calcium-carbonate',
    name: '碳酸钙',
    emoji: '💊',
    category: 'phosphate-binder',
    usage: {
      unit: '片',
      defaultDose: 1,
      frequency: '每日3次（随餐）',
      timing: '随餐嚼服',
      schedule: ['早', '中', '晚'],
    },
    purpose: '磷结合剂，降血磷；同时补充钙质',
    description:
      '碳酸钙是透析患者最常用的磷结合剂之一，与食物同服可在肠道与磷酸根结合，减少磷的吸收，同时补充钙质。',
    usageNotes:
      '必须随餐嚼服或碾碎混入食物中，餐后服用无效。避免与含铁剂、四环素同服。注意监测血钙，避免高钙血症。',
    ingredients: '碳酸钙 1500mg（含元素钙 600mg）',
    sideEffects: '便秘、腹胀、高钙血症、低磷血症',
    image: imageFor('a medical pill bottle of calcium carbonate tablets, clean white background, pharmaceutical product photo, realistic, high detail'),
    isCustom: false,
    level: 'low',
  },
  {
    id: 'med-sevelamer',
    name: '司维拉姆',
    emoji: '💊',
    category: 'phosphate-binder',
    usage: {
      unit: '片',
      defaultDose: 1,
      frequency: '每日3次（随餐）',
      timing: '随餐吞服',
      schedule: ['早', '中', '晚'],
    },
    purpose: '非含钙磷结合剂，降血磷，不增加血钙',
    description:
      '司维拉姆为非钙非铝的磷结合剂，适合高血钙或血管钙化风险高的患者，通过离子交换在肠道结合磷酸根。',
    usageNotes:
      '必须随餐服用，整片吞服不可嚼碎。需大量饮水。可能影响脂溶性维生素吸收。',
    ingredients: '盐酸司维拉姆 800mg',
    sideEffects: '胃肠道不适、恶心、便秘',
    image: imageFor('sevelamer hydrochloride tablets in blister pack, white pharmaceutical packaging, clean studio photo, realistic'),
    isCustom: false,
    level: 'low',
  },
  {
    id: 'med-lanthanum',
    name: '碳酸镧',
    emoji: '💊',
    category: 'phosphate-binder',
    usage: {
      unit: '片',
      defaultDose: 1,
      frequency: '每日3次（随餐）',
      timing: '随餐嚼服',
      schedule: ['早', '中', '晚'],
    },
    purpose: '高效磷结合剂，降血磷',
    description:
      '碳酸镧是一种高效的非钙磷结合剂，与磷结合力强，剂量小，适合不能耐受大剂量药片者。',
    usageNotes: '必须嚼碎后随餐服用。长期使用需监测血镧水平。',
    ingredients: '碳酸镧 500mg / 750mg / 1000mg',
    sideEffects: '恶心、呕吐、便秘',
    image: imageFor('lanthanum carbonate chewable tablets, white pharmaceutical bottle, isolated on white background, realistic medical photo'),
    isCustom: false,
    level: 'low',
  },

  // —— 维生素 / 矿物质 ——
  {
    id: 'med-calcitriol',
    name: '骨化三醇',
    emoji: '💊',
    category: 'vitamin',
    usage: {
      unit: '粒',
      defaultDose: 1,
      frequency: '每日1次',
      timing: '睡前或晨起空腹',
      schedule: ['睡前'],
    },
    purpose: '活性维生素D，调节钙磷代谢，治疗继发性甲旁亢',
    description:
      '骨化三醇（1,25-二羟维生素D3）是活性维生素D，无需肝肾羟化即可直接发挥作用，用于慢性肾衰竭继发性甲旁亢。',
    usageNotes:
      '需定期监测血钙、血磷、PTH。避免与含镁抗酸剂同服。出现高钙血症应立即停药。',
    ingredients: '骨化三醇 0.25μg',
    sideEffects: '高钙血症、口渴、食欲不振',
    image: imageFor('calcitriol soft gelatin capsules, small red oval pills, blister pack, white background, pharmaceutical product photo, realistic'),
    isCustom: false,
    level: 'low',
  },
  {
    id: 'med-sodium-bicarbonate',
    name: '碳酸氢钠',
    emoji: '💊',
    category: 'vitamin',
    usage: {
      unit: '片',
      defaultDose: 2,
      frequency: '每日3次',
      timing: '饭后',
      schedule: ['早', '中', '晚'],
    },
    purpose: '纠正代谢性酸中毒，碱化尿液',
    description:
      '碳酸氢钠片用于纠正慢性肾衰竭患者的代谢性酸中毒，维持血碳酸氢根在 22mmol/L 以上。',
    usageNotes: '餐后服用减少胃肠刺激。注意监测血钠，可能加重水钠潴留。',
    ingredients: '碳酸氢钠 500mg',
    sideEffects: '腹胀、嗳气、水钠潴留',
    image: imageFor('sodium bicarbonate tablets in white bottle, simple pharmaceutical packaging, white background, realistic medical photo'),
    isCustom: false,
    level: 'low',
  },

  // —— 降压药 ——
  {
    id: 'med-amlodipine',
    name: '氨氯地平',
    emoji: '💊',
    category: 'antihypertensive',
    usage: {
      unit: '片',
      defaultDose: 1,
      frequency: '每日1次',
      timing: '晨起',
      schedule: ['早'],
    },
    purpose: '钙通道阻滞剂，降压',
    description:
      '氨氯地平为二氢吡啶类钙通道阻滞剂，长效降压，透析患者常用，对容量依赖性高血压效果好。',
    usageNotes: '可能引起踝部水肿。透析患者通常无需调整剂量。',
    ingredients: '苯磺酸氨氯地平 5mg',
    sideEffects: '踝部水肿、头痛、面部潮红',
    image: imageFor('amlodipine besylate tablets white round pills, pharmaceutical blister pack, white background, realistic medical photo'),
    isCustom: false,
    level: 'low',
  },
  {
    id: 'med-valsartan',
    name: '缬沙坦',
    emoji: '💊',
    category: 'antihypertensive',
    usage: {
      unit: '粒',
      defaultDose: 1,
      frequency: '每日1次',
      timing: '晨起',
      schedule: ['早'],
    },
    purpose: 'ARB类降压药，保护残余肾功能',
    description:
      '缬沙坦为血管紧张素II受体拮抗剂（ARB），降压同时可减少尿蛋白，保护残余肾功能。',
    usageNotes: '双侧肾动脉狭窄禁用。监测血钾，可能升高血钾。',
    ingredients: '缬沙坦 80mg',
    sideEffects: '头晕、高钾血症',
    image: imageFor('valsartan capsules pink and yellow, pharmaceutical blister pack, white background, realistic medical product photo'),
    isCustom: false,
    level: 'low',
  },

  // —— 促红素 ——
  {
    id: 'med-epoetin',
    name: '重组人促红素',
    emoji: '💉',
    category: 'esa',
    usage: {
      unit: '支',
      defaultDose: 1,
      frequency: '每周2-3次（皮下或静脉）',
      timing: '透析时静脉或皮下',
      schedule: ['周一', '周三', '周五'],
    },
    purpose: '治疗肾性贫血，提高血红蛋白',
    description:
      '重组人促红细胞生成素（EPO）用于慢性肾衰竭所致肾性贫血，刺激骨髓红系造血，提升Hb至目标范围（100-120g/L）。',
    usageNotes:
      '皮下或静脉注射。需监测血压、Hb、铁蛋白、TSAT。Hb上升过快需减量。',
    ingredients: '重组人促红素 2000IU / 3000IU / 4000IU',
    sideEffects: '高血压、血栓、纯红再障（罕见）',
    image: imageFor('epoetin alfa injection vials, small glass vials with rubber stopper, pharmaceutical product photo, white background, realistic'),
    isCustom: false,
    level: 'low',
  },

  // —— 铁剂 ——
  {
    id: 'med-iron-sucrose',
    name: '蔗糖铁',
    emoji: '💉',
    category: 'iron',
    usage: {
      unit: '支',
      defaultDose: 1,
      frequency: '每周1-3次（静脉，透析时）',
      timing: '透析时静脉滴注',
      schedule: ['透析日'],
    },
    purpose: '静脉铁剂，纠正缺铁性贫血，配合EPO治疗',
    description:
      '蔗糖铁为静脉用铁剂，用于口服铁剂不耐受或无效的透析患者，与EPO协同维持铁储备和血红蛋白。',
    usageNotes:
      '必须静脉滴注，透析时使用。监测铁蛋白和转铁蛋白饱和度，避免铁过载。滴注速度宜慢。',
    ingredients: '蔗糖铁 100mg/5ml',
    sideEffects: '低血压、过敏反应、味觉异常',
    image: imageFor('iron sucrose injection dark brown glass vial, pharmaceutical product photo, white background, realistic'),
    isCustom: false,
    level: 'low',
  },
];

export const MEDICATION_CATEGORIES: Record<
  Medication['category'],
  { name: string; color: string; bg: string; ring: string }
> = {
  'phosphate-binder': {
    name: '磷结合剂',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    ring: 'ring-blue-200',
  },
  vitamin: {
    name: '维生素/矿物质',
    color: 'text-green-600',
    bg: 'bg-green-50',
    ring: 'ring-green-200',
  },
  antihypertensive: {
    name: '降压药',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    ring: 'ring-purple-200',
  },
  esa: {
    name: '促红细胞生成剂',
    color: 'text-red-600',
    bg: 'bg-red-50',
    ring: 'ring-red-200',
  },
  iron: {
    name: '铁剂',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    ring: 'ring-orange-200',
  },
  other: {
    name: '其他',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    ring: 'ring-gray-200',
  },
};
