import type { AnyRecord, UserSettings, Fruit } from '@/types';
import { toDateKey } from './date';

// 导出数据包结构
export interface ExportPackage {
  meta: {
    app: 'kidney-notes';
    version: string;
    exportedAt: string; // ISO 时间
    recordCount: number;
  };
  settings: UserSettings;
  fruits: Fruit[];
  records: AnyRecord[];
}

// 触发文件下载（Web 和 Android WebView 都兼容）
function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // 延时清理，避免某些浏览器没触发下载
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// 生成带时间戳的文件名
function genTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// 导出为 JSON 完整备份
export function exportAsJSON(records: AnyRecord[], settings: UserSettings, fruits: Fruit[]): void {
  const pkg: ExportPackage = {
    meta: {
      app: 'kidney-notes',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
    },
    settings,
    fruits,
    records: [...records].sort((a, b) => a.timestamp - b.timestamp),
  };
  const content = JSON.stringify(pkg, null, 2);
  downloadFile(`肾友笔记_备份_${genTimestamp()}.json`, content, 'application/json');
}

// 记录行转 CSV 单元格文本
function csvCell(v: string | number): string {
  const s = String(v);
  // 转义双引号，并用双引号包裹含逗号/换行/引号的内容
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// 导出为 CSV 表格（按记录逐行展开）
export function exportAsCSV(records: AnyRecord[]): void {
  const header = ['记录日期', '记录时间', '类型', '名称', '数量', '单位', '钾(mg)', '磷(mg)', '钠(mg)'];
  const rows: (string | number)[][] = [header];

  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  for (const r of sorted) {
    const d = new Date(r.timestamp);
    const p = (n: number) => String(n).padStart(2, '0');
    const dateStr = toDateKey(r.timestamp);
    const timeStr = `${p(d.getHours())}:${p(d.getMinutes())}`;

    if (r.type === 'water') {
      rows.push([dateStr, timeStr, '饮水', '饮水', r.amount, 'ml', '', '', '']);
    } else if (r.type === 'ultrafiltration') {
      rows.push([dateStr, timeStr, '超滤', '超滤量', r.amount, 'ml', '', '', '']);
    } else {
      rows.push([
        dateStr,
        timeStr,
        '水果',
        `${r.fruitEmoji} ${r.fruitName}`,
        r.weight,
        'g',
        r.potassium,
        r.phosphorus,
        r.sodium,
      ]);
    }
  }

  // 加 BOM 让 Excel 正确识别 UTF-8
  const content = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\n');
  downloadFile(`肾友笔记_记录_${genTimestamp()}.csv`, content, 'text/csv');
}
