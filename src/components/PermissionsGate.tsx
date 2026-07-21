import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, ChevronRight, Database, FileText, Bell } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import { getBodyBackgroundClass, getBodyBackgroundStyle, getPageShellClass } from '@/lib/theme';

const PERMISSIONS_KEY = '__permissions_accepted__';

export interface PermissionItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const PERMISSIONS: PermissionItem[] = [
  {
    icon: <Database className="h-5 w-5" />,
    title: '本地数据存储',
    desc: '将你的健康记录、设置和自定义水果保存在手机本地（Android SharedPreferences），不上传到任何服务器，卸载应用时才会清除',
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: '文件读写（Documents 目录）',
    desc: '导出 JSON 备份、CSV 表格、图片报告时需要写入手机的 Documents 目录；恢复数据时读取备份文件。Android 11+ 在应用专属目录操作，无需向系统申请存储权限',
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: '系统分享菜单',
    desc: '导出文件后调起系统分享菜单，让你选择保存到「文件」「下载」或分享给微信、邮件等应用',
  },
];

interface Props {
  onAccepted: () => void;
}

export default function PermissionsGate({ onAccepted }: Props) {
  const cardTheme = useSettingsStore((s) => s.settings.cardTheme || 'glass');
  const isOriginal = cardTheme === 'original';
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(PERMISSIONS.map(() => false));

  const allChecked = checked.every(Boolean);

  const handleNext = async () => {
    if (step < PERMISSIONS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: PERMISSIONS_KEY, value: 'accepted' });
    } else {
      localStorage.setItem(PERMISSIONS_KEY, 'accepted');
    }
    onAccepted();
  };

  const current = PERMISSIONS[step];
  const bodyBgClass = getBodyBackgroundClass(cardTheme);
  const bodyBgStyle = getBodyBackgroundStyle(cardTheme);

  return (
    <div
      className={cn('min-h-screen px-6 py-10', isOriginal ? 'bg-cream-50' : 'bg-gradient-to-br from-teal-50 to-cream-100', bodyBgClass)}
      style={bodyBgStyle}
    >
      <div className="mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-500 text-white shadow-lg">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-teal-700">应用权限说明</h1>
          <p className="mt-1 text-xs text-teal-600/60">肾友笔记需要的权限与用途</p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className={cn('rounded-3xl border p-6', getPageShellClass(cardTheme))}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
                {current.icon}
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-teal-600/50">第 {step + 1} / {PERMISSIONS.length} 项</div>
                <h2 className="font-serif text-lg font-semibold text-teal-700">{current.title}</h2>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-teal-700/80">{current.desc}</p>

            <label className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setChecked((c) => c.map((v, i) => (i === step ? true : v)))}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md border transition',
                  checked[step]
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : 'border-cream-400 bg-white'
                )}
              >
                {checked[step] && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className="text-xs text-teal-700">我已了解并同意此权限</span>
            </label>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {PERMISSIONS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-teal-500' : i < step ? 'w-1.5 bg-teal-400' : 'w-1.5 bg-cream-300'
                )}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            disabled={!checked[step]}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-medium transition',
              checked[step]
                ? 'bg-teal-500 text-white hover:bg-teal-600'
                : 'border border-cream-300 bg-white text-teal-600/40'
            )}
          >
            {step < PERMISSIONS.length - 1 ? '下一步' : '进入应用'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {step === PERMISSIONS.length - 1 && (
          <p className="mt-4 text-center text-[10px] text-teal-600/50">
            你可以随时在「设置 → 关于」中查看应用权限说明
          </p>
        )}
      </div>
    </div>
  );
}

export async function hasAcceptedPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: PERMISSIONS_KEY });
    return value === 'accepted';
  }
  return localStorage.getItem(PERMISSIONS_KEY) === 'accepted';
}
