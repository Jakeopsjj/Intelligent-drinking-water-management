import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { App as CapacitorApp } from '@capacitor/app';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Records from '@/pages/Records';
import Fruits from '@/pages/Fruits';
import Settings from '@/pages/Settings';
import Onboarding from '@/pages/Onboarding';
import PermissionsGate, { hasAcceptedPermissions } from '@/components/PermissionsGate';
import { useSettingsStore } from '@/store/useSettingsStore';
import { migrateLocalStorageToNative } from '@/lib/nativeStorage';
import { closeTopOverlay } from '@/lib/backHandler';

type AppPhase = 'loading' | 'permissions' | 'ready';

function AppRoutes() {
  const initialized = useSettingsStore((s) => s.settings.initialized);
  const navigate = useNavigate();

  // 监听 Android 硬件返回 / 侧滑手势
  useEffect(() => {
    if (!initialized) return;
    let listener: { remove: () => void } | undefined;
    (async () => {
      try {
        listener = await CapacitorApp.addListener('backButton', () => {
          // 1. 有浮层打开时，关闭最上层浮层（水果选择器 / 头像选择器 / 抽屉等）
          if (closeTopOverlay()) return;
          // 2. 不在首页时，回到首页
          if (window.location.pathname !== '/') {
            navigate('/');
            return;
          }
          // 3. 在首页时，退出应用（标准 Android 行为）
          CapacitorApp.exitApp();
        });
      } catch (e) {
        // Web 环境下监听失败可忽略
      }
    })();
    return () => {
      listener?.remove();
    };
  }, [initialized, navigate]);

  // 未初始化时显示引导页
  if (!initialized) {
    return <Onboarding />;
  }

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/records" element={<Records />} />
          <Route path="/fruits" element={<Fruits />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  );
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('loading');

  useEffect(() => {
    (async () => {
      // 升级时把旧的 WebView localStorage 数据迁移到原生 Preferences
      try {
        await migrateLocalStorageToNative([
          'dialysis_records',
          'dialysis_settings',
          'dialysis_fruits',
        ]);
      } catch (e) {
        console.warn('数据迁移失败', e);
      }

      // 检查是否已同意权限
      try {
        const accepted = await hasAcceptedPermissions();
        setPhase(accepted ? 'ready' : 'permissions');
      } catch (e) {
        // 检查失败默认放行，避免阻塞用户
        setPhase('ready');
      }
    })();
  }, []);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cream-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-3 border-teal-400 border-t-transparent" />
          <p className="text-xs text-teal-600/60">正在加载...</p>
        </div>
      </div>
    );
  }

  if (phase === 'permissions') {
    return <PermissionsGate onAccepted={() => setPhase('ready')} />;
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
