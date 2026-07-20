import { StateStorage, createJSONStorage } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// 原生平台：Preferences（Android SharedPreferences / iOS NSUserDefaults）
// Web 平台：localStorage（降级）
const nativeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: name });
      return value;
    }
    return localStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: name, value });
      return;
    }
    localStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: name });
      return;
    }
    localStorage.removeItem(name);
  },
};

// zustand persist 的 storage 适配器
export const nativeJSONStorage = createJSONStorage(() => nativeStorage);

// 把旧 WebView localStorage 数据迁移到原生 Preferences（升级时调用一次）
export async function migrateLocalStorageToNative(keys: string[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const migratedFlag = '__native_storage_migrated__';
  const { value: flag } = await Preferences.get({ key: migratedFlag });
  if (flag === 'done') return;

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw != null) {
      await Preferences.set({ key, value: raw });
      localStorage.removeItem(key);
    }
  }
  await Preferences.set({ key: migratedFlag, value: 'done' });
}
