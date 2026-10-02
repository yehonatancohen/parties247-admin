import { FunnelResponse, PartySalesRecord, VisitorRecord } from '../data/types';

// --- Helpers ---
export const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);

export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

// "2026-08" -> "אוגוסט 2026"
export const formatMonthLabel = (yyyyMm: string): string => {
  const [year, month] = yyyyMm.split('-');
  const idx = parseInt(month, 10) - 1;
  return idx >= 0 && idx < 12 ? `${HEBREW_MONTHS[idx]} ${year}` : yyyyMm;
};

export const jerusalemYyyyMm = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  return `${year}-${month}`;
};

export const jerusalemTodayIso = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
};

export const eventMonth = (isoDate: string | null | undefined): string | null => {
  if (!isoDate) return null;
  // Party dates are ISO; first 7 chars are YYYY-MM in the event's stored date.
  const m = isoDate.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(m) ? m : null;
};

// Funnel API windows site views/redirects/ticket deltas with `days` (max 180).
// Cover from the start of the selected calendar month through today so a month
// view is not clipped by the old rolling-30 default.
export const daysCoveringMonth = (yyyyMm: string): number => {
  if (yyyyMm === 'all') return 180;
  const today = jerusalemTodayIso();
  const [ty, tm, td] = today.split('-').map(Number);
  const [sy, sm] = yyyyMm.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, 1);
  const end = Date.UTC(ty, tm - 1, td);
  const diff = Math.round((end - start) / 86_400_000) + 1;
  return Math.min(180, Math.max(1, diff));
};

export const calculateCTR = (views: number, clicks: number) => {
  if (views === 0) return 0;
  return (clicks / views) * 100;
};

export const readAnalyticsCache = <T,>(key: string): T | null => {
  try {
    const value = localStorage.getItem(`parties247:analytics:${key}`);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
};

export const writeAnalyticsCache = (key: string, value: unknown) => {
  try {
    localStorage.setItem(`parties247:analytics:${key}`, JSON.stringify(value));
  } catch {
    // Keep analytics usable when storage is unavailable or full.
  }
};

// --- CSV export ---
export const csvEscape = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const lines = [headers, ...rows].map(row => row.map(csvEscape).join(','));
  const csvContent = '﻿' + lines.join('\r\n'); // BOM for Excel/Hebrew support
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// A single row per party combining site analytics (windowed by the funnel's
// day selector) with real GoOut data (lifetime/cumulative — GoOut only
// exposes a current snapshot, not a windowed delta).
export type MergedPartyRow = {
  partyId: string;
  // Every account tracking this event's sales -- more than one entry means the
  // same event is visible to both accounts (site referral should be account1,
  // but revenue can still include account2's real sales -- don't collapse this
  // to a single value, that's the bug that hid a wrong-account revenue mismatch).
  accountIds: string[];
  name: string | null;
  slug: string | null;
  date: string | null;
  isActive: boolean;
  views: number;
  redirects: number;
  viewToRedirectRate: number | null;
  realGoOutViews: number | null;
  purchases: number;
  redirectToPurchaseRate: number | null;
  revenue: number;
  lifetimeCommission: number | null;
  realGoOutRevenue: number | null;
  totalTicketsSold: number | null;
};

export type PartySortKey =
  | 'name' | 'date' | 'views' | 'redirects' | 'realGoOutViews'
  | 'purchases' | 'revenue' | 'realGoOutRevenue' | 'totalTicketsSold';

export const indexSalesByParty = (rows: PartySalesRecord[]): Record<string, PartySalesRecord> => {
  const byPartyId: Record<string, PartySalesRecord> = {};
  const seenEvent = new Set<string>();
  for (const row of rows) {
    if (!row.partyId) continue;
    if (row.goOutEventId) {
      if (seenEvent.has(row.goOutEventId)) {
        const existing = Object.values(byPartyId).find(r => r.goOutEventId === row.goOutEventId);
        if (existing && row.totalTicketsSold > existing.totalTicketsSold) {
          delete byPartyId[existing.partyId as string];
          byPartyId[row.partyId] = row;
        }
        continue;
      }
      seenEvent.add(row.goOutEventId);
    }
    const existing = byPartyId[row.partyId];
    if (!existing || row.totalTicketsSold > existing.totalTicketsSold) {
      byPartyId[row.partyId] = row;
    }
  }
  return byPartyId;
};

export const sortMergedPartyRows = (rows: MergedPartyRow[], key: PartySortKey, dir: 'asc' | 'desc'): MergedPartyRow[] => {
  const factor = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === 'name') {
      return factor * (a.name || '').localeCompare(b.name || '', 'he');
    }
    if (key === 'date') {
      const av = a.date ? new Date(a.date).getTime() : -Infinity;
      const bv = b.date ? new Date(b.date).getTime() : -Infinity;
      return factor * (av - bv);
    }
    const av = a[key];
    const bv = b[key];
    const an = av === null || av === undefined ? -Infinity : av;
    const bn = bv === null || bv === undefined ? -Infinity : bv;
    return factor * ((an as number) - (bn as number));
  });
};

