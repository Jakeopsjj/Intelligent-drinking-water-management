/**
 * 反馈联系弹窗
 *
 * 点击后显示 QQ 邮箱和微信联系方式：
 * - 点击邮箱：跳转到 QQ 邮箱发邮件界面（mailto 协议兜底）
 * - 点击微信：跳转到微信加好友界面（weixin:// 深链接兜底复制微信号）
 *
 * 通过 createPortal 渲染到 document.body。
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

const AUTHOR_EMAIL = '1526127247@qq.com';
const AUTHOR_WECHAT = 'C1526127247';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  useOverlayBackHandler(open, onClose);
  useLockBodyScroll(open);

  const [copiedType, setCopiedType] = useState<'email' | 'wechat' | null>(null);

  const copyToClipboard = async (text: string, type: 'email' | 'wechat') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1500);
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedType(type);
        setTimeout(() => setCopiedType(null), 1500);
      } catch {
        // 忽略
      }
      document.body.removeChild(textarea);
    }
  };

  /** 跳转到 QQ 邮箱发邮件 */
  const handleEmailClick = async () => {
    // 先复制邮箱到剪贴板
    await copyToClipboard(AUTHOR_EMAIL, 'email');
    // 尝试打开 QQ 邮箱 App（深链接）
    const mailtoUrl = `mailto:${AUTHOR_EMAIL}?subject=%E8%82%BE%E5%8F%8B%E7%AC%94%E8%AE%B0%E7%94%A8%E6%88%B7%E5%8F%8D%E9%A6%88`;
    // 同时尝试 QQ 邮箱 app 深链接
    const qqMailUrl = `qqmail://compose?to=${AUTHOR_EMAIL}`;

    // 在 Capacitor WebView 中，先尝试深链接，失败则回退 mailto
    window.location.href = qqMailUrl;
    // 1.5 秒后如果还在当前页面，回退到 mailto
    setTimeout(() => {
      window.location.href = mailtoUrl;
    }, 1500);
  };

  /** 跳转到微信加好友 */
  const handleWeChatClick = async () => {
    // 先复制微信号到剪贴板
    await copyToClipboard(AUTHOR_WECHAT, 'wechat');
    // 尝试打开微信 App
    window.location.href = 'weixin://';
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-teal-700/40 backdrop-blur-sm sm:items-center"
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
            className="glass-card relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl"
          >
            <div className="glass-shimmer" />
            <button
              onClick={onClose}
              aria-label="关闭"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-teal-600 backdrop-blur-sm transition hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 p-6">
              <div className="mb-1 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-teal-500" />
                <h2 className="font-serif text-xl font-semibold text-teal-700">意见反馈</h2>
              </div>
              <p className="mb-5 text-sm text-teal-600/60">
                有任何问题或建议，欢迎通过以下方式联系作者
              </p>

              {/* QQ 邮箱 */}
              <button
                onClick={handleEmailClick}
                className="group mb-3 flex w-full items-center gap-4 rounded-2xl bg-blue-50 p-4 text-left transition hover:bg-blue-100"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-soft">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-blue-700">QQ 邮箱</span>
                    <ExternalLink className="h-3 w-3 text-blue-400" />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-blue-600/70">
                    {AUTHOR_EMAIL}
                  </div>
                  <div className="mt-0.5 text-[10px] text-blue-500/60">
                    点击跳转到邮箱发邮件
                  </div>
                </div>
                {copiedType === 'email' ? (
                  <Check className="h-4 w-4 flex-shrink-0 text-sage-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 flex-shrink-0 text-blue-400 opacity-0 transition group-hover:opacity-100" />
                )}
              </button>

              {/* 微信 */}
              <button
                onClick={handleWeChatClick}
                className="group mb-3 flex w-full items-center gap-4 rounded-2xl bg-green-50 p-4 text-left transition hover:bg-green-100"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-500 text-white shadow-soft">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-green-700">微信</span>
                    <ExternalLink className="h-3 w-3 text-green-400" />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-green-600/70">
                    微信号：{AUTHOR_WECHAT}
                  </div>
                  <div className="mt-0.5 text-[10px] text-green-500/60">
                    点击跳转微信加好友（微信号已复制）
                  </div>
                </div>
                {copiedType === 'wechat' ? (
                  <Check className="h-4 w-4 flex-shrink-0 text-sage-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 flex-shrink-0 text-green-400 opacity-0 transition group-hover:opacity-100" />
                )}
              </button>

              {/* 提示 */}
              <div className="mt-4 rounded-xl bg-cream-100/50 px-4 py-3">
                <p className="text-[11px] leading-relaxed text-teal-600/50">
                  点击对应方式后将自动跳转到相应应用，联系方式已自动复制到剪贴板。如果跳转失败，可手动粘贴联系方式进行搜索。
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
