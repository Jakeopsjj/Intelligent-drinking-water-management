/**
 * 本地数据自动备份服务
 *
 * 定期自动将完整数据备份到设备本地存储，保障用户长期记录数据不丢失。
 * - 自动备份间隔：默认 6 小时
 * - 保留最近 3 个自动备份
 * - 使用 Capacitor Filesystem 存储在 Documents 目录
 * - 支持手动触发备份、列出备份、恢复备份、删除备份
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import type { AnyRecord, UserSettings, Fruit } from '@/types';

export interface BackupEntry {
  /** 文件名 */
  filename: string;
  /** 备份时间戳 */
  timestamp: number;
  /** 记录数量 */
  recordCount: number;
  /** 文件大小（字节） */
  size: number;
}

export interface BackupData {
  meta: {
    app: 'kidney-notes';
    version: string;
    exportedAt: string;
    recordCount: number;
    autoBackup: true;
  };
  settings: UserSettings;
  fruits: Fruit[];
  records: AnyRecord[];
}

/** 备份目录名 */
const BACKUP_DIR = 'auto_backups';
/** 保留的最大备份数量 */
const MAX_BACKUPS = 3;
/** 自动备份间隔（毫秒），默认 6 小时 */
const DEFAULT_INTERVAL = 6 * 60 * 60 * 1000;
/** 存储自动备份间隔的 key */
const INTERVAL_KEY = 'auto_backup_interval_ms';
/** 存储上次备份时间的 key */
const LAST_BACKUP_KEY = 'auto_backup_last_timestamp';
/** 存储自动备份功能的启用状态 key */
const AUTO_BACKUP_ENABLED_KEY = 'auto_backup_enabled';

/**
 * 从 localStorage 读取简单值，原生平台从 Preferences
 */
async function getStorageValue(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return localStorage.getItem(key);
    }
  }
  return localStorage.getItem(key);
}

async function setStorageValue(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
      return;
    } catch {
      // fallback
    }
  }
  localStorage.setItem(key, value);
}

/**
 * 获取自动备份启用状态
 */
export async function isAutoBackupEnabled(): Promise<boolean> {
  const val = await getStorageValue(AUTO_BACKUP_ENABLED_KEY);
  return val === 'true';
}

/**
 * 设置自动备份启用状态
 */
export async function setAutoBackupEnabled(enabled: boolean): Promise<void> {
  await setStorageValue(AUTO_BACKUP_ENABLED_KEY, String(enabled));
}

/**
 * 获取自动备份间隔（毫秒）
 */
export async function getAutoBackupInterval(): Promise<number> {
  const val = await getStorageValue(INTERVAL_KEY);
  return val ? parseInt(val, 10) : DEFAULT_INTERVAL;
}

/**
 * 设置自动备份间隔（毫秒）
 */
export async function setAutoBackupInterval(ms: number): Promise<void> {
  await setStorageValue(INTERVAL_KEY, String(ms));
}

/**
 * 获取上次备份时间
 */
export async function getLastBackupTimestamp(): Promise<number | null> {
  const val = await getStorageValue(LAST_BACKUP_KEY);
  return val ? parseInt(val, 10) : null;
}

/**
 * 记录上次备份时间
 */
async function setLastBackupTimestamp(ts: number): Promise<void> {
  await setStorageValue(LAST_BACKUP_KEY, String(ts));
}

/**
 * 生成备份文件名
 */
function genBackupFilename(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `auto_backup_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.json`;
}

/**
 * 执行自动备份
 * 1. 收集当前数据
 * 2. 写入文件
 * 3. 清理旧备份（保留最近 MAX_BACKUPS 个）
 */
