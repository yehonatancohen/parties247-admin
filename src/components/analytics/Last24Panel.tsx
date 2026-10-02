"use client";
import React, { useMemo, useRef, useState } from 'react';
import { DetailedAnalyticsResponse, RecentActivityEvent } from '../../data/types';
import { HourCell, buildHourGrid, formatHour } from '../../lib/analytics';
import { INK_HEX, Panel, Skeleton } from './ui';

const W = 24;               // hours
const LANE_TRAFFIC = 150;
const LANE_CLICKS = 72;
const LANE_SALES = 40;

const Y = ({ label }: { label: string | number }) => (
  <span className="absolute top-0 left-1 text-[11px] text-ink-dim bg-jungle-surface/80 px-1 leading-4 pointer-events-none">{label}</span>
);

const hourKeyOf = (iso: string) => new Date(Math.floor(new Date(iso).getTime() / 3_600_000) * 3_600_000).toISOString().slice(0, 13) + ':00:00Z';

const delta = (now: number, prev: number) => {
  if (prev === 0) return now === 0 ? '—' : 'חדש';
  const p = Math.round(((now - prev) / prev) * 100);
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)}%`;
};

const Last24Panel: React.FC<{
  data: DetailedAnalyticsResponse | null;
  loading: boolean;
  sales: RecentActivityEvent[];
}> = ({ data, loading, sales }) => {
  const [sel, setSel] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const { cells, prev } = useMemo(() => {
    const grid = data ? buildHourGrid(data.data) : [];
    return { cells: grid.slice(-W), prev: grid.slice(-2 * W, -W) };
  }, [data]);

  const salesByHour = useMemo(() => {
    const m = new Map<string, RecentActivityEvent[]>();
    sales.forEach(e => {
      const k = hourKeyOf(e.timestamp);
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return m;
  }, [sales]);

  const stats = useMemo(() => {
    const sum = (arr: HourCell[], k: 'visits' | 'views' | 'clicks') => arr.reduce((s, c) => s + c[k], 0);
    const maxTraffic = Math.max(1, ...cells.map(c => Math.max(c.views, c.visits)));
    const maxClicks = Math.max(1, ...cells.map(c => c.clicks));
    const maxSales = Math.max(1, ...cells.map(c => salesByHour.get(c.key)?.length ?? 0));
    let peak = -1;
    cells.forEach((c, i) => { if (c.views > 0 && (peak < 0 || c.views > cells[peak].views)) peak = i; });
    return {
      maxTraffic, maxClicks, maxSales, peak,
      tot: { visits: sum(cells, 'visits'), views: sum(cells, 'views'), clicks: sum(cells, 'clicks') },
      old: { visits: sum(prev, 'visits'), views: sum(prev, 'views'), clicks: sum(prev, 'clicks') },
      sold: sales.length,
    };
  }, [cells, prev, salesByHour, sales.length]);

  const idxFromX = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return null;
    return Math.min(W - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * W)));
  };

  const active = sel ?? (stats.peak >= 0 ? stats.peak : null);
  const cur = active != null ? cells[active] : null;
  const curSales = cur ? salesByHour.get(cur.key) ?? [] : [];

  const linePath = (key: 'visits' | 'views', close: boolean) => {
    const pts = cells.map((c, i) => `${i + 0.5},${100 - (c[key] / stats.maxTraffic) * 100}`);
    const d = `M ${pts.join(' L ')}`;
    return close ? `${d} L ${W - 0.5},100 L 0.5,100 Z` : d;
  };

  const lane = 'relative border-b border-wood-brown';
  return (
    <Panel title="24 השעות האחרונות" note="שעה אחרי שעה: כניסות, צפיות, קליקים ל-GoOut ומכירות מאושרות. גע בגרף כדי לראות שעה.">
      {!data && loading ? (
        <Skeleton className="h-[360px] w-full" />
      ) : cells.length === 0 ? (
        <p className="text-ink-dim py-8 text-center">אין נתונים זמינים</p>
      ) : (
        <>
          <dl className="grid grid-cols-4 gap-x-3 mb-4">
            {([
              ['visits', 'כניסות', INK_HEX.view],
              ['views', 'צפיות', INK_HEX.view],
              ['clicks', 'קליקים', INK_HEX.click],
            ] as const).map(([k, label, color]) => (
              <div key={k}>
                <dt className="text-[13px] text-ink-dim">{label}</dt>
                <dd className="text-2xl font-extrabold text-white leading-tight" style={k === 'clicks' ? { color } : undefined}>{stats.tot[k]}</dd>
                <p className="text-[12px] text-ink-dim"><bdi dir="ltr">{delta(stats.tot[k], stats.old[k])}</bdi> מ-24 השעות שלפני</p>
              </div>
            ))}
            <div>
              <dt className="text-[13px] text-ink-dim">מכירות</dt>
              <dd className="text-2xl font-extrabold leading-tight" style={{ color: INK_HEX.sales }}>{stats.sold}</dd>
              <p className="text-[12px] text-ink-dim">מאושרות</p>
            </div>
          </dl>

          <p className="min-h-[48px] text-[15px] text-jungle-text" aria-live="polite">
            {cur ? (
              <>
                <span className="font-bold text-white">{formatHour(cur.hour)}–{formatHour((cur.hour + 1) % 24)}</span>
                <span className="text-ink-dim">{sel == null ? ' · השעה העמוסה ביותר' : ''}</span>
                <br />
                <span style={{ color: INK_HEX.view }}>{cur.visits} כניסות · {cur.views} צפיות</span>
                <span style={{ color: INK_HEX.click }}> · {cur.clicks} קליקים</span>
                <span style={{ color: INK_HEX.sales }}> · {curSales.length} מכירות</span>
                {curSales.length > 0 && <span className="text-ink-dim"> ({curSales.map(s => s.partyName).filter(Boolean).join(', ')})</span>}
              </>
            ) : <span className="text-ink-dim">אין פעילות ב-24 השעות האחרונות</span>}
          </p>

          <div
            ref={box}
            dir="ltr"
            tabIndex={0}
            role="img"
            aria-label="גרף פעילות שעה אחרי שעה ב-24 השעות האחרונות"
            className="relative touch-pan-y select-none focus:outline-none focus-visible:outline-2 focus-visible:outline-ink-sales"
            onPointerDown={e => setSel(idxFromX(e.clientX))}
            onPointerMove={e => { if (e.pointerType === 'mouse' || e.buttons) setSel(idxFromX(e.clientX)); }}
            onPointerLeave={e => { if (e.pointerType === 'mouse') setSel(null); }}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft') setSel(s => Math.max(0, (s ?? active ?? W - 1) - 1));
              if (e.key === 'ArrowRight') setSel(s => Math.min(W - 1, (s ?? active ?? 0) + 1));
              if (e.key === 'Escape') setSel(null);
            }}
          >
            {/* traffic lane */}
            <div className={lane} style={{ height: LANE_TRAFFIC }}>
              <Y label={stats.maxTraffic} />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-wood-brown" />
              <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" aria-hidden>
                <path d={linePath('views', true)} fill={INK_HEX.view} fillOpacity="0.22" />
                <path d={linePath('views', false)} fill="none" stroke={INK_HEX.view} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <path d={linePath('visits', false)} fill="none" stroke="#E3E6FF" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>

            {/* clicks lane */}
            <div className={`${lane} flex items-end gap-[2px]`} style={{ height: LANE_CLICKS }}>
              <Y label={stats.maxClicks} />
              {cells.map(c => (
                <span key={c.key} className="flex-1 block" style={{ height: `${(c.clicks / stats.maxClicks) * 100}%`, minHeight: c.clicks > 0 ? 3 : 0, background: INK_HEX.click }} />
              ))}
            </div>

            {/* confirmed sales lane */}
            <div className={`${lane} grid gap-[2px]`} style={{ height: LANE_SALES, gridTemplateColumns: `repeat(${W}, minmax(0, 1fr))` }}>
              {cells.map(c => {
                const n = salesByHour.get(c.key)?.length ?? 0;
                return (
                  <span key={c.key} className="flex items-center justify-center text-[12px] font-extrabold text-jungle-deep" style={{ background: n > 0 ? INK_HEX.sales : 'transparent' }}>
                    {n > 0 ? n : ''}
                  </span>
                );
              })}
            </div>

            {/* hour axis */}
            <div className="flex mt-1 text-[11px] text-ink-dim">
              {cells.map(c => (
                <span key={c.key} className="flex-1 text-center whitespace-nowrap overflow-visible">
                  {c.hour % 3 === 0 ? String(c.hour).padStart(2, '0') : ''}
                </span>
              ))}
            </div>

            {/* midnight marker */}
            {cells.map((c, i) => (c.hour === 0 && i > 0 ? (
              <span key={`m${c.key}`} aria-hidden className="absolute top-0 border-l border-ink-dim/60 pointer-events-none" style={{ left: `${(i / W) * 100}%`, height: LANE_TRAFFIC + LANE_CLICKS + LANE_SALES }} />
            ) : null))}

            {/* scrubber */}
            {active != null && (
              <span
                aria-hidden
                className="absolute top-0 pointer-events-none"
                style={{ left: `${(active / W) * 100}%`, width: `${100 / W}%`, height: LANE_TRAFFIC + LANE_CLICKS + LANE_SALES, background: 'rgba(227,230,255,0.12)', borderLeft: '1px solid #E3E6FF', borderRight: '1px solid #E3E6FF' }}
              />
            )}
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[13px] text-ink-dim">
            <li><span aria-hidden className="inline-block w-5 h-[3px] align-middle ml-2" style={{ background: INK_HEX.view }} />צפיות במסיבות</li>
            <li><span aria-hidden className="inline-block w-5 align-middle ml-2 border-t-2 border-dashed" style={{ borderColor: '#E3E6FF' }} />כניסות לאתר</li>
            <li><span aria-hidden className="inline-block w-3 h-3 align-middle ml-2" style={{ background: INK_HEX.click }} />קליקים ל-GoOut</li>
            <li><span aria-hidden className="inline-block w-3 h-3 align-middle ml-2" style={{ background: INK_HEX.sales }} />מכירות מאושרות (מספר בתא)</li>
          </ul>
          <p className="text-[12px] text-ink-dim mt-2">שעות לפי שעון ישראל. הזמן זורם משמאל לימין והעמודה האחרונה היא השעה הנוכחית. קו אנכי דק מסמן חצות.</p>
        </>
      )}
    </Panel>
  );
};

export default Last24Panel;
