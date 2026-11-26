export class TimeService {
  now(): number {
    return Date.now();
  }

  todayKey(): string {
    const date = new Date();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  // ISO 周（周一开始），用作「本周排行榜」的 key，避免不同周的成绩混在一起。
  weekKey(now: Date = new Date()): string {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
