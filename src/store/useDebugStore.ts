import { create } from 'zustand';

export type LogLevel = 'info' | 'warn' | 'error' | 'api' | 'network';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
  source?: string;
}

interface DebugStore {
  logs: LogEntry[];
  enabled: boolean;
  filter: LogLevel | 'all';
  maxEntries: number;
  addLog: (level: LogLevel, message: string, details?: Record<string, unknown>, source?: string) => void;
  clearLogs: () => void;
  toggleEnabled: () => void;
  setFilter: (filter: LogLevel | 'all') => void;
  getFilteredLogs: () => LogEntry[];
}

export const useDebugStore = create<DebugStore>((set, get) => ({
  logs: [],
  enabled: true,
  filter: 'all',
  maxEntries: 200,
  addLog: (level, message, details, source) => {
    const { logs, maxEntries } = get();
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      details,
      source,
    };
    const newLogs = [entry, ...logs].slice(0, maxEntries);
    set({ logs: newLogs });
  },
  clearLogs: () => set({ logs: [] }),
  toggleEnabled: () => set((s) => ({ enabled: !s.enabled })),
  setFilter: (filter) => set({ filter }),
  getFilteredLogs: () => {
    const { logs, filter } = get();
    if (filter === 'all') return logs;
    return logs.filter((log) => log.level === filter);
  },
}));

export const logger = {
  info: (message: string, details?: Record<string, unknown>, source?: string) => {
    useDebugStore.getState().addLog('info', message, details, source);
    console.log(`[INFO] ${message}`, details);
  },
  warn: (message: string, details?: Record<string, unknown>, source?: string) => {
    useDebugStore.getState().addLog('warn', message, details, source);
    console.warn(`[WARN] ${message}`, details);
  },
  error: (message: string, details?: Record<string, unknown>, source?: string) => {
    useDebugStore.getState().addLog('error', message, details, source);
    console.error(`[ERROR] ${message}`, details);
  },
  api: (message: string, details?: Record<string, unknown>, source?: string) => {
    useDebugStore.getState().addLog('api', message, details, source);
    console.log(`[API] ${message}`, details);
  },
  network: (message: string, details?: Record<string, unknown>, source?: string) => {
    useDebugStore.getState().addLog('network', message, details, source);
    console.log(`[NETWORK] ${message}`, details);
  },
};
