import { useEffect, useState } from 'react';

/**
 * 网络状态 Hook
 *
 * 监听浏览器 online/offline 事件，返回当前是否在线（true=在线）。
 * 无网络时调用方可据此仅展示本地缓存数据。
 *
 * - 初始值取 navigator.onLine（SSR 安全：服务端无 navigator 时默认 true）
 * - 在线/离线事件触发时同步更新 state
 * - 卸载时移除事件监听
 */
export function useOnlineStatus(): boolean {
  // SSR 安全：服务端渲染时 navigator 不存在，默认视为在线
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
