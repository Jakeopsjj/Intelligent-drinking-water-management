/**
 * 通用详情抽屉组件
 *
 * 被水果页 / 药物页复用，展示：
 * - 顶部大图（真实配图，静态优先，否则自动联网获取）
 * - 名称 + emoji + 别名/分类标签
 * - 介绍（静态优先，否则联网获取） / 使用说明 / 成分 等结构化字段
 *
 * 通过 createPortal 渲染到 document.body，
 * 通过 useLockBodyScroll + useOverlayBackHandler 处理返回键 / 侧滑。
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, BookOpen, Beaker, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEntityInfo } from '@/hooks/useEntityInfo';
import type { ReactNode } from 'react';

export interface DetailField {
  icon?: ReactNode;
  label: string;
  content: ReactNode;
}

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  /** 顶部图片 URL（静态，优先使用；为空时自动联网获取） */
  image?: string;
  /** 名称 */
  name: string;
  /** emoji */
  emoji: string;
  /** 副标题（别名/分类等） */
  subtitle?: string;
  /** 标签徽章（如钾含量等级、药物分类） */
  badges?: ReactNode;
  /** 主介绍段落（静态，优先使用；为空时自动联网获取） */
  description?: string;
  /** 结构化字段（如使用方法、成分、副作用） */
  fields?: DetailField[];
  /** 底部自定义区域（如快速记录按钮） */
  footer?: ReactNode;
}

export default function DetailDrawer({
  open,
  onClose,
  image,
  name,
  emoji,
  subtitle,
  badges,
  description,
  fields = [],
  footer,
}: DetailDrawerProps) {
  // 注册到浮层栈：侧滑 / 返回键可关闭
  useOverlayBackHandler(open, onClose);
  // 锁定背景滚动，避免抖动
  useLockBodyScroll(open);

  // 联网获取配图与介绍（静态数据已有时跳过请求）
  const { image: resolvedImage, description: resolvedDesc, loading } = useEntityInfo(
    name,
    image,
    description
  );

  // 图片加载失败时回退到 emoji
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    // 切换条目时重置错误状态
    setImgError(false);
  }, [resolvedImage, name]);

  const showImage = resolvedImage && !imgError;

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
            className="glass-card relative max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl [will-change:transform] [transform:translateZ(0)]"
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

            <div className="relative z-10 max-h-[90dvh] overflow-y-auto">
              {/* 顶部图片区 */}
              {showImage ? (
                <div className="relative h-48 w-full overflow-hidden sm:h-56">
                  <img
                    src={resolvedImage}
                    alt={name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cream-50/90 via-transparent to-transparent" />
                  {/* emoji 浮层 */}
                  <div className="glass-tile absolute bottom-3 left-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-soft">
                    {emoji}
                  </div>
                </div>
              ) : loading ? (
                /* 联网获取配图中 */
                <div className="flex h-32 w-full items-center justify-center gap-2 bg-cream-100/50">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
                  <span className="text-xs text-teal-600/60">获取配图中...</span>
                </div>
              ) : (
                /* 无配图，显示大 emoji 占位 */
                <div className="glass-tile flex h-32 w-full items-center justify-center bg-cream-100/50 text-5xl">
                  {emoji}
                </div>
              )}

              {/* 内容区 */}
              <div className="space-y-4 p-5">
                {/* 标题 */}
                <div>
                  <div className="flex items-center gap-2">
                    {!showImage && !loading && (
                      <span className="text-2xl">{emoji}</span>
                    )}
                    <h2 className="font-serif text-xl font-semibold text-teal-700">
                      {name}
                    </h2>
                  </div>
                  {subtitle && (
                    <p className="mt-1 text-xs text-teal-600/60">{subtitle}</p>
                  )}
                  {badges && (
                    <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>
                  )}
                </div>

                {/* 介绍 */}
                {resolvedDesc ? (
                  <div className="glass-tile rounded-2xl p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-teal-600">
                      <Info className="h-3.5 w-3.5" />
                      介绍
                    </div>
                    <p className="text-sm leading-relaxed text-teal-700/80">
                      {resolvedDesc}
                    </p>
                  </div>
                ) : loading ? (
                  <div className="glass-tile flex items-center gap-2 rounded-2xl p-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-500" />
                    <span className="text-xs text-teal-600/60">获取介绍中...</span>
                  </div>
                ) : null}

                {/* 结构化字段 */}
                {fields.length > 0 && (
                  <div className="space-y-2">
                    {fields.map((field, i) => (
                      <div
                        key={i}
                        className="glass-tile rounded-2xl p-3"
                      >
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-teal-600">
                          {field.icon ?? <BookOpen className="h-3.5 w-3.5" />}
                          {field.label}
                        </div>
                        <div className="text-sm leading-relaxed text-teal-700/80">
                          {field.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 底部自定义区域 */}
                {footer && <div className="pt-2">{footer}</div>}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** 预设字段图标导出，便于调用方使用 */
export const FieldIcons = {
  usage: <BookOpen className="h-3.5 w-3.5" />,
  ingredients: <Beaker className="h-3.5 w-3.5" />,
  sideEffects: <AlertCircle className="h-3.5 w-3.5" />,
  nutrients: <Sparkles className="h-3.5 w-3.5" />,
};
