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

// UTF-8 字符串转 base64
function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

// 生成带时间戳的文件名
function genTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// 跨平台保存文本文件
async function saveTextFile(filename: string, content: string, mimeType: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({
      path: filename,
      data: toBase64(content),
      directory: Directory.Documents,
      recursive: true,
    });
    await Share.share({
      title: filename,
      url: result.uri,
      dialogTitle: '保存到',
    });
    return;
  }
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

// 跨平台保存 base64 图片
async function saveImageFile(filename: string, base64Png: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Png,
      directory: Directory.Documents,
      recursive: true,
    });
    await Share.share({
      title: filename,
      url: result.uri,
      dialogTitle: '保存到',
    });
    return;
  }
  const a = document.createElement('a');
  a.href = `data:image/png;base64,${base64Png}`;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
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
  await saveTextFile(`肾友笔记_备份_${genTimestamp()}.json`, content, 'application/json');
}

// CSV 单元格
function csvCell(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// 导出为 CSV 表格
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

  const content = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\n');
  await saveTextFile(`肾友笔记_记录_${genTimestamp()}.csv`, content, 'text/csv');
}

// ===== 图片导出（SVG 渲染 → canvas → PNG） =====

interface ExportContext {
  records: AnyRecord[];
  settings: UserSettings;
}

// 计算汇总指标
function summarize(records: AnyRecord[]) {
  let water = 0, ultrafiltration = 0, fruit = 0, potassium = 0, phosphorus = 0, sodium = 0;
  let waterCount = 0, ultraCount = 0, fruitCount = 0;
  for (const r of records) {
    if (r.type === 'water') { water += r.amount; waterCount++; }
    else if (r.type === 'ultrafiltration') { ultrafiltration += r.amount; ultraCount++; }
    else if (r.type === 'fruit') {
      fruit += r.weight;
      potassium += r.potassium;
      phosphorus += r.phosphorus;
      sodium += r.sodium;
      fruitCount++;
    }
  }
  return { water, ultrafiltration, fruit, potassium, phosphorus, sodium, waterCount, ultraCount, fruitCount };
}

