/**
 * 设置模块公共出口
 *
 * 其他模块/页面仅通过此文件访问设置模块能力，
 * 不直接 import store/useSettingsStore，实现模块隔离。
 */

export { settingsContract } from './contract';
export type { SettingsContract, SettingsExports } from './contract';
export { SETTINGS_HOT_CONFIG } from './contract';
