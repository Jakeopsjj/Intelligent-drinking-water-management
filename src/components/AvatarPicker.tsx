import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOverlayBackHandler } from '@/hooks/useOverlayBackHandler';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

// 内置 emoji 头像（与人无关，使用中性、物体类图标作为默认头像）
const EMOJI_CHOICES = [
  '🧑', '👶', '👵', '👴',
  '🐱', '🐶', '🐰', '🐼',
  '🐨', '🦊', '🐻', '🐯',
  '🌸', '🍀', '🌻', '🌟',
  '🍎', '🍊', '🍇', '🍓',
  '💧', '🌈', '☕', '📚',
];

interface AvatarPickerProps {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}

// 判断字符串是否为 base64 图片
export function isImageAvatar(v: string | undefined | null): boolean {
  return !!v && v.startsWith('data:image');
}

// 头像渲染：图片则 <img>，emoji 则文字展示
export function AvatarView({
  value,
  className,
}: {
  value: string | undefined | null;
  className?: string;
}) {
  if (isImageAvatar(value)) {
    return (
      <img
        src={value as string}
        alt="头像"
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }
  return (
    <span className={cn('flex h-full w-full items-center justify-center text-2xl', className)}>
      {value || '🧑'}
    </span>
  );
}

// 将上传的图片文件缩放至指定尺寸并转为 base64 JPEG
function fileToCompressedDataURL(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (typeof src !== 'string') {
        reject(new Error('读取文件失败'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 不可用'));
          return;
        }
        // 居中裁剪为正方形
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        // 使用 jpeg 降低体积
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = src;
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

export default function AvatarPicker({ value, onChange, onClose }: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // 头像选择器始终是打开状态（挂载即打开），注册关闭函数
  useOverlayBackHandler(true, onClose);
  // 锁定背景滚动，避免浮层唤出时页面跳动
  useLockBodyScroll(true);

  const handlePickFile = () => {
    if (processing) return;
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const dataUrl = await fileToCompressedDataURL(file, 256);
      onChange(dataUrl);
    } catch (err: any) {
      setError(err?.message || '图片处理失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    onChange(emoji);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-teal-700/40 backdrop-blur-sm sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-cream-50 sm:rounded-3xl [will-change:transform] [transform:translateZ(0)]"
        >
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between border-b border-cream-200 p-4">
            <h3 className="font-medium text-teal-700">选择头像</h3>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-teal-600 hover:bg-cream-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(90dvh - 64px)' }}>
            {/* 当前预览 */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-cream-300 bg-cream-100">
                <AvatarView value={value} />
              </div>
              <p className="mt-2 text-xs text-teal-600/60">
                {isImageAvatar(value) ? '当前使用自定义图片' : '当前头像'}
              </p>
            </div>

            {/* 上传图片 */}
            <div className="mt-4 rounded-2xl bg-teal-50 p-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-teal-500" />
                <div className="text-sm font-medium text-teal-700">上传自定义图片</div>
              </div>
              <div className="mt-0.5 text-xs text-teal-600/70">
                支持从相册选择，将自动裁剪为正方形并压缩
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={handlePickFile}
                disabled={processing}
                className={cn(
                  'mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                  processing
                    ? 'border border-teal-300 bg-teal-100 text-teal-600'
                    : 'border border-teal-300 bg-white text-teal-600 hover:bg-teal-100'
                )}
              >
                {processing ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                    处理中
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3.5 w-3.5" /> 选择图片
                  </>
                )}
              </button>
              {error && (
                <p className="mt-2 text-[10px] text-red-500">{error}</p>
              )}
            </div>

            {/* emoji 选择 */}
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium text-teal-600">或从内置图标选择</div>
              <div className="grid grid-cols-6 gap-2">
                {EMOJI_CHOICES.map((emoji) => {
                  const selected = value === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-xl border text-2xl transition',
                        selected
                          ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-200'
                          : 'border-cream-300 bg-white hover:bg-cream-100'
                      )}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 完成按钮 */}
            <button
              onClick={onClose}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-sm font-medium text-white shadow-soft transition hover:bg-teal-600"
            >
              <Check className="h-4 w-4" /> 完成
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
