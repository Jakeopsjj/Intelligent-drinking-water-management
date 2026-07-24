/**
 * WeatherBackground 动态天气背景层
 *
 * 功能：
 * - 根据 useWeather 返回的 weatherType 渲染对应天气视觉效果
 * - 纯 CSS 动画驱动粒子（雨/雪/云），无 requestAnimationFrame 重绘
 * - 天气氛围渐变叠加层（晴/阴/雾/雷暴等不同色调）
 * - 白天/夜晚自适应（isDay）
 * - 失败/加载中时不渲染任何天气层，保留底层 LiquidGlassBackground
 *
 * 渲染层级：
 * - 通过 createPortal 渲染到 body 末尾
 * - z-index: -1（与 LiquidGlassBackground 同层，DOM 顺序在后因此覆盖在玻璃纹理之上）
 * - pointer-events: none，绝不拦截交互
 */
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useWeather } from '@/hooks/useWeather';
import type { WeatherType } from '@/lib/weatherService';

/** 根据天气类型返回氛围渐变 CSS（作为底层色调叠加） */
function getMoodGradient(type: WeatherType | null, isDay: boolean): string {
  if (!type) return 'transparent';

  // 夜晚统一偏冷蓝
  if (!isDay) {
    switch (type) {
      case 'clear':
        return 'linear-gradient(180deg, rgba(15, 23, 50, 0.45) 0%, rgba(30, 40, 75, 0.30) 100%)';
      case 'cloudy':
      case 'overcast':
        return 'linear-gradient(180deg, rgba(30, 35, 55, 0.40) 0%, rgba(45, 50, 70, 0.28) 100%)';
      case 'fog':
        return 'linear-gradient(180deg, rgba(50, 55, 70, 0.35) 0%, rgba(70, 75, 90, 0.25) 100%)';
      case 'drizzle':
      case 'rain':
        return 'linear-gradient(180deg, rgba(25, 35, 55, 0.45) 0%, rgba(40, 50, 70, 0.30) 100%)';
      case 'heavy-rain':
        return 'linear-gradient(180deg, rgba(20, 28, 45, 0.55) 0%, rgba(35, 42, 60, 0.38) 100%)';
      case 'snow':
        return 'linear-gradient(180deg, rgba(50, 60, 85, 0.40) 0%, rgba(80, 90, 115, 0.25) 100%)';
      case 'thunderstorm':
        return 'linear-gradient(180deg, rgba(15, 20, 40, 0.60) 0%, rgba(30, 35, 60, 0.42) 100%)';
      default:
        return 'linear-gradient(180deg, rgba(25, 35, 55, 0.40) 0%, rgba(40, 50, 70, 0.28) 100%)';
    }
  }

  // 白天
  switch (type) {
    case 'clear':
      return 'linear-gradient(180deg, rgba(135, 195, 235, 0.25) 0%, rgba(255, 220, 160, 0.18) 100%)';
    case 'cloudy':
      return 'linear-gradient(180deg, rgba(180, 200, 215, 0.22) 0%, rgba(200, 215, 225, 0.16) 100%)';
    case 'overcast':
      return 'linear-gradient(180deg, rgba(150, 160, 170, 0.30) 0%, rgba(170, 180, 190, 0.22) 100%)';
    case 'fog':
      return 'linear-gradient(180deg, rgba(210, 215, 220, 0.35) 0%, rgba(220, 225, 230, 0.28) 100%)';
    case 'drizzle':
      return 'linear-gradient(180deg, rgba(140, 160, 180, 0.28) 0%, rgba(165, 180, 195, 0.20) 100%)';
    case 'rain':
      return 'linear-gradient(180deg, rgba(110, 130, 155, 0.32) 0%, rgba(140, 155, 175, 0.22) 100%)';
    case 'heavy-rain':
      return 'linear-gradient(180deg, rgba(80, 100, 125, 0.40) 0%, rgba(110, 130, 150, 0.28) 100%)';
    case 'snow':
      return 'linear-gradient(180deg, rgba(200, 215, 230, 0.30) 0%, rgba(225, 235, 245, 0.22) 100%)';
    case 'thunderstorm':
      return 'linear-gradient(180deg, rgba(60, 65, 90, 0.45) 0%, rgba(90, 95, 120, 0.30) 100%)';
    default:
      return 'transparent';
  }
}