export const exportPartiesToCsv = (parties: MergedPartyRow[]) => {
  const rows = parties.map(p => [
    p.name || '',
    p.slug || '',
    p.accountIds.join('+') || '',
    p.date ? new Date(p.date).toLocaleDateString('he-IL') : '',
    p.isActive ? 'פעיל' : 'לא פעיל',
    p.views,
    p.redirects,
    calculateCTR(p.views, p.redirects).toFixed(1) + '%',
    p.realGoOutViews ?? '',
    p.purchases,
    p.revenue.toFixed(2),
    p.realGoOutRevenue ?? '',
    p.totalTicketsSold ?? '',
  ]);
  downloadCsv(
    `parties-performance-${new Date().toISOString().slice(0, 10)}.csv`,
    ['שם', 'Slug', 'חשבון', 'תאריך', 'סטטוס', 'צפיות באתר', 'קליקים ל-GoOut', 'CTR', 'צפיות ב-GoOut', 'רכישות ב-GoOut', 'הכנסות', 'מחזור אמיתי ב-GoOut', 'כרטיסים סה"כ'],
    rows,
  );
};

export const exportVisitorsToCsv = (visitors: VisitorRecord[]) => {
  const rows = visitors.map(v => [
    v.timestamp ? new Date(v.timestamp).toLocaleString('he-IL') : '',
    v.deviceType,
    v.browser,
    v.os,
    v.trafficSource,
    v.referer || '',
    v.language,
  ]);
  downloadCsv(
    `visitors-${new Date().toISOString().slice(0, 10)}.csv`,
    ['זמן', 'מכשיר', 'דפדפן', 'מערכת', 'מקור', 'הפניה', 'שפה'],
    rows,
  );
};

// --- Peaks (hour grid) ---
// The backend's hourly series is sparse (only hours with events) and keyed in
// UTC ("2026-09-30T18:00:00Z"). Peaks are read in Israel time, so build a
// dense 168-hour grid ending at the current hour and look each hour up by its
// UTC key.
export type HourCell = {
  key: string;          // UTC key as the backend sends it
  ts: number;           // epoch ms of the hour start
  dayKey: string;       // YYYY-MM-DD in Asia/Jerusalem
  hour: number;         // 0-23 in Asia/Jerusalem
  visits: number;
  views: number;
  clicks: number;
};

export type PeakMetric = 'views' | 'clicks' | 'visits';

const IL_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', hourCycle: 'h23',
});

const utcHourKey = (ms: number) => new Date(ms).toISOString().slice(0, 13) + ':00:00Z';

export const buildHourGrid = (
  points: { timestamp: string; visits: number; partyViews: number; purchases: number }[],
  hours = 168,
  nowMs = Date.now(),
): HourCell[] => {
  const byKey = new Map(points.map(p => [p.timestamp, p]));
  const endHour = Math.floor(nowMs / 3_600_000) * 3_600_000;
  const cells: HourCell[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const ts = endHour - i * 3_600_000;
    const key = utcHourKey(ts);
    const p = byKey.get(key);
    const parts = IL_PARTS.formatToParts(new Date(ts));
    const get = (t: string) => parts.find(x => x.type === t)?.value ?? '';
    cells.push({
      key,
      ts,
      dayKey: `${get('year')}-${get('month')}-${get('day')}`,
      hour: parseInt(get('hour'), 10) % 24,
      visits: p?.visits ?? 0,
      views: p?.partyViews ?? 0,
      clicks: p?.purchases ?? 0,
    });
  }
  return cells;
};

