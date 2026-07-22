# 设计文档：百科集成 + 性能优化 + 药物计划

> **日期**: 2026-07-22
> **版本**: v2.11.0
> **状态**: 待确认

---

## 一、需求概述

### 需求 1：百科集成（优先级最高）
- 水果搜索 → 调用维基百科
- 药物搜索 → 调用百度百科
- 内置库没有的内容 → 联网抓取 → 自动添加到库 → 显示详情
- 已有内置数据的水果/药物仍然显示内置内容（内置优先，联网补全）

### 需求 2：性能优化（优先级最低）
- 滑动和 UI 切换明显卡顿
- 优化动画、列表渲染、页面切换

### 需求 3：药物计划 + 闹钟（优先级中）
- 制定每日服药计划（药名、时间、数量）
- 系统本地通知提醒（App 关闭也能提醒）
- 到时间弹出通知，点击跳转到 App

---

## 二、技术方案

### 需求 1：百科集成

#### 2.1.1 架构设计

```
用户输入关键词
    ↓
先查内置库（BUILTIN + customFruits/customMedications）
    ↓ 找到
直接显示详情（内置优先）
    ↓ 没找到
联网搜索百科
    ↓
维基百科（水果） / 百度百科（药物）
    ↓
解析标题、摘要、正文、图片
    ↓
自动添加到库（isCustom: true）
    ↓
显示详情抽屉
```

#### 2.1.2 新增文件

| 文件 | 职责 |
|------|------|
| `src/lib/baikeService.ts` | 百度百科抓取服务（药物搜索） |
| `src/lib/wikiSearchService.ts` | 维基百科搜索服务（水果搜索，扩展现有 wikiService） |

#### 2.1.3 百度百科抓取方案

百度百科没有官方公开 API，采用以下方案：

1. **搜索接口**: `https://baike.baidu.com/search?word={keyword}` → 解析搜索结果页获取词条 URL
2. **词条接口**: `https://baike.baidu.com/item/{keyword}` → 解析百科页面 HTML
3. **数据提取**:
   - 标题（lemma-title）
   - 摘要（lemma-summary 第一段）
   - 正文段落（lemma-content 各 section）
   - 图片（lemma-image）
   - 结构化字段（适应症、药代动力学、禁忌等）

**注意**: 百度百科有反爬机制（频率限制、验证码），需要：
- 设置合理的 User-Agent
- 添加请求间隔
- 解析失败时回退到维基百科

**替代方案**（如果百度百科直接抓取不稳定）:
- 使用百度百科移动版 API（`https://baike.baidu.com/api/...`）
- 或者先搜索维基百科中文版作为药物数据源（更稳定但内容可能不如百度百科全面）

#### 2.1.4 维基百科搜索方案（水果）

扩展现有 `wikiService.ts`：
1. **搜索接口**: `https://zh.wikipedia.org/w/api.php?action=opensearch&search={keyword}` → 获取词条列表
2. **详情接口**: 已有 `tryWikipediaSummary` 获取摘要 + 图片
3. **扩展**: 获取完整正文段落（`action=parse` 获取页面 HTML）

#### 2.1.5 搜索 UI 改造

**水果页搜索框**：
```
[搜索框] 输入"蓝莓"
    ↓
显示匹配的内置水果列表
    ↓ 底部显示
[🌐 从维基百科搜索"蓝莓"] 按钮
    ↓ 点击
联网搜索 → 显示加载动画
    ↓ 成功
自动添加到库 + 打开详情抽屉
    ↓ 失败
提示"未找到相关内容"
```

**药物页搜索框**：同上，但按钮为"从百度百科搜索"

#### 2.1.6 数据模型扩展

不新增类型，复用现有 `Fruit` / `Medication` 类型：
- 联网抓取的水果 → `isCustom: true`，填充能解析到的字段
- 联网抓取的药物 → `isCustom: true`，填充能解析到的字段
- 营养成分（钾/磷/钠/水）无法从百科获取 → 默认为 0，提示用户手动编辑

---

### 需求 2：性能优化

#### 2.2.1 性能瓶颈分析

