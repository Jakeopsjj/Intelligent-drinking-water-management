/**
 * 内置药物库（透析患者常用药物）
 *
 * 覆盖肾友日常用药主要类别：
 * - 磷结合剂：碳酸钙、司维拉姆、碳酸镧
 * - 维生素/矿物质：骨化三醇、碳酸氢钠
 * - 降压药：氨氯地平、缬沙坦
 * - 促红素：重组人促红素 EPO
 * - 铁剂：蔗糖铁
 *
 * 配图与介绍由详情页自动联网获取（维基百科），无需在此硬编码
 */

import type { Medication } from '@/types';

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
    contraindications:
      '高钙血症、高钙尿症、洋地黄中毒患者禁用；对本品任何成分过敏者禁用。',
    pharmacology:
      '在胃酸作用下转化为氯化钙，肠道内与食物中磷酸根结合形成不溶性磷酸钙随粪便排出，减少磷的吸收，同时补充元素钙。过量可致高钙血症、软组织钙化。',
    drugInteractions:
      '与四环素、喹诺酮类、铁剂同服可影响其吸收；与噻嗪类利尿剂合用增加高钙血症风险；与洋地黄类合用易诱发心律失常；避免与含镁抗酸剂大量合用。',
    storage: '遮光、密封，在干燥处保存（不超过30℃）。',
    packaging: '铝塑包装，每板12片，每盒2板。',
    shelfLife: '24个月',
    manufacturer: '北京赛而生物药业有限公司',
    approvalNumber: '国药准字H20093374',
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
    contraindications:
      '低磷血症、肠梗阻患者禁用；对本品任何成分过敏者禁用；吞咽困难者慎用。',
    pharmacology:
      '盐酸司维拉姆为非吸收性阳离子聚合物，在肠道内通过离子交换和氢键结合磷酸根，形成不溶性复合物随粪便排出，不增加钙负荷，几乎不被吸收。',
    drugInteractions:
      '可降低环丙沙星、霉酚酸酯、左甲状腺素的生物利用度，应错时服用；可能影响脂溶性维生素D、E、K的吸收；服用本品前后1小时内避免服用其他口服药物。',
    storage: '遮光、密封，在25℃以下干燥处保存。',
    packaging: '高密度聚乙烯瓶装，每瓶180片；或铝塑包装，每板10片，每盒3板。',
    shelfLife: '24个月',
    manufacturer: 'Genzyme Ireland Ltd.',
    approvalNumber: '国药准字J20140156',
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
    contraindications:
      '低磷血症患者禁用；对本品任何成分过敏者禁用；严重肝功能不全者禁用。',
    pharmacology:
      '镧离子在胃酸中释放，在肠道与磷酸根形成极难溶的磷酸镧随粪便排出，磷结合力强；少量吸收的镧主要经胆汁排泄。长期使用的镧蓄积和组织沉积风险较低。',
    drugInteractions:
      '与四环素、喹诺酮类同服可降低其血药浓度；与氯喹、酮康唑等需错时服用；不影响华法林、地高辛的药代动力学。',
    storage: '遮光、密封，在25℃以下保存。',
    packaging: '铝塑包装，每板10片，每盒3板（500mg / 750mg / 1000mg）。',
    shelfLife: '24个月',
    manufacturer: 'Shire Pharmaceuticals Ireland Limited',
    approvalNumber: '国药准字H20171119',
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
    contraindications:
      '高钙血症、高钙尿症、高磷血症伴肾结石、维生素D中毒者禁用；对本品任何成分过敏者禁用。',
    pharmacology:
      '为1,25-二羟维生素D3，活性形式，无需肝肾羟化即可作用于肠道、骨骼和甲状旁腺，促进钙磷吸收、调节骨矿化和PTH分泌。过量可致高钙血症、软组织钙化。',
    drugInteractions:
      '与噻嗪类利尿剂合用增加高钙血症风险；与含镁抗酸剂、泻药合用可致高镁血症；与洋地黄类合用易诱发心律失常；与糖皮质激素、苯妥英、巴比妥类合用可降低其疗效。',
    storage: '遮光、密封，在阴凉干燥处保存（不超过25℃）。',
    packaging: '铝塑包装，每板10粒，每盒2板（0.25μg）。',
    shelfLife: '24个月',
    manufacturer: '上海罗氏制药有限公司',
    approvalNumber: '国药准字H20140313',
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
    contraindications:
      '代谢性或呼吸性碱中毒、低钙血症患者禁用；严重水肿、未控制的高血压慎用或禁用；对本品任何成分过敏者禁用。',
    pharmacology:
      '口服后迅速中和胃酸并提高血碳酸氢根浓度，纠正代谢性酸中毒；可碱化尿液。过量可致代谢性碱中毒、水钠潴留、低钾血症。',
    drugInteractions:
      '与四环素、喹诺酮类同服可减少其吸收；与含钙制剂同服可致乳碱综合征；与排钾利尿剂合用增加低钾风险；可影响弱酸性药物（如水杨酸类、磺胺类）的肾排泄。',
    storage: '遮光、密封，在干燥处保存（不超过30℃）。',
    packaging: '塑料瓶装，每瓶100片（500mg）。',
    shelfLife: '24个月',
    manufacturer: '天津力生制药股份有限公司',
    approvalNumber: '国药准字H12021517',
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
    contraindications:
      '对二氢吡啶类药物过敏者禁用；严重低血压、心源性休克、严重主动脉瓣狭窄、急性心肌梗死（起病后8日内）禁用或慎用。',
    pharmacology:
      '二氢吡啶类钙通道阻滞剂（CCB），选择性抑制L型钙通道，松弛血管平滑肌，扩张外周动脉降压；半衰期长（35-50小时），降压平稳。主要经肝脏代谢，肾衰竭无需调整剂量。',
    drugInteractions:
      '与CYP3A4强抑制剂（克拉霉素、伊曲康唑、利托那韦）合用可升高其血药浓度；与辛伐他汀合用增加肌病风险（辛伐他汀限20mg/日）；与β受体阻滞剂、ACEI、ARB合用有协同降压作用；葡萄柚汁可增强降压效应。',
    storage: '遮光、密封，在阴凉干燥处保存（不超过25℃）。',
    packaging: '铝塑包装，每板7片，每盒2板（5mg）。',
    shelfLife: '24个月',
    manufacturer: '辉瑞制药有限公司',
    approvalNumber: '国药准字H10950224',
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
    contraindications:
      '对本品任何成分过敏者禁用；双侧肾动脉狭窄、单肾伴肾动脉狭窄、妊娠中晚期禁用；严重肝功能不全、胆汁淤积、严重肾功能不全（CrCl<10）慎用。',
    pharmacology:
      '血管紧张素II受体1型（AT1）拮抗剂（ARB），阻断AngII的缩血管、促醛固酮分泌和促增殖作用，降压并减少尿蛋白、保护残余肾功能。不影响缓激肽代谢，干咳发生率低于ACEI。',
    drugInteractions:
      '与保钾利尿剂（螺内酯）、钾盐、ACEI合用增加高钾血症风险；与锂剂合用可致锂中毒；与非甾体抗炎药合用降低降压效果并增加肾损伤风险；与利福平可降低其血药浓度。',
    storage: '遮光、密封，在30℃以下干燥处保存。',
    packaging: '铝塑包装，每板7粒，每盒1板（80mg）。',
    shelfLife: '36个月',
    manufacturer: '北京诺华制药有限公司',
    approvalNumber: '国药准字H20040217',
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
    contraindications:
      '难以控制的重度高血压、对本品或其辅料过敏者禁用；合并感染者应先控制感染后再使用；有血栓史、卟啉病史者慎用。',
    pharmacology:
      '重组人促红细胞生成素，与骨髓红系前体细胞表面EPO受体结合，刺激红系增殖、分化和成熟，提升血红蛋白。皮下或静脉给药，半衰期约4-13小时。过量可致高血压、血栓、纯红再障（罕见）。',
    drugInteractions:
      '与抗高血压药合用需加强降压；可能减弱肝素的抗凝作用，透析时需调整肝素剂量；补充铁剂可增强疗效；与环孢素A同用时可能影响其分布。',
    storage: '2-8℃避光冷藏保存，不可冷冻。',
    packaging: '预灌封注射器，每盒5支（2000IU / 3000IU / 4000IU）。',
    shelfLife: '24个月',
    manufacturer: '沈阳三生制药有限责任公司',
    approvalNumber: '国药准字S19980006',
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
    contraindications:
      '非缺铁性贫血、铁过载、已知对单糖或蔗糖铁过敏者禁用；严重肝功能不全、急慢性感染、哮喘或特应性体质者慎用。',
    pharmacology:
      '多核氢氧化铁（III）与蔗糖形成的络合物，静脉给药后由网状内皮系统摄取，缓慢释放铁与转铁蛋白结合，避免游离铁毒性。主要用于口服铁剂不耐受或无效的缺铁性贫血。',
    drugInteractions:
      '不可与口服铁剂同服（应停用口服铁剂）；与含钙、含镁输液存在配伍禁忌；与ACEI同用可增强低血压反应；与左旋多巴、甲基多巴同用可能减弱其作用。',
    storage: '遮光、密闭，在25℃以下保存，不可冷冻。',
    packaging: '棕色玻璃安瓿瓶，每盒5支（100mg/5ml）。',
    shelfLife: '36个月',
    manufacturer: 'Vifor (International) Inc.',
    approvalNumber: '国药准字J20140104',
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
