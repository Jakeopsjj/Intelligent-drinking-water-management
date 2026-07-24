/**
 * 更新弹窗组件
 *
 * 两种模式：
 * 1. changelog 模式 — 更新后首次打开，显示当前版本的更新内容
 * 2. updateAvailable 模式 — 检查到新版本，显示下载按钮
 *
 * 通过 createPortal 渲染到 document.body
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Sparkles, ExternalLink, Loader2, Check } from 'lucide-react';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import {
  fetchLatestRelease,
  getCurrentVersion,
  setLastViewedVersion,
  compareVersions,
  getLocalReleaseInfo,
  GITHUB_RELEASES_URL,
  type ReleaseInfo,
} from '@/lib/updateChecker';

interface UpdateModalProps {
  open: boolean;
  onClose: () => void;
  /** 模式：changelog=更新后首次显示，updateAvailable=检查到新版本 */
  mode: 'changelog' | 'updateAvailable';
  /** changelog 模式下传入当前版本的 Release 信息（可空，为空时尝试联网获取） */
  release?: ReleaseInfo | null;
}

export default function UpdateModal({ open, onClose, mode, release: releaseProp }: UpdateModalProps) {
  useOverlayBackHandler(open, onClose);
  useLockBodyScroll(open);

  const [release, setRelease] = useState<ReleaseInfo | null>(releaseProp ?? null);
  const [loading, setLoading] = useState(!releaseProp && open);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    if (!open) return;
    getCurrentVersion().then(setCurrentVersion);

    // 如果没有传入 release，尝试联网获取
    if (!releaseProp) {
      setLoading(true);
      fetchLatestRelease()
        .then((r) => {
          setRelease(r);
          setLoading(false);
        })
        .catch(() => {
          // 网络不可用，降级使用本地内置更新日志
          setRelease(getLocalReleaseInfo());
          setLoading(false);
        });
    } else {
      setRelease(releaseProp);
    }
  }, [open, releaseProp]);

  const handleConfirm = async () => {
    // changelog 模式：记录已查看当前版本
    if (mode === 'changelog') {
      const v = await getCurrentVersion();
      await setLastViewedVersion(v);
    }
    onClose();
  };

  const handleDownloadDebug = async () => {
    if (release?.debugApkUrl) {
      setDownloading(true);
      window.open(release.debugApkUrl, '_blank');
      setTimeout(() => setDownloading(false), 1500);
    } else if (release?.htmlUrl) {
      window.open(release.htmlUrl, '_blank');
    }
  };

  const handleDownloadRelease = async () => {
    if (release?.releaseApkUrl) {
      setDownloading(true);
      window.open(release.releaseApkUrl, '_blank');
      setTimeout(() => setDownloading(false), 1500);
    } else if (release?.htmlUrl) {
      window.open(release.htmlUrl, '_blank');
    }
  };

  const isUpdateAvailable =
    mode === 'updateAvailable' &&
    release &&
    currentVersion &&
    compareVersions(release.version, currentVersion) > 0;

  const title =
    mode === 'changelog'
      ? `已更新至 v${currentVersion}`
      : isUpdateAvailable
      ? `发现新版本 v${release?.version}`
      : '检查更新';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-teal-700/50 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card relative max-h-[85dvh] w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl [will-change:transform] [transform:translateZ(0)]"
          >
            <div className="glass-shimmer" />

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              aria-label="关闭"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-teal-600 backdrop-blur-sm transition hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 flex max-h-[85dvh] flex-col">
              {/* 头部 */}
              <div className="flex-shrink-0 border-b border-cream-200 p-5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-sage-400 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-teal-700">
                      {title}
                    </h2>
                    {release?.publishedAt && (
                      <p className="text-[10px] text-teal-600/50">
                        {new Date(release.publishedAt).toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 内容区 */}
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                    <p className="text-xs text-teal-600/60">获取更新内容...</p>
                  </div>
                ) : error ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ) : !isUpdateAvailable && mode === 'updateAvailable' ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                      <Check className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-teal-700">已是最新版本</p>
                    <p className="text-xs text-teal-600/50">当前版本 v{currentVersion}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 更新内容 */}
                    {release?.body && (
                      <div className="glass-tile rounded-2xl p-4">
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-teal-600">
                          <Sparkles className="h-3.5 w-3.5" />
                          更新内容
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-teal-700/80">
                          {formatReleaseBody(release.body)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 底部操作区 */}
              <div className="flex-shrink-0 border-t border-cream-200 p-4">
                {mode === 'changelog' ? (
                  <button
                    onClick={handleConfirm}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-500 to-sage-500 px-4 py-2.5 text-sm font-medium text-white transition hover:shadow-soft"
                  >
                    <Check className="h-4 w-4" /> 知道了
                  </button>
                ) : isUpdateAvailable ? (
                  <div className="space-y-2">
                    {/* Release 版本（推荐） */}
                    <button
                      onClick={handleDownloadRelease}
                      disabled={downloading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-500 to-sage-500 px-4 py-2.5 text-sm font-medium text-white transition hover:shadow-soft disabled:opacity-60"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> 正在跳转...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" /> 下载 Release 版（推荐）
                        </>
                      )}
                    </button>
                    {/* Debug 版本 */}
                    <button
                      onClick={handleDownloadDebug}
                      disabled={downloading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-300 px-4 py-2.5 text-sm font-medium text-teal-600 transition hover:bg-teal-50 disabled:opacity-60"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> 正在跳转...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" /> 下载 Debug 版
                        </>
                      )}
                    </button>
                    {/* Release 页面链接 */}
                    <button
                      onClick={() => window.open(GITHUB_RELEASES_URL, '_blank')}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs text-teal-600/60 hover:text-teal-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> 在浏览器中打开 Release 页面
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full rounded-xl border border-cream-300 px-4 py-2.5 text-sm font-medium text-teal-600 hover:bg-cream-100"
                  >
                    关闭
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** 简化 Release body 的 Markdown 格式，移除标题井号 */
function formatReleaseBody(body: string): string {
  return body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}
