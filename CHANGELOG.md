# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Features

- 新增应用内日志调试功能（DebugConsole），支持实时查看网络请求、API 调用、错误信息等调试日志
- 日志支持分类筛选（全部/网络/API/错误/警告/信息）
- 日志支持一键复制和清空
- 药物列表卡片新增维基百科配图缩略图（懒加载）
- 水果列表卡片新增维基百科配图缩略图（懒加载）
- 内置水果数据从 24 种扩充至 67 种
- 内置药物数据从 10 种扩充至 31 种

### Bug Fixes

- 修复药物列表未显示全部内置药物的问题
- 修复水果列表未显示全部内置水果的问题

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
