import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/data/fruits';
import { nativeJSONStorage } from '@/lib/nativeStorage';

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
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      resetSettings: () =>
        set({
          settings: { ...DEFAULT_SETTINGS },
        }),
      setInitialized: () =>
        set((state) => ({
          settings: { ...state.settings, initialized: true },
        })),
      setSettings: (settings) =>
        set({
          settings: { ...DEFAULT_SETTINGS, ...settings },
        }),
    }),
    {
      name: 'dialysis_settings',
      storage: nativeJSONStorage,
    }
  )
);
