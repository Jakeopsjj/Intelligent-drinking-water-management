/**
 * useWeather Hook
 *
 * 在组件中获取并管理天气数据：
 * - 挂载时自动请求一次
 * - 30 分钟自动刷新
 * - 页面重新可见时刷新（visibilitychange）
 * - 网络恢复时刷新
 * - 支持手动刷新
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getWeatherWithLocation,
  type WeatherData,
  type LocationData,
  type WeatherType,
} from '@/lib/weatherService';

// 刷新间隔：30 分钟
const REFRESH_INTERVAL = 30 * 60 * 1000;

export interface UseWeatherResult {
  weather: WeatherData | null;
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  /** 当前天气类型，未获取到时为 null */
  weatherType: WeatherType | null;
  /** 手动刷新 */
  refresh: () => Promise<void>;
}

export function useWeather(autoStart = true): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(autoStart);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const refreshingRef = useRef<boolean>(false);

  const fetchWeather = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { weather: w, location: l } = await getWeatherWithLocation();
      setWeather(w);
      setLocation(l);
      if (!w) {
        setError('获取天气数据失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取天气数据异常');
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, []);

  // 启动时获取 + 定时刷新
  useEffect(() => {
    if (!autoStart) return;

    fetchWeather();

    timerRef.current = window.setInterval(() => {
      fetchWeather();
    }, REFRESH_INTERVAL);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoStart, fetchWeather]);

  // 页面重新可见时刷新（超过缓存期才刷新）
  useEffect(() => {
    if (!autoStart) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const last = weather?.fetchedAt ?? 0;
        if (Date.now() - last > REFRESH_INTERVAL) {
          fetchWeather();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [autoStart, fetchWeather, weather?.fetchedAt]);

  // 网络恢复时刷新
  useEffect(() => {
    if (!autoStart) return;
    const onOnline = () => {
      fetchWeather();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [autoStart, fetchWeather]);

  return {
    weather,
    location,
    loading,
    error,
    weatherType: weather?.type ?? null,
    refresh: fetchWeather,
  };
}
