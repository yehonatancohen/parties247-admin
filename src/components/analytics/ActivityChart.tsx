"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DetailedAnalyticsResponse, RecentActivityEvent } from '../../data/types';
import { getDetailedAnalytics } from '../../services/api';
import {
  DayCell, HEBREW_MONTHS_SHORT, HEBREW_WEEKDAYS_SHORT, buildDayGrid, buildHourGrid, formatHour, monthName,
  readAnalyticsCache, utcDayKey, weekdayOfDayKey, writeAnalyticsCache,
} from '../../lib/analytics';
import { INK_HEX, Panel, Segmented, Skeleton } from './ui';

type Range = '24h' | '7d' | '30d' | 'month' | 'all';

type Bucket = {
  key: string;
  title: string;      // readout title
  axis: string;       // x-axis label ('' = none)
  views: number;
  clicks: number;
  sales: RecentActivityEvent[] | null; // null = sales are not shown for this range
};

const LANE_VIEWS = 130;
const LANE_CLICKS = 56;
const LANE_SALES = 34;

const hourKeyOf = (iso: string) =>
  new Date(Math.floor(new Date(iso).getTime() / 3_600_000) * 3_600_000).toISOString().slice(0, 13) + ':00:00Z';

const dayTitle = (key: string, withYear: boolean) => {
  const [y, m, d] = key.split('-').map(Number);
  return `יום ${HEBREW_WEEKDAYS_SHORT[weekdayOfDayKey(key)]} · ${d}/${m}${withYear ? `/${y}` : ''}`;
};

// Tickets in one sale: the backend sends `tickets`; older responses only carry it in the Hebrew `details` text.
const ticketsOf = (e: RecentActivityEvent) => e.tickets ?? (e.details ? (/\d+/.exec(e.details) ? parseInt(/\d+/.exec(e.details)![0], 10) : 1) : 1);

const Y = ({ label }: { label: string | number }) => (
  <span className="absolute top-0 left-1 text-[11px] text-ink-dim bg-jungle-surface/80 px-1 leading-4 pointer-events-none">{label}</span>
);

const monthBounds = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  const start = Date.UTC(y, m - 1, 1);
  const next = Date.UTC(y, m, 1);
  return { start, end: Math.min(Date.now(), next - 1) };
};

