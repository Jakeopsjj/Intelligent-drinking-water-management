import { useEffect, useRef } from 'react';
import type { FC } from 'react';

interface WaveFillProps {
  ratio: number;
  status: 'normal' | 'warning' | 'exceeded';
  theme?: 'teal' | 'sage' | 'clay' | 'peach' | 'red';
  inverse?: boolean;
}

const WaveFill: FC<WaveFillProps> = ({ ratio, status, theme = 'teal', inverse = false }) => {
  const heightPercent = ratio >= 1 ? 100 : Math.max(Math.min(ratio, 1) * 100, 5);
  const finalHeight = inverse ? Math.max(ratio * 100, 15) : heightPercent;

  // 马卡龙色半透明水色 - 浅色玻璃容器内的彩色液体
  // bg = 水底渐变色（稍深）, surface = 水主色, line = 波浪线色（最亮, 带白）
  const colorMap: Record<string, { bg: string; surface: string; line: string; shine: string }> = {
    teal: {
      bg: 'rgba(150, 220, 210, 0.55)',
      surface: 'rgba(178, 235, 225, 0.50)',
      line: 'rgba(220, 248, 242, 0.80)',
      shine: 'rgba(255, 255, 255, 0.60)',
    },
    sage: {
      bg: 'rgba(170, 220, 145, 0.55)',
      surface: 'rgba(195, 238, 170, 0.50)',
      line: 'rgba(230, 250, 210, 0.80)',
      shine: 'rgba(255, 255, 255, 0.60)',
    },
    clay: {
      bg: 'rgba(225, 190, 160, 0.55)',
      surface: 'rgba(240, 210, 180, 0.50)',
      line: 'rgba(252, 235, 215, 0.80)',
      shine: 'rgba(255, 255, 255, 0.60)',
    },
    peach: {
      bg: 'rgba(255, 190, 150, 0.55)',
      surface: 'rgba(255, 210, 175, 0.50)',
      line: 'rgba(255, 235, 215, 0.85)',
      shine: 'rgba(255, 255, 255, 0.65)',
    },
    red: {
      bg: 'rgba(255, 155, 155, 0.55)',
      surface: 'rgba(255, 180, 180, 0.50)',
      line: 'rgba(255, 220, 220, 0.85)',
      shine: 'rgba(255, 255, 255, 0.65)',
    },
  };

  const colors = colorMap[theme] || colorMap.teal;

  const frontWaveRef = useRef<SVGSVGElement>(null);
  const backWaveRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let currentDir: 'left' | 'right' = 'right';

    const setAnim = (dir: 'left' | 'right') => {
      const frontAnim =
        dir === 'left'
          ? 'wave-move-left 5s linear infinite'
          : 'wave-move-right 5s linear infinite';
      const backAnim =
        dir === 'left'
          ? 'wave-move-left 7s linear infinite'
          : 'wave-move-right 7s linear infinite';

      if (frontWaveRef.current) {
        frontWaveRef.current.style.animation = frontAnim;
      }
      if (backWaveRef.current) {
        backWaveRef.current.style.animation = backAnim;
      }
    };

    setAnim(currentDir);

    const timer = setInterval(() => {
      currentDir = Math.random() > 0.5 ? 'left' : 'right';
      setAnim(currentDir);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{
        height: `${finalHeight}%`,
        transition: 'height 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        background: `linear-gradient(180deg, ${colors.surface} 0%, ${colors.bg} 100%)`,
      }}
      aria-hidden="true"
    >
      {/* 水面顶部白色光泽线 - 模拟液体表面反光 */}
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background: `linear-gradient(180deg, ${colors.shine} 0%, transparent 100%)`,
        }}
      />

      {/* 后层波浪 */}
      <svg
        ref={backWaveRef}
        className="absolute -left-6 top-0 w-[calc(100%+48px)]"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        style={{ height: '36px' }}
      >
        <path
          d="M0,28 C30,18 60,32 100,28 C140,24 170,16 200,28 L200,0 L0,0 Z"
          fill={colors.bg}
          opacity={0.7}
        />
      </svg>

      {/* 前层波浪 - 最亮的波浪线 */}
      <svg
        ref={frontWaveRef}
        className="absolute -left-6 top-0 w-[calc(100%+48px)]"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        style={{ height: '30px' }}
      >
        <path
          d="M0,24 C25,16 50,28 100,24 C150,20 175,14 200,24 L200,0 L0,0 Z"
          fill={colors.surface}
        />
        {/* 波浪顶部高光 */}
        <path
          d="M0,24 C25,16 50,28 100,24 C150,20 175,14 200,24"
          fill="none"
          stroke={colors.line}
          strokeWidth="2"
        />
      </svg>

      {/* 水中气泡/光泽效果 */}
      <div
        className="absolute right-4 top-4 h-2 w-2 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};

export default WaveFill;