| 瓶颈 | 影响 | 方案 |
|------|------|------|
| framer-motion 入场动画 delay 串联 | 首屏渲染慢，每个卡片 delay 递增 | 改用 CSS animation，或减少 delay 层级 |
| `AnimatePresence mode="wait"` 页面切换 | 等待退场动画完成才入场 | 改为 `mode="popLayout"` 或移除 wait |
| 大列表无虚拟化 | DOM 节点多导致滚动卡顿 | 水果/药物卡片列表添加 `content-visibility: auto` |
| 卡片组件未 memo | 每次状态变化全部 re-render | 用 `React.memo` 包裹卡片组件 |
| 波浪动画持续渲染 | GPU 负担 | 优化 `requestAnimationFrame`，非可见区域暂停 |
| 图片加载未懒加载 | 图片一次性加载 | 添加 `loading="lazy"` |

#### 2.2.2 具体优化措施

1. **页面切换动画** (`App.tsx`)
   - `AnimatePresence mode="wait"` → `mode="popLayout"`
   - 页面入场动画从 `y: 8` 改为 `opacity: 0`（减少布局计算）

2. **卡片入场动画** (各页面)
   - 去掉 `delay` 串联，改为一次性 fade in
   - 或改用 CSS `@keyframes` + `animation-delay`

3. **列表渲染** (`Fruits.tsx`, `Medications.tsx`)
   - 卡片组件用 `React.memo` 包裹
   - 添加 `style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}`

4. **图片懒加载**
   - `<img loading="lazy" />`
   - 详情抽屉图片也懒加载

5. **波浪动画** (`WaveFill.tsx`)
   - 使用 `will-change: transform`
   - 非可见时暂停动画

---

### 需求 3：药物计划 + 闹钟

#### 2.3.1 数据模型

```typescript
// src/types/index.ts 新增

interface MedicationPlanItem {
  id: string;              // 计划项 ID
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
```

#### 2.3.2 存储

新建 `src/store/useMedicationPlanStore.ts`：
```typescript
interface MedicationPlanState {
  plans: MedicationPlanItem[];
  addPlan: (plan: Omit<MedicationPlanItem, 'id' | 'createdAt'>) => void;
  updatePlan: (id: string, updates: Partial<MedicationPlanItem>) => void;
  deletePlan: (id: string) => void;
  togglePlan: (id: string) => void;  // 启用/禁用
  getEnabledPlans: () => MedicationPlanItem[];
}
```
- zustand persist，键名 `dialysis_medication_plans`
- 使用 `nativeJSONStorage` 适配器

#### 2.3.3 通知插件

安装 `@capacitor/local-notifications`：
```bash
npm install @capacitor/local-notifications
npx cap sync android
```

Android 已预留 `POST_NOTIFICATIONS` 权限。

#### 2.3.4 通知服务

新建 `src/lib/notificationService.ts`：
```typescript
// 核心功能
- scheduleMedicationReminder(plan: MedicationPlanItem): Promise<void>
  // 为单个计划项创建每日重复通知
- cancelMedicationReminder(planId: string): Promise<void>
  // 取消通知
- rescheduleAllReminders(): Promise<void>
  // App 启动时重新调度所有启用的计划
- requestNotificationPermission(): Promise<boolean>
  // 请求通知权限（Android 13+）
```

通知 ID 规则：`planId.hashCode() % 100000`（确保唯一且可取消）

#### 2.3.5 UI 设计

**入口**：药物页顶部新增"服药计划"卡片/按钮
```
┌─────────────────────────────────┐
│  ⏰ 服药计划                     │
│  3 个启用 · 点击管理 →          │
└─────────────────────────────────┘
```

**计划列表页**（新建 `src/pages/MedicationPlan.tsx`）：
```
┌─────────────────────────────────┐
│  服药计划                    [+] │
├─────────────────────────────────┤
│  💊 碳酸钙  1片   08:00  每天   │
│  饭后服用               [开关]  │
├─────────────────────────────────┤
│  💊 骨化三醇 1粒   20:00  每天   │
│  睡前服用               [开关]  │
└─────────────────────────────────┘
```

**新建/编辑计划**（抽屉组件 `src/components/MedicationPlanEditor.tsx`）：
- 选择药物（从药物库选择 或 手动输入）
- 设置时间（时间选择器）
- 设置剂量（数字 + 单位）
- 选择星期（周一~周日，或每天）
- 备注

**路由**：新增 `/medication-plan` 路由

#### 2.3.6 通知行为

