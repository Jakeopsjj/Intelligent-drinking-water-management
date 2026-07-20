import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Records from '@/pages/Records';
import Fruits from '@/pages/Fruits';
import Settings from '@/pages/Settings';
import Onboarding from '@/pages/Onboarding';
import { useSettingsStore } from '@/store/useSettingsStore';

function AppRoutes() {
  const initialized = useSettingsStore((s) => s.settings.initialized);

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
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
