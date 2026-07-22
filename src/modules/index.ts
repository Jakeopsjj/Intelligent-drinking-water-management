/**
 * 业务模块公共出口
 *
 * 对外提供：
 * - 各模块契约（contract）
 * - 模块注册中心（registry）
 * - 跨模块副作用编排（effects）
 * - 通用类型（types）
 *
 * 模块间通信统一通过本出口，禁止跨模块直接 import 内部 store。
 */

export { settingsContract } from './settings';
export type { SettingsContract, SettingsExports } from './settings';

export { recordsContract } from './records';
export type { RecordsContract, RecordsExports } from './records';

export { fruitsContract } from './fruits';
export type { FruitsContract, FruitsExports } from './fruits';

export { dashboardContract } from './dashboard';
export type { DashboardContract } from './dashboard';

export {
  getModule,
  listModules,
  getSubscribersOf,
  getDependenciesOf,
  printDependencyGraph,
} from './registry';

export { registerModuleEffects } from './effects';

export type {
  ModuleContract,
  ModuleRegistryEntry,
  ModuleExports,
  ModuleId,
} from './types';