/** 雨滴粒子（CSS 动画驱动） */
function RainLayer({ density = 'normal' }: { density?: 'light' | 'normal' | 'heavy' }) {
  const count = density === 'light' ? 40 : density === 'heavy' ? 120 : 70;
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 0.5 + Math.random() * 0.8,
        height: 12 + Math.random() * 18,
        opacity: 0.25 + Math.random() * 0.35,
      })),
    [count]
  );
  return (
    <div className="weather-rain-layer" aria-hidden>
      {drops.map((d) => (
        <span
          key={d.id}
          className="weather-raindrop"
          style={{
            left: `${d.left}%`,
            height: `${d.height}px`,
            opacity: d.opacity,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/** 雪花粒子 */
function SnowLayer() {
  const flakes = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 6 + Math.random() * 8,
        size: 3 + Math.random() * 6,
        opacity: 0.4 + Math.random() * 0.5,
        drift: (Math.random() - 0.5) * 60,
      })),
    []
  );
  return (
    <div className="weather-snow-layer" aria-hidden>
      {flakes.map((f) => (
        <span
          key={f.id}
          className="weather-snowflake"
          style={{
            left: `${f.left}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: f.opacity,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            '--drift-x': `${f.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** 漂浮云朵 */
function CloudLayer({ count = 4 }: { count?: number }) {
  const clouds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: 8 + Math.random() * 40,
        delay: Math.random() * 20,
        duration: 60 + Math.random() * 60,
        scale: 0.6 + Math.random() * 0.8,
        opacity: 0.18 + Math.random() * 0.20,
      })),
    [count]
  );
  return (
    <div className="weather-cloud-layer" aria-hidden>
      {clouds.map((c) => (
        <span
          key={c.id}
          className="weather-cloud"
          style={{
            top: `${c.top}%`,
            opacity: c.opacity,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            transform: `scale(${c.scale})`,
          }}
        />
      ))}
    </div>
  );
}

/** 雾层 */
function FogLayer() {
  const bands = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        top: i * 20 + Math.random() * 10,
        delay: Math.random() * 10,
        duration: 30 + Math.random() * 30,
        opacity: 0.20 + Math.random() * 0.15,
      })),
    []
  );
  return (
    <div className="weather-fog-layer" aria-hidden>
      {bands.map((b) => (
        <span
          key={b.id}
          className="weather-fog-band"
          style={{
            top: `${b.top}%`,
            opacity: b.opacity,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/** 太阳光晕（晴天） */
function SunLayer() {
  return (
    <div className="weather-sun-layer" aria-hidden>
      <div className="weather-sun-glow" />
      <div className="weather-sun-rays" />
    </div>
  );
}

/** 月亮（晴夜） */
function MoonLayer() {
  return (
    <div className="weather-moon-layer" aria-hidden>
      <div className="weather-moon" />
    </div>
  );
}

/** 闪电闪光层（雷暴） */
function LightningLayer() {
  return <div className="weather-lightning-layer" aria-hidden />;
}

export default function WeatherBackground() {
  const { weatherType, weather } = useWeather(true);

  if (typeof document === 'undefined') return null;
  // 加载中或无天气数据时不渲染（保留底层 LiquidGlassBackground）
  if (!weatherType || !weather) return null;

  const moodGradient = getMoodGradient(weatherType, weather.isDay);

  return createPortal(
    <div className="weather-bg-root" aria-hidden data-weather={weatherType} data-day={weather.isDay ? '1' : '0'}>
      {/* 氛围色调渐变层 */}
      <div className="weather-bg-mood" style={{ background: moodGradient }} />

      {/* 天气特效层 */}
      {(weatherType === 'clear') && (weather.isDay ? <SunLayer /> : <MoonLayer />)}
      {(weatherType === 'cloudy' || weatherType === 'overcast') && (
        <CloudLayer count={weatherType === 'overcast' ? 6 : 4} />
      )}
      {weatherType === 'fog' && <FogLayer />}
      {weatherType === 'drizzle' && <RainLayer density="light" />}
      {weatherType === 'rain' && <RainLayer density="normal" />}
      {weatherType === 'heavy-rain' && <RainLayer density="heavy" />}
      {weatherType === 'snow' && <SnowLayer />}
      {weatherType === 'thunderstorm' && (
        <>
          <RainLayer density="heavy" />
          <LightningLayer />
        </>
      )}
    </div>,
    document.body
  );
}