export const HEBREW_WEEKDAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// "2026-09-30" -> weekday index 0..6 (Sunday=0), computed without a timezone.
export const weekdayOfDayKey = (dayKey: string): number => {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

export const SOURCE_LABELS: Record<string, string> = {
  direct: 'ישיר',
  organic_search: 'חיפוש אורגני',
  social: 'רשתות חברתיות',
  referral: 'הפניה',
  mobile: 'מובייל',
  desktop: 'מחשב',
  tablet: 'טאבלט',
  bot: 'בוט',
  unknown: 'לא ידוע',
};

export const relativeTimeHe = (iso: string, nowMs = Date.now()): string => {
  const diff = Math.max(0, nowMs - new Date(iso).getTime());
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'ממש עכשיו';
  if (min < 60) return `לפני ${min} דק׳`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `לפני ${hr} שע׳`;
  const d = Math.round(hr / 24);
  return `לפני ${d} ימים`;
};


// --- Month view: one merged row per party, plus the totals the hero shows ---
// Moved verbatim from the parties tab so the overview and the table can never
// disagree. Click metrics and new sale deltas are windowed by the funnel range;
// lifetime tickets/commission and GoOut gross are cumulative for events whose
// own date falls in `month` (Asia/Jerusalem).
export const mergePartyRows = (
  funnel: FunnelResponse | null,
  salesByPartyId: Record<string, PartySalesRecord>,
  month: string,
): MergedPartyRow[] => {
  if (!funnel) return [];
  const now = Date.now();
  return funnel.byParty
    .filter(row => {
      if (month !== 'all' && eventMonth(row.date) !== month) return false;
      return row.views > 0 || row.redirects > 0 || row.purchases > 0
        || row.realGoOutViews != null || row.realGoOutRevenue != null;
    })
    .map(row => {
      const sales = salesByPartyId[row.partyId];
      const accountIds = row.accountIds.length > 0 ? row.accountIds : (sales?.accountId ? [sales.accountId] : []);
      return {
        partyId: row.partyId,
        accountIds,
        name: row.name,
        slug: row.slug,
        date: row.date,
        isActive: row.date ? new Date(row.date).getTime() >= now : false,
        views: row.views,
        redirects: row.redirects,
        viewToRedirectRate: row.viewToRedirectRate,
        realGoOutViews: row.realGoOutViews,
        purchases: row.purchases,
        redirectToPurchaseRate: row.redirectToPurchaseRate,
        revenue: row.revenue,
        lifetimeCommission: sales?.totalRevenue ?? null,
        realGoOutRevenue: row.realGoOutRevenue,
        totalTicketsSold: sales?.totalTicketsSold ?? null,
      };
    });
};

export const monthTotals = (rows: MergedPartyRow[]) => ({
  tickets: rows.reduce((s, r) => s + (r.totalTicketsSold ?? r.purchases), 0),
  commission: rows.reduce((s, r) => s + (r.lifetimeCommission ?? r.revenue), 0),
  gross: rows.reduce((s, r) => s + (r.realGoOutRevenue ?? 0), 0),
  clicks: rows.reduce((s, r) => s + r.redirects, 0),
  views: rows.reduce((s, r) => s + r.views, 0),
});

// --- Day grid for the activity chart ---
// The backend buckets "day" series by UTC date ("2026-10-02").
export type DayCell = { key: string; views: number; clicks: number };

export const utcDayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const buildDayGrid = (
  points: { timestamp: string; partyViews: number; purchases: number }[],
  startKey: string | null,
  endMs = Date.now(),
): DayCell[] => {
  const byKey = new Map(points.map(p => [p.timestamp.slice(0, 10), p]));
  let start = startKey;
  if (!start) {
    // "since the beginning": start at the first day that has any activity.
    const firstActive = [...byKey.keys()].filter(k => {
      const p = byKey.get(k)!;
      return p.partyViews > 0 || p.purchases > 0;
    }).sort()[0];
    start = firstActive ?? utcDayKey(endMs);
  }
  const out: DayCell[] = [];
  const endKey = utcDayKey(endMs);
  for (let t = Date.parse(`${start}T00:00:00Z`); utcDayKey(t) <= endKey; t += 86_400_000) {
    const k = utcDayKey(t);
    const p = byKey.get(k);
    out.push({ key: k, views: p?.partyViews ?? 0, clicks: p?.purchases ?? 0 });
  }
  return out;
};

export const HEBREW_MONTHS_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
export const monthName = (yyyyMm: string) => HEBREW_MONTHS[parseInt(yyyyMm.split('-')[1], 10) - 1] ?? yyyyMm;
