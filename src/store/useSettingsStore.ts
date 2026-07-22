import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/data/fruits';
import { nativeJSONStorage } from '@/lib/nativeStorage';
import { eventBus } from '@/lib/eventBus';
import { EVENT_NAMES } from '@/types/events';

interface SettingsState {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
  setInitialized: () => void;
  setSettings: (settings: UserSettings) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      updateSettings: (partial) =>
        set((state) => {
          const next = { ...state.settings, ...partial };
          // 配置热更新：变更事件实时触达，订阅该数据的所有模块即时刷新
          eventBus.emit(
            EVENT_NAMES.SETTINGS_UPDATED,
            { partial, settings: next },
            'useSettingsStore.updateSettings'
          );
          return { settings: next };
        }),
      resetSettings: () =>
        set(() => {
          const next = { ...DEFAULT_SETTINGS };
          eventBus.emit(
            EVENT_NAMES.SETTINGS_RESET,
            { settings: next },
            'useSettingsStore.resetSettings'
          );
          return { settings: next };
        }),
      setInitialized: () =>
        set((state) => {
          const next = { ...state.settings, initialized: true };
          eventBus.emit(
            EVENT_NAMES.SETTINGS_UPDATED,
            { partial: { initialized: true }, settings: next },
            'useSettingsStore.setInitialized'
          );
          return { settings: next };
        }),
      setSettings: (settings) =>
        set(() => {
          const next = { ...DEFAULT_SETTINGS, ...settings };
          eventBus.emit(
            EVENT_NAMES.SETTINGS_REPLACED,
            { settings: next },
            'useSettingsStore.setSettings'
          );
          return { settings: next };
        }),
    }),
    {
      name: 'dialysis_settings',
      storage: nativeJSONStorage,
    }
  )
);