const ActivityChart: React.FC<{
  month: string;                              // month chip chosen above ('YYYY-MM' or 'all')
  hourly: DetailedAnalyticsResponse | null;   // shared 7d hourly series
  hourlyAt: number | null;                    // when `hourly` was fetched; the grid ends there, not at "now"
  hourlyLoading: boolean;
  sales: RecentActivityEvent[];               // confirmed-sale events, last 7 days
}> = ({ month, hourly, hourlyAt, hourlyLoading, sales }) => {
  const [range, setRange] = useState<Range>('24h');
  const [sel, setSel] = useState<number | null>(null);
  const [series, setSeries] = useState<DetailedAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // 'month' makes no sense when the chip says "since the beginning".
  const effective: Range = range === 'month' && month === 'all' ? 'all' : range;

  // Daily ranges are fetched on demand; the 24h and 7d views are hourly and reuse the shared hourly series.
  const win = useMemo(() => {
    if (effective === '24h' || effective === '7d') return null;
    const today = Date.now();
    if (effective === '30d') return { startKey: utcDayKey(today - 29 * 86_400_000), start: Date.parse(`${utcDayKey(today - 29 * 86_400_000)}T00:00:00Z`), end: today };
    if (effective === 'month') { const b = monthBounds(month); return { startKey: utcDayKey(b.start), ...b }; }
    return { startKey: null as string | null, start: Date.parse('2025-01-01T00:00:00Z'), end: today };
  }, [effective, month]);

  const cacheKey = `chart2:${effective}:${effective === 'month' ? month : ''}`;
  useEffect(() => {
    if (!win) return;
    let alive = true;
    const cached = readAnalyticsCache<DetailedAnalyticsResponse>(cacheKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeries(cached);
    setLoading(!cached);
    setFailed(false);
    getDetailedAnalytics('7d', 'day', undefined, { start: new Date(win.start).toISOString(), end: new Date(win.end).toISOString() })
      .then(d => { if (alive) { setSeries(d); writeAnalyticsCache(cacheKey, d); } })
      .catch(() => { if (alive && !cached) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [win, cacheKey]);

  const buckets: Bucket[] = useMemo(() => {
    if (effective === '24h' || effective === '7d') {
      const week = effective === '7d';
      const cells = (hourly ? buildHourGrid(hourly.data, week ? 168 : 24, hourlyAt ?? undefined) : []);
      const byHour = new Map<string, RecentActivityEvent[]>();
      sales.forEach(e => { const k = hourKeyOf(e.timestamp); byHour.set(k, [...(byHour.get(k) ?? []), e]); });
      return cells.map(c => ({
        key: c.key,
        title: `${week ? `${dayTitle(c.dayKey, false)} · ` : ''}${formatHour(c.hour)}–${formatHour((c.hour + 1) % 24)}`,
        axis: week
          ? (c.hour === 0 ? `${HEBREW_WEEKDAYS_SHORT[weekdayOfDayKey(c.dayKey)]} ${parseInt(c.dayKey.slice(8), 10)}/${parseInt(c.dayKey.slice(5, 7), 10)}` : '')
          : (c.hour % 3 === 0 ? String(c.hour).padStart(2, '0') : ''),
        views: c.views,
        clicks: c.clicks,
        sales: byHour.get(c.key) ?? [],
      }));
    }
    if (!series || !win) return [];
    const days: DayCell[] = buildDayGrid(series.data, win.startKey, win.end);
    const salesByDay = new Map<string, RecentActivityEvent[]>();
    sales.forEach(e => { const k = e.timestamp.slice(0, 10); salesByDay.set(k, [...(salesByDay.get(k) ?? []), e]); });
    const withSales = false;
    const withYear = effective === 'all';
    // All-time axis: label month starts, but never more than ~5 so they stay readable.
    const monthStarts = days.map((d, i) => (d.key.endsWith('-01') ? i : -1)).filter(i => i >= 0);
    const step = Math.max(1, Math.ceil(monthStarts.length / 5));
    const labelled = new Set(monthStarts.filter((_, j) => j % step === 0));
    return days.map((d, i) => {
      const dom = parseInt(d.key.slice(8), 10);
      let axis = '';
      if (effective === 'all') axis = labelled.has(i) ? `${HEBREW_MONTHS_SHORT[parseInt(d.key.slice(5, 7), 10) - 1]} ${d.key.slice(2, 4)}` : '';
      else axis = i % 5 === 0 ? `${dom}/${parseInt(d.key.slice(5, 7), 10)}` : '';
      return { key: d.key, title: dayTitle(d.key, withYear), axis, views: d.views, clicks: d.clicks, sales: withSales ? salesByDay.get(d.key) ?? [] : null };
    });
  }, [effective, hourly, hourlyAt, series, win, sales]);

  const n = buckets.length;
  const hasSales = n > 0 && buckets[0].sales !== null;
  const maxViews = Math.max(1, ...buckets.map(b => b.views));
  const maxClicks = Math.max(1, ...buckets.map(b => b.clicks));
  const peak = buckets.reduce((best, b, i) => (b.views > 0 && (best < 0 || b.views > buckets[best].views) ? i : best), -1);
  const totalViews = buckets.reduce((s, b) => s + b.views, 0);
  const totalClicks = buckets.reduce((s, b) => s + b.clicks, 0);
  const totalSales = hasSales ? buckets.reduce((s, b) => s + (b.sales?.length ?? 0), 0) : 0;
  const totalCommission = hasSales ? buckets.reduce((s, b) => s + (b.sales ?? []).reduce((t, e) => t + (e.commission ?? 0), 0), 0) : 0;

  const active = n > 0 ? Math.min(sel ?? (peak >= 0 ? peak : n - 1), n - 1) : null;
  const cur = active != null ? buckets[active] : null;
  const height = LANE_VIEWS + LANE_CLICKS + (hasSales ? LANE_SALES : 0);

  const idxFromX = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || n === 0) return null;
    return Math.min(n - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * n)));
  };

  const path = (close: boolean) => {
    const pts = buckets.map((b, i) => `${i + 0.5},${100 - (b.views / maxViews) * 100}`);
    return `M ${pts.join(' L ')}${close ? ` L ${n - 0.5},100 L 0.5,100 Z` : ''}`;
  };

  const lane = 'relative border-b border-wood-brown';
  const monthLabel = month === 'all' ? 'הכל' : monthName(month);
  const options: { value: Range; label: string }[] = [
    { value: '24h', label: '24 שעות' },
    { value: '7d', label: '7 ימים' },
    { value: '30d', label: '30 ימים' },
    ...(month !== 'all' ? [{ value: 'month' as Range, label: monthLabel }] : []),
    { value: 'all', label: 'הכל' },
  ];

  const busy = effective === '24h' ? (!hourly && hourlyLoading) : (!series && loading);

  return (
    <Panel title="פעילות באתר" note="צפיות בדפי מסיבות וקליקים ל-GoOut. גע בגרף כדי לראות יום או שעה.">
      <Segmented options={options} value={effective} onChange={v => { setRange(v); setSel(null); }} tone="paper" label="טווח הגרף" size="sm" className="mb-4" />

      {busy ? (
        <Skeleton className="h-[300px] w-full" />
      ) : failed ? (
        <p className="text-ink-click py-8 text-center">לא הצלחנו לטעון את הטווח הזה. נסה טווח קצר יותר או רענן.</p>
      ) : n === 0 ? (
        <p className="text-ink-dim py-8 text-center">אין נתונים בטווח הזה</p>
      ) : (
        <>
          <dl className="flex gap-x-8 mb-4">
            <div>
              <dt className="text-[13px] text-ink-dim">צפיות</dt>
              <dd className="text-2xl font-bold text-white leading-tight">{totalViews.toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-dim">קליקים</dt>
              <dd className="text-2xl font-bold leading-tight" style={{ color: INK_HEX.click }}>{totalClicks.toLocaleString('en-US')}</dd>
            </div>
            {hasSales && (
              <div>
                <dt className="text-[13px] text-ink-dim">מכירות</dt>
                <dd className="text-2xl font-bold leading-tight" style={{ color: INK_HEX.sales }}>{totalSales}</dd>
              </div>
            )}
            {hasSales && totalCommission > 0 && (
              <div>
                <dt className="text-[13px] text-ink-dim">עמלה</dt>
                <dd className="text-2xl font-bold text-white leading-tight">₪{Math.round(totalCommission)}</dd>
              </div>
            )}
          </dl>

          <p className="min-h-[48px] text-[15px] text-jungle-text" aria-live="polite">
            {cur && (
              <>
                <bdi dir="ltr" className="font-bold text-white">{cur.title}</bdi>
                <span className="text-ink-dim">{sel == null && peak >= 0 ? ' · הכי עמוס' : ''}</span>
                <br />
                <span style={{ color: INK_HEX.view }}>{cur.views} צפיות</span>
                <span style={{ color: INK_HEX.click }}> · {cur.clicks} קליקים</span>
                {cur.sales && <span style={{ color: INK_HEX.sales }}> · {cur.sales.length} מכירות</span>}
              </>
            )}
          </p>
          {cur?.sales && cur.sales.length > 0 && (
            <ul className="mb-3 space-y-1 text-[14px]">
              {cur.sales.map(s => (
                <li key={s.id} className="text-jungle-text">
                  <span className="font-bold text-white">{s.partyName || 'מסיבה'}</span>
                  <span style={{ color: INK_HEX.sales }}> · {ticketsOf(s)} כרטיסים</span>
                  {s.commission != null && <span className="text-ink-dim"> · עמלה ₪{Math.round(s.commission * 100) / 100}</span>}
                </li>
              ))}
            </ul>
          )}

          <div
            ref={box}
            dir="ltr"
            tabIndex={0}
            role="img"
            aria-label="גרף פעילות באתר לפי הטווח שנבחר"
            className="relative touch-pan-y select-none focus:outline-none focus-visible:outline-2 focus-visible:outline-ink-sales"
            onPointerDown={e => setSel(idxFromX(e.clientX))}
            onPointerMove={e => { if (e.pointerType === 'mouse' || e.buttons) setSel(idxFromX(e.clientX)); }}
            onPointerLeave={e => { if (e.pointerType === 'mouse') setSel(null); }}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft') setSel(s => Math.max(0, (s ?? active ?? n - 1) - 1));
              if (e.key === 'ArrowRight') setSel(s => Math.min(n - 1, (s ?? active ?? 0) + 1));
              if (e.key === 'Escape') setSel(null);
            }}
          >
            <div className={lane} style={{ height: LANE_VIEWS }}>
              <Y label={maxViews} />
              <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" aria-hidden>
                <path d={path(true)} fill={INK_HEX.view} fillOpacity="0.2" />
                <path d={path(false)} fill="none" stroke={INK_HEX.view} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>

            <div className={`${lane} flex items-end ${n > 60 ? 'gap-0' : 'gap-[2px]'}`} style={{ height: LANE_CLICKS }}>
              <Y label={maxClicks} />
              {buckets.map(b => (
                <span key={b.key} className="flex-1 block" style={{ height: `${(b.clicks / maxClicks) * 100}%`, minHeight: b.clicks > 0 ? 2 : 0, background: INK_HEX.click }} />
              ))}
            </div>

            {hasSales && (
              <div className={`${lane} grid gap-[2px]`} style={{ height: LANE_SALES, gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {buckets.map(b => {
                  const c = b.sales?.length ?? 0;
                  return (
                    <span key={b.key} className="flex items-center justify-center text-[12px] font-bold text-jungle-deep" style={{ background: c > 0 ? INK_HEX.sales : 'transparent' }}>
                      {c > 0 ? c : ''}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex mt-1 text-[11px] text-ink-dim">
              {buckets.map(b => (
                <span key={b.key} className="flex-1 text-center whitespace-nowrap overflow-visible">{b.axis}</span>
              ))}
            </div>

            {active != null && (
              <span
                aria-hidden
                className="absolute top-0 pointer-events-none"
                style={{ left: `${(active / n) * 100}%`, width: `${100 / n}%`, minWidth: 2, height, background: 'rgba(224,227,245,0.14)', borderLeft: '1px solid #E0E3F5', borderRight: '1px solid #E0E3F5' }}
              />
            )}
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[13px] text-ink-dim">
            <li><span aria-hidden className="inline-block w-5 h-[3px] align-middle ml-2" style={{ background: INK_HEX.view }} />צפיות</li>
            <li><span aria-hidden className="inline-block w-3 h-3 align-middle ml-2" style={{ background: INK_HEX.click }} />קליקים ל-GoOut</li>
            {hasSales && <li><span aria-hidden className="inline-block w-3 h-3 align-middle ml-2" style={{ background: INK_HEX.sales }} />מכירות מאושרות</li>}
          </ul>
          {!hasSales && <p className="text-[12px] text-ink-dim mt-2">מכירות לפי שעה מוצגות רק ב-24 שעות וב-7 ימים. סך המכירות לחודש למעלה.</p>}
        </>
      )}
    </Panel>
  );
};

export default ActivityChart;