export async function performAutoBackup(
  records: AnyRecord[],
  settings: UserSettings,
  fruits: Fruit[]
): Promise<BackupEntry | null> {
  try {
    const backupData: BackupData = {
      meta: {
        app: 'kidney-notes',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        recordCount: records.length,
        autoBackup: true,
      },
      settings,
      fruits,
      records: [...records].sort((a, b) => a.timestamp - b.timestamp),
    };

    const content = JSON.stringify(backupData, null, 2);
    const filename = genBackupFilename();

    if (Capacitor.isNativePlatform()) {
      const base64 = btoa(unescape(encodeURIComponent(content)));
      await Filesystem.writeFile({
        path: `${BACKUP_DIR}/${filename}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
    } else {
      // Web 平台：使用 localStorage 模拟
      await setStorageValue(`backup_${filename}`, content);
      // 保持备份索引
      const index = await getBackupIndex();
      index.push(filename);
      await setStorageValue('auto_backup_index', JSON.stringify(index));
    }

    // 更新最后备份时间
    await setLastBackupTimestamp(Date.now());

    // 清理旧备份
    await cleanupOldBackups();

    return {
      filename,
      timestamp: Date.now(),
      recordCount: records.length,
      size: new Blob([content]).size,
    };
  } catch (e) {
    console.error('自动备份失败:', e);
    return null;
  }
}

/**
 * 获取备份文件索引
 */
async function getBackupIndex(): Promise<string[]> {
  const val = await getStorageValue('auto_backup_index');
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

/**
 * 清理旧备份，保留最近 MAX_BACKUPS 个
 */
async function cleanupOldBackups(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await Filesystem.readdir({
        path: BACKUP_DIR,
        directory: Directory.Documents,
      });
      const files = result.files
        .filter((f) => f.name.startsWith('auto_backup_') && f.name.endsWith('.json'))
        .sort((a, b) => b.name.localeCompare(a.name)); // 按文件名降序（文件名含时间戳）

      // 删除超出数量的旧备份
      const toDelete = files.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        try {
          await Filesystem.deleteFile({
            path: `${BACKUP_DIR}/${file.name}`,
            directory: Directory.Documents,
          });
        } catch {
          // 忽略删除失败
        }
      }
    } else {
      const index = await getBackupIndex();
      const sorted = [...index].sort().reverse();
      const toDelete = sorted.slice(MAX_BACKUPS);
      for (const filename of toDelete) {
        await setStorageValue(`backup_${filename}`, '');
        try {
          localStorage.removeItem(`backup_${filename}`);
        } catch {
          // 忽略
        }
      }
      const remaining = sorted.slice(0, MAX_BACKUPS);
      await setStorageValue('auto_backup_index', JSON.stringify(remaining));
    }
  } catch {
    // 忽略清理失败
  }
}

/**
 * 列出所有自动备份
 */
export async function listAutoBackups(): Promise<BackupEntry[]> {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await Filesystem.readdir({
        path: BACKUP_DIR,
        directory: Directory.Documents,
      });
      const entries: BackupEntry[] = [];
      for (const file of result.files) {
        if (!file.name.startsWith('auto_backup_') || !file.name.endsWith('.json')) continue;
        // 从文件名解析时间戳
        const match = file.name.match(/auto_backup_(\d{8})_(\d{6})\.json/);
        let timestamp = 0;
        if (match) {
          const dateStr = match[1]; // YYYYMMDD
          const timeStr = match[2]; // HHMMSS
          const year = parseInt(dateStr.slice(0, 4), 10);
          const month = parseInt(dateStr.slice(4, 6), 10) - 1;
          const day = parseInt(dateStr.slice(6, 8), 10);
          const hour = parseInt(timeStr.slice(0, 2), 10);
          const min = parseInt(timeStr.slice(2, 4), 10);
          const sec = parseInt(timeStr.slice(4, 6), 10);
          timestamp = new Date(year, month, day, hour, min, sec).getTime();
        }
        // 尝试读取记录数
        let recordCount = 0;
        try {
          const { data } = await Filesystem.readFile({
            path: `${BACKUP_DIR}/${file.name}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          });
          const parsed = JSON.parse(data as string);
          recordCount = parsed?.meta?.recordCount ?? parsed?.records?.length ?? 0;
        } catch {
          // 读取失败
        }
        entries.push({
          filename: file.name,
          timestamp,
          recordCount,
          size: file.size || 0,
        });
      }
      return entries.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      const index = await getBackupIndex();
      const entries: BackupEntry[] = [];
      for (const filename of index) {
        const content = await getStorageValue(`backup_${filename}`);
        let recordCount = 0;
        let size = 0;
        if (content) {
          size = new Blob([content]).size;
          try {
            const parsed = JSON.parse(content);
            recordCount = parsed?.meta?.recordCount ?? parsed?.records?.length ?? 0;
          } catch {
            // 忽略
          }
        }
        const match = filename.match(/auto_backup_(\d{8})_(\d{6})\.json/);
        let timestamp = 0;
        if (match) {
          const dateStr = match[1];
          const timeStr = match[2];
          const year = parseInt(dateStr.slice(0, 4), 10);
          const month = parseInt(dateStr.slice(4, 6), 10) - 1;
          const day = parseInt(dateStr.slice(6, 8), 10);
          const hour = parseInt(timeStr.slice(0, 2), 10);
          const min = parseInt(timeStr.slice(2, 4), 10);
          const sec = parseInt(timeStr.slice(4, 6), 10);
          timestamp = new Date(year, month, day, hour, min, sec).getTime();
        }
        entries.push({ filename, timestamp, recordCount, size });
      }
      return entries.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch {
    return [];
  }
}

