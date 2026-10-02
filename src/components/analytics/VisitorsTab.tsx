"use client";
import React, { useEffect, useState } from 'react';
import { getVisitorAnalytics } from '../../services/api';
import { VisitorAnalyticsResponse } from '../../data/types';
import { SOURCE_LABELS, exportVisitorsToCsv, formatNumber } from '../../lib/analytics';
import BreakdownBars from './BreakdownBars';
import { GhostButton, Panel, Segmented, Skeleton } from './ui';

const PAGE_SIZE = 25;
type Range = '24h' | '7d' | '30d';
const RANGE_LABEL: Record<Range, string> = { '24h': '24 שעות', '7d': '7 ימים', '30d': '30 ימים' };

const hostOf = (url: string) => {
  try { return new URL(url).hostname; } catch { return url; }
};

const VisitorsTab: React.FC = () => {
  const [range, setRange] = useState<Range>('24h');
  const [data, setData] = useState<VisitorAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    setPage(0);
    getVisitorAnalytics(range)
      .then(d => { if (alive) setData(d); })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range]);

  return (
    <div className="space-y-4">
      <Segmented
        options={(Object.keys(RANGE_LABEL) as Range[]).map(v => ({ value: v, label: RANGE_LABEL[v] }))}
        value={range}
        onChange={setRange}
        label="טווח מבקרים"
      />

      {failed && <p className="text-ink-click py-3">לא הצלחנו לטעון את המבקרים. נסה שוב בעוד רגע.</p>}
      {!data && loading && <Skeleton className="h-72 w-full" />}

      {data && (
        <>
          <Panel title="מבקרים" note={`ב${RANGE_LABEL[range]} האחרונות`}>
            <dl className="grid grid-cols-3 gap-x-4">
              <div>
                <dt className="text-[13px] text-ink-dim">סה״כ</dt>
                <dd className="text-3xl font-extrabold text-white mt-1">{formatNumber(data.total)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-dim">מכשיר נפוץ</dt>
                <dd className="text-2xl font-bold text-white mt-1">{data.devices[0] ? (SOURCE_LABELS[data.devices[0].label] || data.devices[0].label) : '—'}</dd>
                {data.devices[0] && <p className="text-[13px] text-ink-dim">{data.devices[0].percent}%</p>}
              </div>
              <div>
                <dt className="text-[13px] text-ink-dim">מקור ראשי</dt>
                <dd className="text-2xl font-bold text-white mt-1">{data.trafficSources[0] ? (SOURCE_LABELS[data.trafficSources[0].label] || data.trafficSources[0].label) : '—'}</dd>
                {data.trafficSources[0] && <p className="text-[13px] text-ink-dim">{data.trafficSources[0].percent}%</p>}
              </div>
            </dl>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <BreakdownBars title="מקורות תנועה" items={data.trafficSources} />
            <BreakdownBars title="מכשירים" items={data.devices} />
            <BreakdownBars title="דומיינים מפנים" items={data.topReferrers} labels={false} />
            <BreakdownBars title="דפדפנים" items={data.browsers} labels={false} />
            <BreakdownBars title="מערכות הפעלה" items={data.operatingSystems} labels={false} />
          </div>

          {data.visitors.length > 0 && (
            <Panel
              title="יומן מבקרים אחרון"
              actions={<GhostButton onClick={() => exportVisitorsToCsv(data.visitors)}>ייצוא CSV</GhostButton>}
            >
              <div className="overflow-x-auto border border-wood-brown">
                <table className="w-full text-[15px] border-collapse">
                  <thead>
                    <tr className="text-ink-dim text-[13px] bg-jungle-deep">
                      {['זמן', 'מכשיר', 'דפדפן', 'מערכת', 'מקור', 'הפניה'].map(h => (
                        <th key={h} className="text-right font-medium px-3 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.visitors.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((v, i) => (
                      <tr key={`${v.sessionId}-${i}`} className="border-t border-wood-brown/70">
                        <td className="px-3 py-2.5 text-ink-dim whitespace-nowrap">
                          {new Date(v.timestamp).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2.5 text-white">{SOURCE_LABELS[v.deviceType] || v.deviceType}</td>
                        <td className="px-3 py-2.5 text-jungle-text">{v.browser}</td>
                        <td className="px-3 py-2.5 text-jungle-text">{v.os}</td>
                        <td className="px-3 py-2.5 text-white">{SOURCE_LABELS[v.trafficSource] || v.trafficSource}</td>
                        <td className="px-3 py-2.5 text-ink-dim max-w-[200px] truncate" title={v.referer}>{v.referer ? hostOf(v.referer) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.visitors.length > PAGE_SIZE && (
                <div className="flex items-center justify-between gap-3 mt-3">
                  <span className="text-[13px] text-ink-dim">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.visitors.length)} מתוך {data.visitors.length}
                  </span>
                  <div className="flex gap-2">
                    <GhostButton onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>הקודם</GhostButton>
                    <GhostButton onClick={() => setPage(p => ((p + 1) * PAGE_SIZE < data.visitors.length ? p + 1 : p))} disabled={(page + 1) * PAGE_SIZE >= data.visitors.length}>הבא</GhostButton>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );
};

export default VisitorsTab;