// 转义 SVG 文本
function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 构造 SVG 报告卡
function buildReportSVG(ctx: ExportContext): string {
  const { records, settings } = ctx;
  const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
  const recent = sorted.slice(0, 12);
  const s = summarize(records);

  const userName = settings.userName || '肾友';
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`;

  const firstTs = sorted.length ? sorted[sorted.length - 1].timestamp : now.getTime();
  const lastTs = sorted.length ? sorted[0].timestamp : now.getTime();
  const rangeStr = sorted.length
    ? `${toDateKey(firstTs)} ~ ${toDateKey(lastTs)}`
    : '暂无记录';

  const W = 1080;
  const headerH = 220;
  const summaryH = 200;
  const rowH = 56;
  const tableTop = headerH + summaryH + 80;
  const tableH = (recent.length + 1) * rowH;
  const footerH = 100;
  const H = tableTop + tableH + footerH;

  // 汇总卡片数据
  const cards = [
    { label: '总饮水量', value: s.water, unit: 'ml', color: '#0d9488' },
    { label: '总超滤量', value: s.ultrafiltration, unit: 'ml', color: '#0ea5e9' },
    { label: '总水果量', value: s.fruit, unit: 'g', color: '#84cc16' },
    { label: '总钾摄入', value: s.potassium, unit: 'mg', color: '#f59e0b' },
    { label: '总磷摄入', value: s.phosphorus, unit: 'mg', color: '#ef4444' },
    { label: '总钠摄入', value: s.sodium, unit: 'mg', color: '#8b5cf6' },
  ];

  const cardW = (W - 80 - 5 * 16) / 6;

  const cardEls = cards.map((c, i) => {
    const x = 40 + i * (cardW + 16);
    const y = headerH + 40;
    return `
      <g>
        <rect x="${x}" y="${y}" width="${cardW}" height="160" rx="20" fill="#ffffff" stroke="#e7f0ee" stroke-width="2"/>
        <rect x="${x}" y="${y}" width="${cardW}" height="6" rx="3" fill="${c.color}"/>
        <text x="${x + cardW / 2}" y="${y + 44}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="22" fill="#7a8a87" text-anchor="middle">${esc(c.label)}</text>
        <text x="${x + cardW / 2}" y="${y + 110}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="46" font-weight="700" fill="${c.color}" text-anchor="middle">${esc(c.value)}</text>
        <text x="${x + cardW / 2}" y="${y + 142}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="20" fill="#9aa8a5" text-anchor="middle">${esc(c.unit)}</text>
      </g>`;
  }).join('');

  // 表格行
  const cols = [
    { key: 'date', label: '日期', w: 200 },
    { key: 'time', label: '时间', w: 110 },
    { key: 'type', label: '类型', w: 120 },
    { key: 'name', label: '名称', w: 280 },
    { key: 'amount', label: '数量', w: 160 },
    { key: 'k', label: '钾(mg)', w: 100 },
    { key: 'p', label: '磷(mg)', w: 100 },
  ];
  const tableW = cols.reduce((a, b) => a + b.w, 0);
  const tableX = (W - tableW) / 2;

  const headerCells = cols.map((c, i) => {
    const x = cols.slice(0, i).reduce((a, b) => a + b.w, 0);
    return `<text x="${tableX + x + c.w / 2}" y="${tableTop + 36}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="22" font-weight="600" fill="#ffffff" text-anchor="middle">${esc(c.label)}</text>`;
  }).join('');

  const typeColor: Record<string, string> = {
    water: '#0d9488',
    ultrafiltration: '#0ea5e9',
    fruit: '#84cc16',
  };
  const typeLabel: Record<string, string> = {
    water: '饮水',
    ultrafiltration: '超滤',
    fruit: '水果',
  };

  const rowsEl = recent.map((r, idx) => {
    const d = new Date(r.timestamp);
    const y = tableTop + rowH + idx * rowH;
    const bg = idx % 2 === 0 ? '#f7faf9' : '#ffffff';

    let name = '';
    let amount = '';
    let k = '';
    let pV = '';
    if (r.type === 'water') { name = '饮水'; amount = `${r.amount} ml`; }
    else if (r.type === 'ultrafiltration') { name = '超滤量'; amount = `${r.amount} ml`; }
    else {
      name = `${r.fruitEmoji} ${r.fruitName}`;
      amount = `${r.weight} g`;
      k = String(r.potassium);
      pV = String(r.phosphorus);
    }

    const cells = [
      { text: toDateKey(r.timestamp), col: 0 },
      { text: `${p(d.getHours())}:${p(d.getMinutes())}`, col: 1 },
      { text: typeLabel[r.type], col: 2, color: typeColor[r.type] },
      { text: name, col: 3 },
      { text: amount, col: 4 },
      { text: k, col: 5 },
      { text: pV, col: 6 },
    ];

    const cellEls = cells.map((c) => {
      const x = cols.slice(0, c.col).reduce((a, b) => a + b.w, 0);
      const fill = c.color || '#374151';
      const fw = c.col === 2 ? '600' : '400';
      return `<text x="${tableX + x + cols[c.col].w / 2}" y="${y + 34}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="22" font-weight="${fw}" fill="${fill}" text-anchor="middle">${esc(c.text)}</text>`;
    }).join('');

    return `
      <rect x="${tableX}" y="${y}" width="${tableW}" height="${rowH}" fill="${bg}"/>
      ${cellEls}`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="headerBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0d9488"/>
        <stop offset="100%" stop-color="#0f766e"/>
      </linearGradient>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f0f9f6"/>
        <stop offset="100%" stop-color="#e6f1ed"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
    <rect width="${W}" height="${headerH}" fill="url(#headerBg)"/>
    <text x="60" y="78" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="44" font-weight="700" fill="#ffffff">肾友笔记 · 健康记录报告</text>
    <text x="60" y="128" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="26" fill="#ccfbf1">${esc(userName)}　·　共 ${records.length} 条记录</text>
    <text x="60" y="172" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="22" fill="#99f6e4">统计区间：${esc(rangeStr)}</text>
    <text x="${W - 60}" y="172" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="22" fill="#99f6e4" text-anchor="end">导出时间：${esc(dateStr)}</text>
    ${cardEls}
    <text x="${W / 2}" y="${tableTop - 24}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="26" font-weight="600" fill="#0f766e" text-anchor="middle">最近 ${recent.length} 条记录明细</text>
    <rect x="${tableX}" y="${tableTop}" width="${tableW}" height="${rowH}" rx="12" fill="#0f766e"/>
    ${headerCells}
    ${rowsEl}
    <text x="${W / 2}" y="${H - 40}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="18" fill="#9aa8a5" text-anchor="middle">肾友笔记 · 透析患者健康管理 · 数据本地存储</text>
  </svg>`;
}

// SVG 字符串 → PNG base64
function svgToPngBase64(svg: string, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('无法获取 canvas 上下文'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG 加载失败'));
    };
    img.src = url;
  });
}

// 导出为图片
export async function exportAsImage(ctx: ExportContext): Promise<void> {
  const svg = buildReportSVG(ctx);
  const base64 = await svgToPngBase64(svg, 2);
  await saveImageFile(`肾友笔记_报告_${genTimestamp()}.png`, base64);
}

// ===== JSON 导入 =====

export interface ImportResult {
  package: ExportPackage;
  records: AnyRecord[];
  settings: UserSettings | null;
  customFruits: Fruit[];
}

// 解析 JSON 文件
export function parseBackupJSON(text: string): ImportResult {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('JSON 格式错误，无法解析');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('文件内容不是有效的备份');
  }
  // 兼容两种格式：完整 ExportPackage 或裸 records 数组
  let records: AnyRecord[] = [];
  let settings: UserSettings | null = null;
  let fruits: Fruit[] = [];

  if (Array.isArray(data)) {
    records = data;
  } else {
    if (data.meta && data.meta.app !== 'kidney-notes') {
      throw new Error('该文件不是肾友笔记的备份');
    }
    records = Array.isArray(data.records) ? data.records : [];
    settings = data.settings || null;
    fruits = Array.isArray(data.fruits) ? data.fruits : [];
  }

  // 校验 records 结构
  const valid = records.filter((r: any) => r && typeof r.id === 'string' && typeof r.timestamp === 'number' && typeof r.type === 'string');
  if (valid.length === 0) {
    throw new Error('备份中没有有效记录');
  }

  const customFruits = fruits.filter((f: any) => f && (f.isCustom || (typeof f.id === 'string' && f.id.startsWith('custom-'))));

  return {
    package: {
      meta: { app: 'kidney-notes', version: '1.0.0', exportedAt: new Date().toISOString(), recordCount: valid.length },
      settings: settings || ({} as UserSettings),
      fruits,
      records: valid,
    },
    records: valid,
    settings,
    customFruits,
  };
}

// 读取用户选中的文件
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
