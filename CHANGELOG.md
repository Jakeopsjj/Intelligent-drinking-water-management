# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [2.18.0] - 2026-07-23

### Features

- 饮食页面新增每日营养限额进度条：水分/钾/磷/钠/水果五项实时监控
- 限额进度颜色编码：正常(teal <80%)、警告(amber 80-100%)、超标(rose ≥100%)
- 超标预警横幅：当日任意营养项超标时醒目提示具体超标项目
- 水分统计合并饮水 + 水果含水，准确反映真实摄水量
- 复用 calc.ts 中已有的 getProgressStatus 工具函数，统一状态判定标准

### Bug Fixes

- 修复饮食板块白屏问题：根因为 Zustand selector 中调用 store 方法 (s.getTodayRecords()) 每次返回新数组引用导致无限重渲染
  - 改为订阅原始 records 状态，使用 useMemo + 纯函数 isToday() 计算当日记录
  - 统一遵循 Dashboard/Records 页面已验证的状态订阅模式
  - 移除不必要的 useFruitImage 包装 hook，直接调用 useEntityImage
  - allFruits 组合结果用 useMemo 包裹，避免每次渲染重建数组
  - 旧记录兼容：营养字段访问加 `|| 0` 防御，防止历史数据缺失 sodium/water 导致 NaN

## [2.17.1] - 2026-07-23

### Features

- 新增饮食记录页面（Diet）：按餐次（早餐/午餐/晚餐/加餐）记录水果摄入
- 饮食页面支持水果搜索、快捷重量记录（50/100/150/200g）
- 当日饮食记录按餐次分组展示，支持展开/折叠查看详情
- 每餐次营养小计：水果总量、钾、磷、水分实时汇总
- 今日摄入概览卡片：水果总量/水分/钾/磷一目了然
- 新增 MealType 类型（breakfast/lunch/dinner/snack），扩展 FruitRecord 支持餐次关联
- 底部导航栏新增「饮食」入口（Apple 图标）

## [2.16.9] - 2026-07-23

### Features

- 新增饮水进度环（WaterProgressRing）：SVG 环形进度条，直观展示今日摄水量占每日限额比例
- 饮水一键快捷记录：仪表盘 50/100/150/200ml 四个快捷按钮，点击即记录
- 智能摄水限额计算：根据干体重和透析类型自动计算建议每日摄水限额
- 设置页新增干体重和透析类型（HD/PD）配置
- 摄水限额颜色编码：正常(teal)、警告(orange, 80%)、超标(red, 100%)

### Bug Fixes

- 修复 DebugConsole 白屏卡死（Zustand selector 返回函数引用导致 logs.map 抛错）

---

## [2.16.8] - 2026-07-23

### Bug Fixes

- 修复 DebugConsole 白屏卡死（Zustand selector 返回函数引用导致 logs.map 抛错）

---

## [2.16.7] - 2026-07-23

### Features

- 新增应用内调试控制台（DebugConsole）：右下角悬浮按钮，点击打开日志面板
- 日志分类：信息(info)、警告(warn)、错误(error)、API(api)、网络(network)
- 支持按类别筛选、一键复制单条日志、展开查看详情(JSON)
- 新增 Zustand debug store 管理日志状态
- wikiService 和 baikeService 增加完整日志记录

### Infrastructure

- 创建 CHANGELOG.md 文件，记录版本更新历史
- 修改 build-apk.sh，自动读取 CHANGELOG.md 作为 GitHub Release body
- 后续版本更新只需编辑 CHANGELOG.md，Release 内容自动同步

---

## [2.16.6] - 2026-07-23

### Features

- 药物列表卡片新增维基百科配图缩略图（懒加载）
- 水果列表卡片新增维基百科配图缩略图（懒加载）

### Data

- 内置水果数据从 24 种扩充至 67 种
- 内置药物数据从 10 种扩充至 31 种

### Infrastructure

- 新增 `useEntityImage` 自定义钩子，实现列表卡片图片懒加载

---

## [2.16.5] - 2026-07-23

### Bug Fixes

- 彻底解决营养数据、药物配图、apihz 标注问题

---

## [2.16.4] - 2026-07-23

### Features

- 药物配图通用名搜索

---

## [2.16.3] - 2026-07-23

### Bug Fixes

- 药物配图搜索提取通用名提升命中率

---

## [2.16.2] - 2026-07-23

### Bug Fixes

- 修复药物板块横向滑动、内置词条配图、营养数据源替换

---

## [2.16.1] - 2026-07-23

### Features

- 新增利尿剂分类
- 将司维拉姆拆分为碳酸/盐酸两个独立剂型

---

## [2.16.0] - 2026-07-22

### Features

- 水果详情页升级为维基百科完整词条（首段 + 章节段落 + 信息框 + 图集）
- 药物详情页正文段落数量从 8 段提升至 20 段
- 药物摘要从前 200 字扩展至前 400 字

### Bug Fixes

- 修复水果检索命中率异常（移除 searchWikiFruits 中附加的中英混合搜索后缀）
- 修复药物详情图片加载失败（SmartImage 添加 referrerPolicy=no-referrer）
- 修复药物检索误判为空（isBlockedPage 二段式判定）

---

## [2.15.0] - 2026-07-21

### Features

- 新增水果钾含量库页面
- 新增今日仪表盘快速记录功能
- 新增记录中心历史趋势图表

### Infrastructure

- 初始化 React + TypeScript + Vite + Capacitor 项目
- 配置 Tailwind CSS + framer-motion
- 集成 Zustand 状态管理