/**
 * 从自动备份恢复数据
 */
export async function restoreFromAutoBackup(filename: string): Promise<BackupData | null> {
  try {
    let content: string;
    if (Capacitor.isNativePlatform()) {
      const { data } = await Filesystem.readFile({
        path: `${BACKUP_DIR}/${filename}`,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      content = data as string;
    } else {
      const val = await getStorageValue(`backup_${filename}`);
      if (!val) return null;
      content = val;
    }
    const parsed = JSON.parse(content);
    if (!parsed || parsed.meta?.app !== 'kidney-notes') {
      return null;
    }
    return parsed as BackupData;
  } catch {
    return null;
  }
}

/**
 * 删除指定自动备份
 */
export async function deleteAutoBackup(filename: string): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.deleteFile({
        path: `${BACKUP_DIR}/${filename}`,
        directory: Directory.Documents,
      });
    } else {
      await setStorageValue(`backup_${filename}`, '');
      try {
        localStorage.removeItem(`backup_${filename}`);
      } catch {
        // 忽略
      }
      const index = await getBackupIndex();
      const updated = index.filter((f) => f !== filename);
      await setStorageValue('auto_backup_index', JSON.stringify(updated));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查是否需要自动备份
 * 返回 true 表示距离上次备份已超过间隔时间
 */
export async function shouldAutoBackup(): Promise<boolean> {
  const enabled = await isAutoBackupEnabled();
  if (!enabled) return false;

  const lastBackup = await getLastBackupTimestamp();
  if (!lastBackup) return true; // 从未备份过

  const interval = await getAutoBackupInterval();
  return Date.now() - lastBackup >= interval;
}

/**
 * 格式化文件大小
 */
export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 格式化时间戳
 */
export function formatBackupTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 启动自动备份定时器
 * 返回定时器 ID，组件卸载时需清除
 */
let autoBackupTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoBackupTimer(
  callback: () => Promise<void>,
  intervalMs: number = DEFAULT_INTERVAL
): void {
  stopAutoBackupTimer();
  autoBackupTimer = setInterval(async () => {
    const shouldBackup = await shouldAutoBackup();
    if (shouldBackup) {
      await callback();
    }
  }, Math.min(intervalMs, 60 * 60 * 1000)); // 最多每小时检查一次
}

export function stopAutoBackupTimer(): void {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
}