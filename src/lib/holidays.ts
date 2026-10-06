/**
 * Holiday page windows, copied from parties247-website `src/lib/holidays.ts`
 * (HOLIDAYS + getHolidayWindow). Keep the two in sync: the admin uses them to
 * show which parties a holiday page lists by default, the site to render it.
 */
import { HDate, HebrewCalendar } from '@hebcal/core';
import { Party } from '@/data/types';

const IL_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' });
const getIsraelDateString = (instant: Date) => IL_DATE.format(instant);

export interface HolidayDef {
  slug: string;
  hebrewName: string;
  source: 'hebcal' | 'fixed';
  /** Exact hebcal event description marking the first day of the holiday window. */
  hebcalStartDesc?: string;
  /** Exact hebcal event description marking the last day; defaults to `hebcalStartDesc`. */
  hebcalEndDesc?: string;
  /** 1-indexed Gregorian month/day, for `source: 'fixed'` holidays. */
  fixedMonthDay?: { month: number; day: number };
  /** Extra days to include before the holiday's first day (e.g. erev-evening parties). */
  leadDays: number;
  /** Extra days to include after the holiday's last day. */
  trailDays: number;
}

export const HOLIDAYS: Record<string, HolidayDef> = {
  sukkot: {
    slug: 'sukkot',
    hebrewName: 'סוכות',
    source: 'hebcal',
    hebcalStartDesc: 'Sukkot I',
    hebcalEndDesc: 'Shmini Atzeret',
    leadDays: 1,
    trailDays: 0,
  },
  halloween: {
    slug: 'halloween',
    hebrewName: 'האלווין',
    source: 'fixed',
    fixedMonthDay: { month: 10, day: 31 },
    leadDays: 3,
    trailDays: 0,
  },
  hanukkah: {
    slug: 'hanukkah',
    hebrewName: 'חנוכה',
    source: 'hebcal',
    hebcalStartDesc: 'Chanukah: 1 Candle',
    hebcalEndDesc: 'Chanukah: 8th Day',
    leadDays: 0,
    trailDays: 0,
  },
  sylvester: {
    slug: 'sylvester',
    hebrewName: 'סילבסטר',
    source: 'fixed',
    fixedMonthDay: { month: 12, day: 31 },
    leadDays: 1,
    trailDays: 1,
  },
  purim: {
    slug: 'purim',
    hebrewName: 'פורים',
    source: 'hebcal',
    hebcalStartDesc: 'Erev Purim',
    hebcalEndDesc: 'Purim',
    leadDays: 2,
    trailDays: 1,
  },
  'yom-haatzmaut': {
    slug: 'yom-haatzmaut',
    hebrewName: 'יום העצמאות',
    source: 'hebcal',
    hebcalStartDesc: "Yom HaAtzma'ut",
    hebcalEndDesc: "Yom HaAtzma'ut",
    leadDays: 1,
    trailDays: 0,
  },
};

export interface HolidayWindow {
  /** Inclusive window start, `YYYY-MM-DD`. */
  start: string;
  /** Inclusive window end, `YYYY-MM-DD`. */
  end: string;
  /** Civil year of the holiday's first day — the year to show in title/H1/meta. */
  year: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

function shiftYmd(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * `HDate.greg()` builds its `Date` from *local* year/month/day components, so
 * reading it back with `getFullYear`/`getMonth`/`getDate` (also local) round-trips
 * correctly regardless of the process's TZ — `toISOString()` would not (it re-reads
 * in UTC and can shift the day).
 */
function gregEventYmd(hdate: HDate): string {
  const g = hdate.greg();
  return ymd(g.getFullYear(), g.getMonth() + 1, g.getDate());
}

function findHebcalDateYmd(hebrewYear: number, desc: string): string | undefined {
  const events = HebrewCalendar.calendar({ year: hebrewYear, isHebrewYear: true, il: true });
  const ev = events.find((e) => e.getDesc() === desc);
  return ev ? gregEventYmd(ev.getDate()) : undefined;
}

/**
 * The next upcoming-or-current occurrence of a holiday's window, relative to `now`.
 * Never returns an already-fully-passed window — always the live or next one.
 */
export function getHolidayWindow(def: HolidayDef, now: Date = new Date()): HolidayWindow {
  const todayYmd = getIsraelDateString(now);

  if (def.source === 'fixed') {
    if (!def.fixedMonthDay) throw new Error(`${def.slug}: fixed holiday missing fixedMonthDay`);
    const [todayY] = todayYmd.split('-').map(Number);
    for (const year of [todayY, todayY + 1]) {
      const anchor = ymd(year, def.fixedMonthDay.month, def.fixedMonthDay.day);
      const start = shiftYmd(anchor, -def.leadDays);
      const end = shiftYmd(anchor, def.trailDays);
      if (end >= todayYmd) return { start, end, year };
    }
    // Unreachable in practice (the year+1 branch always qualifies), but keep a
    // deterministic fallback rather than throwing.
    const anchor = ymd(todayY + 1, def.fixedMonthDay.month, def.fixedMonthDay.day);
    return { start: shiftYmd(anchor, -def.leadDays), end: shiftYmd(anchor, def.trailDays), year: todayY + 1 };
  }

  if (!def.hebcalStartDesc) throw new Error(`${def.slug}: hebcal holiday missing hebcalStartDesc`);
  const endDesc = def.hebcalEndDesc ?? def.hebcalStartDesc;

  // Noon UTC keeps the calendar-day read-back stable across the TZs this runs
  // under (Vercel's UTC server, and local `Asia/Jerusalem`/`UTC` test runs).
  const [ty, tm, td] = todayYmd.split('-').map(Number);
  const noonUtcToday = new Date(Date.UTC(ty, tm - 1, td, 12));
  const currentHebrewYear = new HDate(noonUtcToday).getFullYear();

  for (const hy of [currentHebrewYear, currentHebrewYear + 1]) {
    const startAnchor = findHebcalDateYmd(hy, def.hebcalStartDesc);
    const endAnchor = findHebcalDateYmd(hy, endDesc);
    if (!startAnchor || !endAnchor) continue;
    const start = shiftYmd(startAnchor, -def.leadDays);
    const end = shiftYmd(endAnchor, def.trailDays);
    if (end >= todayYmd) {
      return { start, end, year: Number(startAnchor.split('-')[0]) };
    }
  }

  throw new Error(`${def.slug}: could not resolve a hebcal window for ${todayYmd}`);
}

/** Parties whose naive Israel date falls inside the window, by date (the site's default list). */
export function partiesInWindow(parties: Party[], window: HolidayWindow): Party[] {
  return parties
    .filter((p) => {
      const ymd = (p.date || '').slice(0, 10);
      return ymd >= window.start && ymd <= window.end;
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export interface HolidayCuration {
  partyIds: string[];
  hiddenIds: string[];
}

/**
 * Same rule as the site's `applyHolidayCuration`: pinned first in order, then
 * the in-window parties that aren't hidden. (The site orders that remainder by
 * night with sold-out last; here it stays by date.)
 */
export function previewHolidayList(windowParties: Party[], allParties: Party[], curation: HolidayCuration): Party[] {
  const byId = new Map(allParties.map((p) => [p.id, p]));
  const pinned = curation.partyIds.map((id) => byId.get(id)).filter((p): p is Party => !!p);
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const hidden = new Set(curation.hiddenIds);
  return [...pinned, ...windowParties.filter((p) => !pinnedIds.has(p.id) && !hidden.has(p.id))];
}
