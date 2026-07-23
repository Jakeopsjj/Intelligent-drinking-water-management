import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, Filter, Trash2, Copy, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useDebugStore, type LogLevel } from '@/store/useDebugStore';
import { cn } from '@/lib/utils';

const LOG_LEVEL_COLORS: Record<LogLevel, { bg: string; text: string; border: string }> = {
  info: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  warn: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  error: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  api: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  network: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
};

const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  info: '信息',
  warn: '警告',
  error: '错误',
  api: 'API',
  network: '网络',
};

export default function DebugConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const logs = useDebugStore((s) => s.getFilteredLogs());
  const filter = useDebugStore((s) => s.filter);
  const setFilter = useDebugStore((s) => s.setFilter);
  const clearLogs = useDebugStore((s) => s.clearLogs);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const handleCopy = async (logId: string, log: typeof logs[0]) => {
    const text = `[${LOG_LEVEL_LABELS[log.level]}] ${formatTime(log.timestamp)} - ${log.message}\n${log.source ? `来源: ${log.source}\n` : ''}${log.details ? `详情: ${JSON.stringify(log.details, null, 2)}` : ''}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(logId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg shadow-teal-500/30 transition hover:bg-teal-600 hover:shadow-xl md:bottom-8"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Terminal className="h-5 w-5" />
        {logs.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {logs.length > 99 ? '99+' : logs.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))', maxHeight: '85vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-cream-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-teal-600" />
                  <span className="font-semibold text-teal-700">调试控制台</span>
                  <span className="text-xs text-teal-600/50">({logs.length} 条)</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-100 text-teal-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center justify-between border-b border-cream-200 px-6 py-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-teal-600/60" />
                  {(['all', 'info', 'warn', 'error', 'api', 'network'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setFilter(level)}
                      className={cn(
                        'rounded-lg px-3 py-1 text-xs font-medium transition',
                        filter === level
                          ? 'bg-teal-500 text-white'
                          : 'bg-cream-100 text-teal-600 hover:bg-cream-200'
                      )}
                    >
                      {level === 'all' ? '全部' : LOG_LEVEL_LABELS[level]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={clearLogs}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  清空
                </button>
              </div>

              <div className="max-h-[calc(85vh-140px)] overflow-y-auto p-4 space-y-2">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Terminal className="h-12 w-12 text-cream-300" />
                    <p className="mt-3 text-sm text-teal-600/50">暂无日志</p>
                    <p className="mt-1 text-xs text-teal-600/30">操作应用后，日志会在这里显示</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'rounded-xl border p-3 transition',
                        LOG_LEVEL_COLORS[log.level].bg,
                        LOG_LEVEL_COLORS[log.level].border
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold',
                              LOG_LEVEL_COLORS[log.level].text,
                              LOG_LEVEL_COLORS[log.level].bg
                            )}
                          >
                            {LOG_LEVEL_LABELS[log.level]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-teal-600/40">{formatTime(log.timestamp)}</span>
                            {log.source && (
                              <span className="text-xs text-teal-600/50">[{log.source}]</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium leading-relaxed break-words">
                            {log.message}
                          </p>
                          {(log.details || expandedId === log.id) && (
                            <button
                              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                              className="mt-2 flex items-center gap-1 text-xs text-teal-600/60"
                            >
                              {expandedId === log.id ? (
                                <>
                                  <ChevronUp className="h-3 w-3" /> 收起详情
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" /> 展开详情
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleCopy(log.id, log)}
                          className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-white/60 text-teal-600/60 transition hover:bg-white hover:text-teal-600"
                        >
                          {copiedId === log.id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {expandedId === log.id && log.details && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-2 rounded-lg bg-white/80 p-3 overflow-hidden"
                        >
                          <pre className="text-xs font-mono leading-relaxed text-teal-600/80 max-h-40 overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </motion.div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
