import type { CSSProperties } from 'react';
import { cn } from './utils';

export type CardTheme = 'glass' | 'original';

export function getCardBaseClass(theme: CardTheme): string {
  if (theme === 'original') {
    return 'border-cream-200 bg-white shadow-soft';
  }
  return 'border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_-6px_rgba(0,0,0,0.06)]';
}

export function getInnerCardClass(theme: CardTheme): string {
  if (theme === 'original') {
    return 'border-cream-200 bg-white';
  }
  return 'border-white/60 bg-white/50 backdrop-blur-sm';
}

export function getPageShellClass(theme: CardTheme): string {
  if (theme === 'original') {
    return 'border-cream-200 bg-white shadow-soft';
  }
  return 'border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_-6px_rgba(0,0,0,0.06)]';
}

export function getListRowClass(theme: CardTheme): string {
  if (theme === 'original') {
    return 'border-cream-200 bg-white hover:bg-cream-50';
  }
  return 'border-white/70 bg-white/70 backdrop-blur-sm hover:bg-white';
}

export function getHeaderClass(theme: CardTheme): string {
  if (theme === 'original') {
    return 'bg-cream-50/95 border-b border-cream-200';
  }
  return 'backdrop-blur-xl bg-[rgba(240,247,244,0.75)] border-b border-white/50';
}

export function getNavClass(theme: CardTheme): string {
  if (theme === 'original') {
    return 'bg-cream-50/95 border-t border-cream-200';
  }
  return 'backdrop-blur-xl bg-[rgba(240,247,244,0.8)] border-t border-white/50';
}

export function getBodyBackgroundClass(theme: CardTheme): string {
  if (theme === 'original') {
    return 'bg-cream-50';
  }
  return '';
}

export function getBodyBackgroundStyle(theme: CardTheme): CSSProperties | undefined {
  if (theme === 'glass') {
    return {
      background: 'linear-gradient(170deg, #f0f7f4 0%, #e8f4ef 30%, #f5f0e8 60%, #fdf6ee 100%)',
    };
  }
  return undefined;
}
