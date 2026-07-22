/**
 * 模块注册中心（Module Registry）
 *
 * 集中登记所有业务模块契约，提供：
 * - 模块清单查询（getModule / listModules）
 * - 模块能力访问（通过模块 id 获取 exposes）
 * - 模块发布/订阅关系追溯（影响面分析）
 *
 * 业务模块变更时，仅需维护自身 contract，注册中心自动同步；
 * 新增模块时，只需 register 一个 contract 条目即可接入数据流。
 */

import { settingsContract } from './settings';
import { recordsContract } from './records';
import { fruitsContract } from './fruits';
import { medicationsContract } from './medications';
import { dashboardContract } from './dashboard';
import type { ModuleContract } from './types';

/** 已注册的模块契约清单（按 id 索引） */
const REGISTRY: Record<string, ModuleContract> = {
  [settingsContract.id]: settingsContract,
  [recordsContract.id]: recordsContract,
  [fruitsContract.id]: fruitsContract,
  [medicationsContract.id]: medicationsContract,
  [dashboardContract.id]: dashboardContract,
};

/** 获取模块契约 */
export function getModule<TId extends string>(
  id: TId
): ModuleContract | undefined {
  return REGISTRY[id];
}

/** 列出所有已注册模块 */
export function listModules(): ModuleContract[] {
  return Object.values(REGISTRY);
}

/**
 * 影响面分析：某模块发布事件后，哪些模块订阅了该事件
 * 用于评估"局部变更"是否会引发"连锁故障"
 */
export function getSubscribersOf(eventName: string): string[] {
  return listModules()
    .filter((m) => m.subscribes.includes(eventName as any))
    .map((m) => m.id);
}

/**
 * 依赖面分析：某模块订阅了哪些模块的事件
 * 用于追溯跨模块依赖关系
 */
export function getDependenciesOf(moduleId: string): string[] {
  const module = REGISTRY[moduleId];
  if (!module) return [];
  const publishers = new Set<string>();
  for (const evt of module.subscribes) {
    for (const m of listModules()) {
      if (m.id !== moduleId && m.publishes.includes(evt as any)) {
        publishers.add(m.id);
      }
    }
  }
  return Array.from(publishers);
}

/** 开发态：打印模块依赖图，便于架构审查 */
export function printDependencyGraph(): void {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.groupCollapsed('[modules] 依赖图');
  for (const m of listModules()) {
    const deps = getDependenciesOf(m.id);
    const subs = getSubscribersOf(m.id);
    // eslint-disable-next-line no-console
    console.log(
      `${m.id} → 依赖 [${deps.join(', ') || '-'}] · 被订阅 [${subs.join(', ') || '-'}]`
    );
  }
  console.groupEnd();
}
