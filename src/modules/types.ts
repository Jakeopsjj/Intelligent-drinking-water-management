/**
 * 模块契约通用类型
 *
 * 每个业务模块通过 contract.ts 显式声明对外契约：
 * - id：模块唯一标识
 * - name：人类可读名称
 * - exposes：对外暴露的能力（API/Store/Hook）
 * - publishes：该模块对外发布的事件清单
 * - subscribes：该模块订阅的事件清单（建立松耦合关联）
 *
 * 模块间仅通过契约通信，代码互不侵入；
 * 局部变更只改自身契约，不会引发其他模块连锁故障。
 */

import type { EventName } from '@/types/events';

/**
 * 模块契约接口
 */
export interface ModuleContract<
  TId extends string = string,
  TExports = Record<string, unknown>
> {
  /** 模块唯一标识（如 'settings' / 'records' / 'fruits' / 'dashboard'） */
  id: TId;
  /** 模块人类可读名称 */
  name: string;
  /** 模块职责一句话描述 */
  responsibility: string;
  /**
   * 对外暴露的能力（公共 API）
   * 其他模块仅能通过此命名空间访问该模块的能力
   */
  exposes: TExports;
  /**
   * 该模块对外发布的事件清单
   * 其他模块仅订阅此清单中的事件
   */
  publishes: readonly EventName[];
  /**
   * 该模块订阅的事件清单
   * 显式声明跨模块依赖关系，便于追溯影响面
   */
  subscribes: readonly EventName[];
}

/**
 * 模块注册中心条目
 */
export interface ModuleRegistryEntry<TId extends string = string, TExports = Record<string, unknown>> {
  contract: ModuleContract<TId, TExports>;
  /** 副作用编排函数：注册该模块的订阅 */
  registerEffects?: () => () => void;
}

/**
 * 提取模块暴露能力的类型
 */
export type ModuleExports<T extends ModuleContract> = T['exposes'];

/**
 * 提取模块 ID 的类型
 */
export type ModuleId<T extends ModuleContract> = T['id'];
