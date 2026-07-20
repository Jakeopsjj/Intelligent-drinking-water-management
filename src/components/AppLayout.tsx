import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Citrus, Settings as SettingsIcon } from 'lucide-react';
import Logo from './Logo';
import { cn } from '@/lib/utils';
import type { FC, ReactNode } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '今日', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: '/records', label: '记录', icon: <BookOpen className="h-4 w-4" /> },
  { to: '/fruits', label: '水果', icon: <Citrus className="h-4 w-4" /> },
  { to: '/settings', label: '设置', icon: <SettingsIcon className="h-4 w-4" /> },
];

const AppLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 border-b border-cream-200 bg-cream-50/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
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
                      : 'text-teal-600 hover:bg-teal-100/60'
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-24 md:pb-8">{children}</main>

      {/* 移动端底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-cream-200 bg-cream-50/90 px-2 backdrop-blur-xl md:hidden">
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
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition',
                  isActive ? 'text-teal-600' : 'text-teal-600/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl transition',
                    isActive && 'bg-teal-100'
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
