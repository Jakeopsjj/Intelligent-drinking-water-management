/**
 * GitHub Release 更新检查
 *
 * - 通过 GitHub REST API 获取最新 Release 信息
 * - 比较版本号判断是否有更新
 * - 提供 APK 下载链接
 * - 版本号持久化（用于判断更新后首次打开）
 */

import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';

/** GitHub 仓库信息 */
const GITHUB_OWNER = 'Jakeopsjj';
const GITHUB_REPO = 'Intelligent-drinking-water-management';

/** 当前版本号（从 package.json 编译时注入，这里硬编码同步） */
export const APP_VERSION = '2.9.0';

/** 存储键：上次查看更新内容的版本号 */
const LAST_VIEWED_VERSION_KEY = 'last_viewed_version';

export interface ReleaseInfo {
  /** 版本号（如 "2.9.0"） */
  version: string;
  /** Release 标题 */
  name: string;
  /** 更新内容（Markdown 正文） */
  body: string;
  /** Release HTML 链接 */
  htmlUrl: string;
  /** APK 下载链接 */
  apkUrl?: string;
  /** 发布时间 */
  publishedAt: string;
  /** 是否为预发布 */
  prerelease: boolean;
}

/**
 * 比较语义化版本号
 * @returns 正数表示 a > b（a 更新），0 表示相等，负数表示 a < b
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

/**
 * 检查 GitHub 最新 Release
 * @throws 网络错误时抛出
 */
export async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
    {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error(`GitHub API 返回 ${res.status}`);
  const data = await res.json();

  // 查找 APK 下载链接
  const apkAsset = (data.assets as any[])?.find(
    (a) => a.name?.endsWith('.apk') || a.content_type === 'application/vnd.android.package-archive'
  );

  return {
    version: (data.tag_name as string)?.replace(/^v/, '') ?? '',
    name: data.name ?? '',
    body: data.body ?? '',
    htmlUrl: data.html_url ?? '',
    apkUrl: apkAsset?.browser_download_url,
    publishedAt: data.published_at ?? '',
    prerelease: data.prerelease ?? false,
  };
}

/**
 * 判断是否有可用更新
 */
export async function checkForUpdate(): Promise<{ hasUpdate: boolean; release?: ReleaseInfo }> {
  try {
    const release = await fetchLatestRelease();
    const currentVersion = await getCurrentVersion();
    const hasUpdate = compareVersions(release.version, currentVersion) > 0;
    return { hasUpdate, release };
  } catch {
    return { hasUpdate: false };
  }
}

/**
 * 获取当前 App 版本号
 * 优先使用 Capacitor App.getInfo()，失败时回退到 APP_VERSION 常量
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const info = await CapacitorApp.getInfo();
    return info.version;
  } catch {
    return APP_VERSION;
  }
}

/**
 * 获取上次查看更新内容的版本号
 */
export async function getLastViewedVersion(): Promise<string | null> {
  const { value } = await Preferences.get({ key: LAST_VIEWED_VERSION_KEY });
  return value;
}

/**
 * 记录用户已查看某版本的更新内容
 */
export async function setLastViewedVersion(version: string): Promise<void> {
  await Preferences.set({ key: LAST_VIEWED_VERSION_KEY, value: version });
}

/**
 * 判断是否需要显示更新内容弹窗
 * 当 currentVersion 与 lastViewedVersion 不同时（即更新后首次打开）返回 true
 */
export async function shouldShowChangelog(): Promise<boolean> {
  const current = await getCurrentVersion();
  const last = await getLastViewedVersion();
  if (!last) return true; // 首次安装
  return compareVersions(current, last) > 0;
}

/** GitHub 仓库链接 */
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
/** GitHub Releases 页面链接 */
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;
