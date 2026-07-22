/**
 * 记录模块公共出口
 *
 * 其他模块/页面仅通过此文件访问记录模块能力，
 * 不直接 import store/useRecordsStore，实现模块隔离。
 */

export { recordsContract } from './contract';
export type { RecordsContract, RecordsExports } from './contract';
