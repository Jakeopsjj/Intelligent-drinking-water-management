import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Pill, Settings as SettingsIcon, Droplets, Search, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FC, ReactNode } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '今日', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: '/records', label: '记录', icon: <BookOpen className="h-5 w-5" /> },
  { to: '/diet', label: '饮食', icon: <UtensilsCrossed className="h-5 w-5" /> },
  { to: '/medications', label: '药物', icon: <Pill className="h-5 w-5" /> },
  { to: '/settings', label: '设置', icon: <SettingsIcon className="h-5 w-5" /> },
];

const AppLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div
      className="flex min-h-screen flex-col [scrollbar-gutter:stable]"
      style={{
        // 背景透明：露出底层 LiquidGlassBackground 的 GLSL 纹理 + 气泡
        // 视觉层已在 main.tsx 顶层注入，全局覆盖所有页面（含引导/权限/加载/二级页）
        background: 'transparent',
      }}
    >
      {/* 移动端顶部标题栏：肾友笔记 + 搜索 */}
      <header
        className="glass-bar sticky top-0 z-30 md:hidden"
      >
        <div className="mx-auto flex h-14 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <Droplets className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-semibold text-teal-700">肾友笔记</span>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-teal-600/70 transition active:bg-cream-200">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 桌面端顶部导航 */}
      <header
        className="glass-bar sticky top-0 z-30 hidden md:block"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sage-500 shadow-soft">
              <Droplets className="h-5 w-5 text-white" strokeWidth={2.2} />
              <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-clay-400 ring-2 ring-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-serif text-base font-semibold text-teal-600">肾友笔记</span>
              <span className="text-[10px] text-teal-500/70">透析健康追踪</span>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-teal-500 text-white shadow-soft'
                      : 'glass-tile text-teal-600 hover:bg-teal-100/60'
                  )}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-2 md:px-6 md:py-8 md:pb-8" style={{ minHeight: 'calc(100vh - 112px)' }}>{children}</main>

      {/* 移动端底部导航：毛玻璃效果 + 选中态绿色渐变 */}
      <nav
        className="glass-bar-bottom fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2 md:hidden"
      >
        <div className="mx-auto flex max-w-md items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition',
                  isActive ? 'text-teal-700' : 'text-gray-400'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-br from-teal-400 to-green-500 text-white shadow-lg shadow-teal-500/30'
                      : 'glass-tile text-gray-400'
                  )}
                >
                  {item.icon}
                </div>
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
