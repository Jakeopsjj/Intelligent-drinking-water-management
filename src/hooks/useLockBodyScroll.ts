/**
 * 锁定背景滚动 Hook
 *
 * 解决二级界面（抽屉、Modal、Popover）唤出时的界面抖动：
 * 1. 背景内容仍可滚动 → 滚动条显隐 → 页面宽度跳动
 * 2. 锁定时未补偿滚动条宽度 → 内容横向跳动
 *
 * 实现：
 * - 锁定时记录 body scrollTop，固定为 fixed 定位
 * - 补偿滚动条宽度（padding-right）避免内容横向位移
 * - 解锁时恢复原 scrollTop 与样式
 * - 支持嵌套（多个浮层同时打开，引用计数）
 */

import { useEffect } from 'react';

// 引用计数：多个浮层同时打开时，仅最后一个关闭才解锁
let lockCount = 0;
let prevBodyStyle: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
  overflow: string;
} | null = null;
let prevScrollY = 0;

function lock() {
  if (lockCount === 0) {
    const body = document.body;
    prevScrollY = window.scrollY;

    // 计算滚动条宽度（兼容无滚动条场景）
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    prevBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${prevScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    // 补偿滚动条消失带来的宽度变化（仅在原本有滚动条时）
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockCount++;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && prevBodyStyle) {
    const body = document.body;
    body.style.position = prevBodyStyle.position;
    body.style.top = prevBodyStyle.top;
    body.style.left = prevBodyStyle.left;
    body.style.right = prevBodyStyle.right;
    body.style.width = prevBodyStyle.width;
    body.style.paddingRight = prevBodyStyle.paddingRight;
    body.style.overflow = prevBodyStyle.overflow;
    prevBodyStyle = null;

    // 恢复滚动位置（避免 fixed 解除后跳到顶部）
    window.scrollTo(0, prevScrollY);
  }
}

export function useLockBodyScroll(active: boolean = true): void {
  useEffect(() => {
    if (!active) return;
    lock();
    return () => unlock();
  }, [active]);
}
