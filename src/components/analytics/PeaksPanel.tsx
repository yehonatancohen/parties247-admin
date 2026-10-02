"use client";
import React, { useMemo, useState } from 'react';
import { DetailedAnalyticsResponse } from '../../data/types';
import {
  HEBREW_WEEKDAYS_SHORT, HourCell, PeakMetric, buildHourGrid, formatHour, weekdayOfDayKey,
} from '../../lib/analytics';
import { INK_HEX, Ink, Panel, Segmented, Skeleton } from './ui';

const METRICS: { value: PeakMetric; label: string; long: string; ink: Ink }[] = [
  { value: 'visits', label: 'כניסות', long: 'כניסות לאתר (מבקרים ייחודיים)', ink: 'view' },
  { value: 'views', label: 'צפיות', long: 'צפיות בדפי מסיבות', ink: 'view' },
  { value: 'clicks', label: 'קליקים', long: 'קליקים ל-GoOut', ink: 'click' },
];

// Whole-step intensity: a cell is one of five fixed steps, never a free gradient.
const LEVELS = [0, 0.28, 0.5, 0.75, 1];
const levelOf = (v: number, max: number) => {
  if (v <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((v / max) * 4)));
};

const dayLabel = (dayKey: string) => {
  const [, m, d] = dayKey.split('-');
  return `${HEBREW_WEEKDAYS_SHORT[weekdayOfDayKey(dayKey)]} ${parseInt(d, 10)}/${parseInt(m, 10)}`;
};

const valueOf = (c: HourCell, metric: PeakMetric) => c[metric];

const PeaksPanel: React.FC<{ data: DetailedAnalyticsResponse | null; loading: boolean }> = ({ data, loading }) => {
  const [metric, setMetric] = useState<PeakMetric>('visits');
  const [picked, setPicked] = useState<HourCell | null>(null);
  const meta = METRICS.find(m => m.value === metric)!;
  const hex = INK_HEX[meta.ink];

  const grid = useMemo(() => (data ? buildHourGrid(data.data) : []), [data]);
  const last24 = useMemo(() => grid.slice(-24), [grid]);

  const stats = useMemo(() => {
    const max24 = Math.max(0, ...last24.map(c => valueOf(c, metric)));
    const max7 = Math.max(0, ...grid.map(c => valueOf(c, metric)));
    const peak24 = max24 > 0 ? last24.reduce((a, b) => (valueOf(b, metric) > valueOf(a, metric) ? b : a)) : null;
    // The three strongest hours of the week get a marked outline.
    const top3 = new Set(
      [...grid].filter(c => valueOf(c, metric) > 0).sort((a, b) => valueOf(b, metric) - valueOf(a, metric)).slice(0, 3).map(c => c.key),
    );
    const byHour = Array.from({ length: 24 }, () => 0);
    grid.forEach(c => { byHour[c.hour] += valueOf(c, metric); });
    const hotHours = byHour
      .map((v, h) => ({ h, v }))
      .filter(x => x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 3)
      .map(x => x.h);
    const rows: { dayKey: string; cells: (HourCell | null)[] }[] = [];
    for (const c of grid) {
      let row = rows[rows.length - 1];
      if (!row || row.dayKey !== c.dayKey) {
        row = { dayKey: c.dayKey, cells: Array.from({ length: 24 }, () => null) };
        rows.push(row);
      }
      row.cells[c.hour] = c;
    }
    return { max24, max7, peak24, top3, hotHours, rows: rows.reverse() };
  }, [grid, last24, metric]);

  const readout = picked;
  const readoutLabel = 'נבחר';

  return (
    <Panel title="פיקים בשבוע האחרון" note={meta.long}>
      <Segmented
        options={METRICS.map(m => ({ value: m.value, label: m.label }))}
        value={metric}
        onChange={v => { setMetric(v); setPicked(null); }}
        tone="paper"
        label="מדד"
        size="sm"
        className="mb-4"
      />

      {!data && loading ? (
        <Skeleton className="h-[260px] w-full" />
      ) : grid.length === 0 ? (
        <p className="text-ink-dim py-8 text-center">אין נתונים זמינים</p>
      ) : (
        <>
          <p className="min-h-[28px] text-[15px] text-jungle-text" aria-live="polite">
            {readout ? (
              <>
                <span className="text-ink-dim">{readoutLabel}: </span>
                <span className="font-bold text-white">{formatHour(readout.hour)}</span>
                <span className="text-ink-dim"> · {dayLabel(readout.dayKey)} · </span>
                <span className="font-bold" style={{ color: hex }}>{valueOf(readout, metric)}</span>
              </>
            ) : (
              <span className="text-ink-dim">גע בתא כדי לראות את השעה והערך שלו</span>
            )}
          </p>

          {/* 7-day grid: rows are days, columns are hours; every cell is one real hour */}
          <h4 className="text-[15px] font-bold text-white mt-6 mb-1">7 ימים: יום × שעה</h4>
          {stats.hotHours.length > 0 && (
            <p className="text-[13px] text-ink-dim mb-3">
              השעות החזקות בשבוע: {stats.hotHours.map(h => formatHour(h)).join(' · ')}. המסגרת הבהירה מסמנת את שלוש השעות החזקות ביותר.
            </p>
          )}
          <div dir="ltr">
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: '48px repeat(24, minmax(0, 1fr))' }}>
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="text-[10px] text-ink-dim text-center leading-none pb-1 overflow-visible whitespace-nowrap">
                  {h % 6 === 0 ? String(h).padStart(2, '0') : ''}
                </span>
              ))}
              {stats.rows.map(row => (
                <React.Fragment key={row.dayKey}>
                  <span dir="rtl" className="text-[12px] text-ink-dim pr-1 flex items-center justify-end whitespace-nowrap">{dayLabel(row.dayKey)}</span>
                  {row.cells.map((c, h) => {
                    if (!c) return <span key={h} className="h-[22px] sm:h-[26px]" />;
                    const v = valueOf(c, metric);
                    const lv = levelOf(v, stats.max7);
                    const top = stats.top3.has(c.key);
                    return (
                      <button
                        key={h}
                        type="button"
                        aria-label={`${dayLabel(row.dayKey)} ${formatHour(h)}: ${v}`}
                        onClick={() => setPicked(c)}
                        className="h-[22px] sm:h-[26px]"
                        style={{
                          background: lv === 0 ? '#1E2655' : hex,
                          opacity: lv === 0 ? 1 : LEVELS[lv],
                          outline: top ? '2px solid #E3E6FF' : picked?.key === c.key ? '2px solid #FFD23F' : 'none',
                          outlineOffset: '-2px',
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          <p className="text-[12px] text-ink-dim mt-3">שעות לפי שעון ישראל. הקליקים כאן הם יציאות ל-GoOut, לא מכירות.&rlm;</p>
        </>
      )}
    </Panel>
  );
};

export default PeaksPanel;
