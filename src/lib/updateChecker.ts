/**
 * GitHub Release 更新检查
 *
 * - 通过 GitHub REST API 获取最新 Release 信息
 * - 比较版本号判断是否有更新
 * - 提供 APK 下载链接
 * - 版本号持久化（用于判断更新后首次打开）
 * - 内置本地更新日志，网络不可用时降级展示
 */

import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';

/** GitHub 仓库信息 */
const GITHUB_OWNER = 'Jakeopsjj';
const GITHUB_REPO = 'Intelligent-drinking-water-management';

/** 当前版本号（从 package.json 编译时注入，这里硬编码同步） */
export const APP_VERSION = '2.20.0';

/** 存储键：上次查看更新内容的版本号 */
const LAST_VIEWED_VERSION_KEY = 'last_viewed_version';

/**
 * 本地内置更新日志
 * 当 GitHub API 不可用时作为降级展示方案
 * 格式：按版本号索引，值为 Markdown 格式的更新内容
 */
const LOCAL_CHANGELOG: Record<string, string> = {
  '2.20.0': `### 新增功能

- **版本更新日志系统**：新增 APP 内置「检查更新」功能完整更新日志展示，支持本地内置 changelog 降级方案，网络不可用时仍可查看版本更新内容
- **透析数据统计分析模块**：首页新增透析数据仪表盘，自动核算每日摄水量与剩余饮水限额；记录透析前后体重并自动计算体重增长差值；归档历次超滤量、血压、心率数据，新增趋势曲线图直观展示指标变化
- **透析专项日志系统**：支持录入每次透析相关信息（透析日期、时长、超滤量、干体重等），可登记透析中各类不适症状（抽筋、低血压、胃痛、乏力、头痛、恶心等），永久保存历史记录，方便长期随访查看
- **健康指标智能预警**：针对体重涨幅超标、每日摄水量超限、血压数值异常（收缩压/舒张压）等场景增加预警提示，帮助及时发现健康风险
- **饮食百科透析评估**：查询水果、食材时重点展示钾、磷含量，新增透析人群专属饮食评估（高钾/中钾/低钾分级、磷含量评估），提供透析人群食用建议与安全摄入指导
- **本地数据自动备份与恢复**：支持定期自动备份（默认每6小时），保留最近3个备份；支持手动备份与备份列表管理；支持从备份恢复数据，保障用户长期记录数据安全

### 交互优化

- 优化饮食百科图文加载容错逻辑，避免空白、加载失败
- 优化记录展示组件交互体验
- 设置页面新增备份管理区域，支持备份开关、备份状态显示、历史备份列表

### 缺陷修复

- 修复版本号打包不一致问题，新增版本号校验机制，确保构建版本、应用内显示版本、更新检查版本三处统一
- 修复数据导出文件格式问题`,
  '2.19.0': `### 新增功能

- **透析数据统计分析模块**：首页新增透析数据仪表盘，自动核算每日摄水量与剩余饮水限额；记录透析前后体重并自动计算体重增长差值；归档历次超滤量、血压、心率数据，新增趋势曲线图直观展示指标变化
- **透析专项日志系统**：支持录入每次透析相关信息（透析日期、时长、超滤量、干体重等），可登记透析中各类不适症状（抽筋、低血压、胃痛、乏力、头痛、恶心等），永久保存历史记录，方便长期随访查看
- **健康指标智能预警**：针对体重涨幅超标、每日摄水量超限、血压数值异常（收缩压/舒张压）等场景增加预警提示，帮助及时发现健康风险
- **饮食百科透析评估**：查询水果、食材时重点展示钾、磷含量，新增透析人群专属饮食评估（高钾/中钾/低钾分级、磷含量评估），提供透析人群食用建议与安全摄入指导
- **本地数据自动备份与恢复**：支持定期自动备份（默认每6小时），保留最近3个备份；支持手动备份与备份列表管理；支持从备份恢复数据，保障用户长期记录数据安全

### 交互优化

- 优化饮食百科图文加载容错逻辑，避免空白、加载失败
- 优化记录展示组件交互体验
- 设置页面新增备份管理区域，支持备份开关、备份状态显示、历史备份列表

### 缺陷修复

- 修复版本号打包不一致问题，新增版本号校验机制，确保构建版本、应用内显示版本、更新检查版本三处统一
- 修复数据导出文件格式问题`,
};

export interface ReleaseInfo {
  /** 版本号（如 "2.9.0"） */
  version: string;
  /** Release 标题 */
  name: string;
  /** 更新内容（Markdown 正文） */
  body: string;
  /** Release HTML 链接 */
  htmlUrl: string;
  /** Debug APK 下载链接 */
  debugApkUrl?: string;
  /** Release APK 下载链接 */
  releaseApkUrl?: string;
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

  // 查找 Debug 和 Release APK 下载链接
  const assets = (data.assets as any[]) ?? [];
  const debugAsset = assets.find((a) => a.name === 'app-debug.apk');
  const releaseAsset = assets.find((a) => a.name === 'app-release.apk');

  return {
    version: (data.tag_name as string)?.replace(/^v/, '') ?? '',
    name: data.name ?? '',
    body: data.body ?? '',
    htmlUrl: data.html_url ?? '',
    debugApkUrl: debugAsset?.browser_download_url,
    releaseApkUrl: releaseAsset?.browser_download_url,
    publishedAt: data.published_at ?? '',
    prerelease: data.prerelease ?? false,
  };
}

/**
 * 获取本地内置 Release 信息（网络不可用时的降级方案）
 * @param version 目标版本号，默认取当前 APP_VERSION
 */
export function getLocalReleaseInfo(version?: string): ReleaseInfo {
  const v = version ?? APP_VERSION;
  const body = LOCAL_CHANGELOG[v] ?? '';
  return {
    version: v,
    name: `v${v}`,
    body,
    htmlUrl: GITHUB_RELEASES_URL,
    debugApkUrl: undefined,
    releaseApkUrl: undefined,
    publishedAt: new Date().toISOString(),
    prerelease: false,
  };
}

/**
 * 获取当前版本的本地更新日志内容
 */
export function getLocalChangelog(): string {
  return LOCAL_CHANGELOG[APP_VERSION] ?? '';
}

/**
 * 判断是否有可用更新
 * 优先从 GitHub API 获取，网络失败时降级使用本地日志
 */
export async function checkForUpdate(): Promise<{ hasUpdate: boolean; release?: ReleaseInfo }> {
  try {
    const release = await fetchLatestRelease();
    const currentVersion = await getCurrentVersion();
    const hasUpdate = compareVersions(release.version, currentVersion) > 0;
    return { hasUpdate, release };
  } catch {
    // 网络不可用，返回本地版本信息
    return {
      hasUpdate: false,
      release: getLocalReleaseInfo(),
    };
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
