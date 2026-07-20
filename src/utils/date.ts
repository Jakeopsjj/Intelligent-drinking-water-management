// 将时间戳转为 YYYY-MM-DD
export function toDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 获取今日日期 key
export function getTodayKey(): string {
  return toDateKey(Date.now());
}

// 获取指定日期的开始/结束时间戳
export function getDayRange(dateKey: string): [number, number] {
  const [y, m, d] = dateKey.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return [start, end];
}

// 获取最近 N 天的日期 key 列表（包含今天，按时间正序）
export function getRecentDays(n: number): string[] {
  const result: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push(toDateKey(d.getTime()));
  }
  return result;
}

// 格式化日期为友好显示
export function formatDateFriendly(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = getTodayKey();
  const yesterday = toDateKey(Date.now() - 86400000);
  if (dateKey === today) return '今天';
  if (dateKey === yesterday) return '昨天';
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${m}月${d}日 ${weekday}`;
}

// 获取当前时间的问候语
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了，请注意休息';
  if (h < 9) return '早上好，新的一天';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好，记得适量饮水';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '夜深了，请减少饮水';
}

// 获取完整日期时间显示
export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// 获取完整日期显示
export function formatDateLong(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${y} 年 ${m} 月 ${day} 日 · ${weekday}`;
}
