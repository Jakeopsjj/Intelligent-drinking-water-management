import { useState, useRef, useEffect } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartImageProps {
  src: string;
  alt?: string;
  className?: string;       // 外层容器样式（如尺寸、圆角）
  imgClassName?: string;   // img 本身样式
  lazy?: boolean;           // 默认 true，用 loading="lazy"
}

// 图片三态：加载中 / 已加载 / 加载失败
type ImageStatus = 'loading' | 'loaded' | 'error';

/**
 * 智能图片组件
 *
 * 解决图片懒加载、加载占位、失败兜底、排版自适应：
 * - loading：灰底 + 居中 Loader2 旋转图标
 * - loaded：img 淡入显示（opacity 0→1）
 * - error：灰底 + 居中 ImageOff 图标 + 下方小字「图片加载失败」
 */
export default function SmartImage({
  src,
  alt = '',
  className,
  imgClassName,
  lazy = true,
}: SmartImageProps) {
  const [status, setStatus] = useState<ImageStatus>('loading');
  const imgRef = useRef<HTMLImageElement>(null);

  // src 变化时重置为 loading 态，便于复用同一组件切换图片
  useEffect(() => {
    setStatus('loading');
  }, [src]);

  // 兜底处理浏览器缓存：onLoad 可能在事件处理器挂载前已触发，
  // 此时通过 img.complete 判断真实状态，避免永久卡在 loading
  useEffect(() => {
    if (status !== 'loading') return;
    const el = imgRef.current;
    if (el?.complete) {
      setStatus(el.naturalWidth > 0 ? 'loaded' : 'error');
    }
  }, [status, src]);

  return (
    <div
      className={cn(
        'relative overflow-hidden break-words bg-gray-100',
        className
      )}
    >
      {/* 加载中：灰底 + 居中旋转图标 */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600/30" />
        </div>
      )}

      {/* 加载失败：灰底 + 居中图标 + 下方小字 */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <ImageOff className="h-5 w-5 text-teal-600/20" />
          <span className="break-words text-[10px] text-gray-400">
            图片加载失败
          </span>
        </div>
      )}

      {/* 实际 img：始终渲染以触发 onLoad/onError，通过 opacity 控制淡入 */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          status === 'loaded' ? 'opacity-100' : 'opacity-0',
          imgClassName
        )}
      />
    </div>
  );
}
