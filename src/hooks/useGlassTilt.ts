/**
 * 陀螺仪联动反光 Hook
 *
 * 监听设备方向传感器（DeviceOrientation），将姿态数据写入 CSS 变量
 * --glass-tilt-x / --glass-tilt-y，驱动 .glass-tilt-highlight 的反光偏移。
 *
 * 设计约束（遵循 iOS 27 Liquid Glass 规范）：
 * - 反光范围限定在卡片顶部8%区域（由 CSS --glass-highlight-height 控制）
 * - 反光强度受限（由 CSS --glass-tilt-intensity 控制，浅色0.06/深色0.035）
 * - 仅偏移反光位置，不扩大反光范围
 * - 低端设备或不支持传感器时静默降级，不影响功能
 */

import { useEffect } from 'react';

interface TiltData {
  gamma: number; // 左右倾斜 -90~90
  beta: number;  // 前后倾斜 -180~180
}

export function useGlassTilt() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检测设备是否支持方向传感器
    if (!('DeviceOrientationEvent' in window)) return;

    let rafId: number | null = null;
    let lastTilt: TiltData = { gamma: 0, beta: 0 };

    const updateTilt = () => {
      rafId = null;
      // 归一化到 -1 ~ 1 范围
      const tiltX = Math.max(-1, Math.min(1, lastTilt.gamma / 45));
      const tiltY = Math.max(-1, Math.min(1, (lastTilt.beta - 45) / 45));

      // 写入 CSS 变量到 :root，全应用所有 .glass-tilt-highlight 自动跟随
      const root = document.documentElement;
      root.style.setProperty('--glass-tilt-x', tiltX.toFixed(3));
      root.style.setProperty('--glass-tilt-y', tiltY.toFixed(3));
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      lastTilt = { gamma: e.gamma, beta: e.beta };

      // 节流到 rAF，避免高频写入 CSS 变量导致性能问题
      if (rafId === null) {
        rafId = requestAnimationFrame(updateTilt);
      }
    };

    // iOS 13+ 需要请求权限
    const requestPermission = async () => {
      try {
        const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<'granted' | 'denied'>;
        };
        if (typeof DOE.requestPermission === 'function') {
          const result = await DOE.requestPermission();
          if (result !== 'granted') return;
        }
        window.addEventListener('deviceorientation', handleOrientation, true);
      } catch {
        // 权限请求失败，静默降级
      }
    };

    // 延迟请求权限，避免阻塞首次渲染
    const timer = setTimeout(requestPermission, 1000);

    return () => {
      clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('deviceorientation', handleOrientation, true);
      // 重置 CSS 变量
      document.documentElement.style.setProperty('--glass-tilt-x', '0');
      document.documentElement.style.setProperty('--glass-tilt-y', '0');
    };
  }, []);
}
