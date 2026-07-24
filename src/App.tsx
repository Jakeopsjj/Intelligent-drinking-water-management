import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { App as CapacitorApp } from '@capacitor/app';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Records from '@/pages/Records';
import Fruits from '@/pages/Fruits';
import Diet from '@/pages/Diet';
import Medications from '@/pages/Medications';
import MedicationPlan from '@/pages/MedicationPlan';
import Settings from '@/pages/Settings';
import Onboarding from '@/pages/Onboarding';
import PermissionsGate, { hasAcceptedPermissions } from '@/components/PermissionsGate';
import UpdateModal from '@/components/UpdateModal';
import { useSettingsStore } from '@/store/useSettingsStore';
import { migrateLocalStorageToNative } from '@/lib/nativeStorage';
import { closeTopOverlay } from '@/lib/backHandler';
import { useDataSync } from '@/hooks/useDataSync';
import { registerModuleEffects, printDependencyGraph } from '@/modules';
import { shouldShowChangelog } from '@/lib/updateChecker';
import { initNotificationService, rescheduleAllReminders } from '@/lib/notificationService';
import { useMedicationPlanStore } from '@/store/useMedicationPlanStore';

type AppPhase = 'loading' | 'permissions' | 'ready';

function AppRoutes() {
  const initialized = useSettingsStore((s) => s.settings.initialized);
  const navigate = useNavigate();
  // 启用事件驱动数据同步：跨模块实时联动 + 配置热更新
  useDataSync();

  // 模块化解耦架构：注册跨模块副作用编排 + 打印依赖图（开发态）
  useEffect(() => {
    const unregister = registerModuleEffects();
    printDependencyGraph();
    return unregister;
  }, []);

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
      <AnimatePresence mode="popLayout">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/records" element={<Records />} />
          <Route path="/fruits" element={<Fruits />} />
          <Route path="/diet" element={<Diet />} />
          <Route path="/medications" element={<Medications />} />
          <Route path="/medication-plan" element={<MedicationPlan />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  );
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [showChangelog, setShowChangelog] = useState(false);

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

      // 检查是否需要显示更新内容弹窗（更新后首次打开）
      try {
        const needChangelog = await shouldShowChangelog();
        if (needChangelog) {
          // 延迟一点显示，等主界面渲染完成
          setTimeout(() => setShowChangelog(true), 800);
        }
      } catch (e) {
        // 检查失败忽略，不影响正常使用
      }

      // 初始化服药提醒通知服务
      try {
        await initNotificationService();
        // 重新调度所有启用的服药计划通知
        const plans = useMedicationPlanStore.getState().plans;
        await rescheduleAllReminders(plans);
      } catch (e) {
        // 通知初始化失败不阻塞 App
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
      {/* 更新后首次打开弹窗 */}
      <UpdateModal
        open={showChangelog}
        onClose={() => setShowChangelog(false)}
        mode="changelog"
      />
    </Router>
  );
}
