import type { AnyRecord, UserSettings, Fruit } from '@/types';
import { toDateKey } from './date';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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

// UTF-8 字符串转 base64（正确处理中文与 BOM）
function toBase64(str: string): string {
  // encodeURIComponent -> percent-decoded bytes -> btoa
  return btoa(unescape(encodeURIComponent(str)));
}

// 生成带时间戳的文件名
function genTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// 跨平台保存文件：原生用 Filesystem + Share；Web 用 Blob 下载
async function saveFile(filename: string, content: string, mimeType: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // 写到应用专属 Documents 目录（不需要存储权限）
    const result = await Filesystem.writeFile({
      path: filename,
      data: toBase64(content),
      directory: Directory.Documents,
      recursive: true,
    });
    // 通过系统分享菜单让用户保存到 Download / 微信 / 网盘 等任意位置
    await Share.share({
      title: filename,
      url: result.uri,
      dialogTitle: '保存到',
    });
    return;
  }
  // Web：触发浏览器下载
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// 导出为 JSON 完整备份
export async function exportAsJSON(
  records: AnyRecord[],
  settings: UserSettings,
  fruits: Fruit[]
): Promise<void> {
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
  await saveFile(`肾友笔记_备份_${genTimestamp()}.json`, content, 'application/json');
}

// 记录行转 CSV 单元格文本
function csvCell(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// 导出为 CSV 表格（按记录逐行展开）
export async function exportAsCSV(records: AnyRecord[]): Promise<void> {
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
  await saveFile(`肾友笔记_记录_${genTimestamp()}.csv`, content, 'text/csv');
}