- 通知标题: "肾友笔记 - 服药提醒"
- 通知正文: "该吃 {药物名} {剂量}{单位} 了，{备注}"
- 点击通知: 打开 App 跳转到药物计划页
- 每日重复: 使用 `@capacitor/local-notifications` 的重复调度

---

## 三、文件变更清单

### 新增文件
| 文件 | 职责 |
|------|------|
| `src/lib/baikeService.ts` | 百度百科抓取服务 |
| `src/lib/wikiSearchService.ts` | 维基百科搜索服务（扩展） |
| `src/lib/notificationService.ts` | 本地通知调度服务 |
| `src/store/useMedicationPlanStore.ts` | 服药计划存储 |
| `src/pages/MedicationPlan.tsx` | 服药计划列表页 |
| `src/components/MedicationPlanEditor.tsx` | 计划编辑抽屉 |

### 修改文件
| 文件 | 修改内容 |
|------|----------|
| `src/types/index.ts` | 新增 `MedicationPlanItem` 类型 |
| `src/types/events.ts` | 新增计划相关事件 |
| `src/pages/Fruits.tsx` | 搜索框添加"从维基百科搜索"按钮 |
| `src/pages/Medications.tsx` | 搜索框添加"从百度百科搜索"按钮 + 服药计划入口 |
| `src/App.tsx` | 新增路由 + 启动时请求通知权限 + 重新调度通知 |
| `src/components/AppLayout.tsx` | 导航可能不需要改（计划页从药物页进入） |
| `src/components/DetailDrawer.tsx` | 可能需要适配自动添加的水果/药物 |
| `src/lib/wikiService.ts` | 扩展搜索功能 |
| `src/store/useFruitsStore.ts` | 可能需要扩展 addFruit 支持更多字段 |
| `src/store/useMedicationsStore.ts` | 同上 |
| `src/components/WaveFill.tsx` | 性能优化 |
| `capacitor.config.ts` | 可能需要配置通知 |
| `android/app/src/main/AndroidManifest.xml` | 确认通知权限 |
| `package.json` | 版本号更新 + 新依赖 |

---

## 四、实施顺序

按用户指定优先级：**百科集成(1) → 药物计划(2) → 性能优化(3)**

### 阶段 1：百科集成
1. 创建 `baikeService.ts`（百度百科抓取）
2. 创建 `wikiSearchService.ts`（维基百科搜索扩展）
3. 修改水果页搜索 UI
4. 修改药物页搜索 UI
5. 测试联网搜索 + 自动添加

### 阶段 2：药物计划 + 闹钟
1. 安装 `@capacitor/local-notifications`
2. 定义数据模型和 store
3. 创建通知服务
4. 创建计划列表页
5. 创建计划编辑抽屉
6. 修改药物页添加入口
7. 修改 App.tsx 添加路由和通知初始化

### 阶段 3：性能优化
1. 优化页面切换动画
2. 优化卡片入场动画
3. 添加 memo 和虚拟化
4. 优化图片懒加载
5. 优化波浪动画

---

## 五、风险和注意事项

1. **百度百科反爬**: 可能被限制频率或需要验证码。如果直接抓取不稳定，回退到维基百科中文版。
2. **CORS 限制**: WebView 中请求外部 API 可能有 CORS 限制。Capacitor Android 默认配置允许跨域，但需要在 `capacitor.config.ts` 中确认。
3. **通知权限**: Android 13+ 需要运行时请求 `POST_NOTIFICATIONS` 权限。
4. **通知重复调度**: App 每次启动需要重新调度通知（local-notifications 在重启后可能丢失）。
5. **营养成分缺失**: 百科抓取的水果无法获取准确的钾/磷/钠含量，需要提示用户手动编辑或使用默认值 0。
6. **版本号**: 本次更新到 v2.11.0，versionCode 302。

---

## 六、已确认决策

1. **药物搜索数据源**：百度百科优先，被限制时自动回退到维基百科中文版。
2. **药物计划入口**：药物页顶部添加"服药计划"卡片，点击进入计划管理页。不改变底部导航结构。
3. **提醒类型**：按计划中每个时间点分别提醒。例如用户设置了"碳酸钙 08:00 每天吃1片"和"骨化三醇 20:00 每天吃1粒"，则每天 08:00 提醒吃碳酸钙、20:00 提醒吃骨化三醇。一个计划项可以有多个时间点，每个时间点独立提醒。
