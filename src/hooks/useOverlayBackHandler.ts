import { useEffect } from 'react';
import { registerOverlayCloser } from '@/lib/backHandler';

// 当 active 为 true 时，将 closer 注册到浮层栈，便于 Android 返回 / 侧滑手势关闭浮层
export function useOverlayBackHandler(active: boolean, closer: () => void) {
  useEffect(() => {
    if (!active) return;
    return registerOverlayCloser(closer);
  }, [active, closer]);
}
