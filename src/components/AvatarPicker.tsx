import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { FC } from 'react';
import { cn } from '@/lib/utils';

// 可选头像（emoji）
export const AVATAR_OPTIONS = [
  '🧑', '👨', '👩', '🧓', '👴', '👵',
  '👦', '👧', '👶', '🧒',
  '🧑‍⚕️', '👨‍⚕️', '👩‍⚕️',
  '😊', '🤗', '😌', '🙂', '😄',
  '🦊', '🐱', '🐶', '🐰', '🐼', '🐨',
  '🌸', '🍀', '🌿', '🍎', '🍊', '🥗',
];

interface AvatarPickerProps {
  open: boolean;
  current: string;
  onSelect: (avatar: string) => void;
  onClose: () => void;
}

const AvatarPicker: FC<AvatarPickerProps> = ({ open, current, onSelect, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex flex-col"
          style={{
            background: 'linear-gradient(170deg, #f0f7f4 0%, #e8f4ef 30%, #f5f0e8 60%, #fdf6ee 100%)',
          }}
        >
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between border-b border-white/60 px-4 pb-3 pt-10 backdrop-blur-xl">
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-teal-700 active:bg-black/5"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-serif text-lg font-semibold text-teal-800">选择头像</h3>
            <button
              onClick={onClose}
              className="flex h-9 items-center justify-center rounded-full bg-teal-600 px-4 text-sm font-medium text-white active:bg-teal-700"
            >
              完成
            </button>
          </div>

          {/* 头像网格 */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto grid max-w-2xl grid-cols-5 gap-3 sm:grid-cols-6">
              {AVATAR_OPTIONS.map((avatar) => {
                const selected = avatar === current;
                return (
                  <button
                    key={avatar}
                    onClick={() => onSelect(avatar)}
                    className={cn(
                      'relative flex aspect-square items-center justify-center rounded-2xl border text-3xl transition-all active:scale-95',
                      selected
                        ? 'border-teal-500 bg-teal-50 shadow-md'
                        : 'border-white/70 bg-white/70 backdrop-blur-sm hover:border-teal-300'
                    )}
                  >
                    <span className="leading-none">{avatar}</span>
                    {selected && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white shadow">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AvatarPicker;
