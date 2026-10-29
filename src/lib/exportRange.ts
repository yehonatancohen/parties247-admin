// Date ranges for the Excel export. Days are Israel-local calendar days and
// `to` is inclusive, matching GET /api/admin/export. from = null = all time.

export type ExportPreset = '7d' | '30d' | 'month' | 'year' | 'all' | 'custom';

export interface ExportRange {
  from: string | null;
  to: string;
}

/** Today's date in Israel as YYYY-MM-DD. */
export function israelToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(now);
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** month: YYYY-MM (for 'month'); custom: the two picked days (for 'custom'). */
export function resolveRange(preset: ExportPreset, opts: { month?: string; customFrom?: string; customTo?: string; now?: Date } = {}): ExportRange {
  const today = israelToday(opts.now);
  switch (preset) {
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '30d':
      return { from: addDays(today, -29), to: today };
    case 'month': {
      const month = opts.month || today.slice(0, 7);
      const end = lastDayOfMonth(month);
      return { from: `${month}-01`, to: end < today ? end : today };
    }
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'all':
      return { from: null, to: today };
    case 'custom': {
      const a = opts.customFrom || today;
      const b = opts.customTo || today;
      return a <= b ? { from: a, to: b } : { from: b, to: a };
    }
  }
}

/** Months to offer, newest first, from the first tracked month to this one. */
export function monthOptions(firstMonth = '2026-04', now?: Date): string[] {
  const out: string[] = [];
  let [y, m] = israelToday(now).slice(0, 7).split('-').map(Number);
  const [fy, fm] = firstMonth.split('-').map(Number);
  while (y > fy || (y === fy && m >= fm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}

/** "2026-10-28T12:30:00" (Israel local, no offset) -> a Date whose UTC parts are
 *  those local parts, which is what Excel stores (it has no time zones). */
export function excelDate(local: string | null | undefined): Date | null {
  if (!local) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}
