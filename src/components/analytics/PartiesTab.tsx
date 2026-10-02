"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { getPartyFunnel, getPartySales } from '../../services/api';
import { FunnelResponse, PartySalesRecord } from '../../data/types';
import {
  MergedPartyRow, PartySortKey, daysCoveringMonth, eventMonth, exportPartiesToCsv, formatMonthLabel,
  formatNumber, indexSalesByParty, jerusalemYyyyMm, readAnalyticsCache, sortMergedPartyRows, writeAnalyticsCache,
} from '../../lib/analytics';
import { GhostButton, InkKey, Panel, Segmented, Skeleton } from './ui';

const PAGE_SIZE = 20;

type Col = {
  key: string;
  label: string;
  sort?: PartySortKey;
  core: boolean;
  render: (r: MergedPartyRow) => React.ReactNode;
  cls?: string;
};

const money = (n: number | null) => (n == null ? '—' : `₪${formatNumber(n)}`);

const COLUMNS: Col[] = [
  { key: 'tickets', label: 'כרטיסים', sort: 'totalTicketsSold', core: true, cls: 'text-ink-sales font-bold', render: r => formatNumber(r.totalTicketsSold ?? r.purchases) },
  { key: 'commission', label: 'עמלה', sort: 'revenue', core: true, cls: 'text-white', render: r => money(r.lifetimeCommission ?? r.revenue) },
  { key: 'gross', label: 'מחזור GoOut', sort: 'realGoOutRevenue', core: true, cls: 'text-jungle-text', render: r => money(r.realGoOutRevenue) },
  { key: 'clicks', label: 'קליקים', sort: 'redirects', core: true, cls: 'text-ink-click font-bold', render: r => formatNumber(r.redirects) },
  { key: 'views', label: 'צפיות', sort: 'views', core: true, cls: 'text-ink-view font-bold', render: r => formatNumber(r.views) },
  { key: 'date', label: 'תאריך', sort: 'date', core: false, cls: 'text-ink-dim whitespace-nowrap', render: r => (r.date ? new Date(r.date).toLocaleDateString('he-IL') : '—') },
  { key: 'status', label: 'סטטוס', core: false, cls: 'text-ink-dim', render: r => (r.isActive ? 'פעיל' : 'עבר') },
  { key: 'v2c', label: 'צפייה←קליק', core: false, cls: 'text-ink-dim', render: r => (r.viewToRedirectRate != null ? `${r.viewToRedirectRate.toFixed(1)}%` : '—') },
  { key: 'gv', label: 'צפיות ב-GoOut', sort: 'realGoOutViews', core: false, cls: 'text-ink-dim', render: r => (r.realGoOutViews ?? '—') },
  { key: 'p', label: 'מכירות בטווח', sort: 'purchases', core: false, cls: 'text-ink-dim', render: r => r.purchases },
  { key: 'c2p', label: 'קליק←מכירה', core: false, cls: 'text-ink-dim', render: r => (r.redirectToPurchaseRate != null ? `${r.redirectToPurchaseRate.toFixed(1)}%` : '—') },
  { key: 'rev', label: 'עמלה בטווח', core: false, cls: 'text-ink-dim', render: r => (r.revenue > 0 ? `₪${r.revenue.toFixed(0)}` : '—') },
];

const PartiesTab: React.FC = () => {
  const [month, setMonth] = useState<string>(() => jerusalemYyyyMm());
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [salesRows, setSalesRows] = useState<PartySalesRecord[]>(() => readAnalyticsCache<PartySalesRecord[]>('sales') ?? []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [account, setAccount] = useState<'all' | 'account1' | 'account2'>('all');
  const [sortKey, setSortKey] = useState<PartySortKey>('totalTicketsSold');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [allCols, setAllCols] = useState(false);

  useEffect(() => {
    getPartySales()
      .then(rows => { setSalesRows(rows); writeAnalyticsCache('sales', rows); })
      .catch(err => console.error('Failed to load party sales', err));
  }, []);

  useEffect(() => {
    const cached = readAnalyticsCache<FunnelResponse>(`funnel:${month}`);
    setFunnel(cached);
    setLoading(!cached);
    let alive = true;
    getPartyFunnel(daysCoveringMonth(month), month)
      .then(data => { if (alive) { setFunnel(data); writeAnalyticsCache(`funnel:${month}`, data); } })
      .catch(err => console.error('Failed to load funnel analytics', err))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month]);

  const salesByPartyId = useMemo(() => indexSalesByParty(salesRows), [salesRows]);

  // One row per party: click metrics and new sale deltas are windowed by the
  // funnel range; lifetime tickets/commission and GoOut gross are cumulative
  // for events in the selected month (event date, Asia/Jerusalem).
  const rows: MergedPartyRow[] = useMemo(() => {
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
  }, [funnel, salesByPartyId, month]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = rows.filter(p => {
      if (status === 'active' && !p.isActive) return false;
      if (status === 'inactive' && p.isActive) return false;
      if (account !== 'all' && !p.accountIds.includes(account)) return false;
      if (!term) return true;
      return (p.name || '').toLowerCase().includes(term) || (p.slug || '').toLowerCase().includes(term);
    });
    return sortMergedPartyRows(list, sortKey, sortDir);
  }, [rows, search, status, account, sortKey, sortDir]);

  useEffect(() => { setPage(0); }, [search, status, account, sortKey, sortDir, month]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>(funnel?.realMonthsAvailable ?? []);
    set.add(jerusalemYyyyMm());
    return Array.from(set).sort().reverse();
  }, [funnel]);

  // Ticket sales and earned commission come from the lifetime sales snapshot for
  // events in the chosen month, matching GoOut's cumulative revenue counter.
  const totals = useMemo(() => ({
    tickets: rows.reduce((s, r) => s + (r.totalTicketsSold ?? r.purchases), 0),
    commission: rows.reduce((s, r) => s + (r.lifetimeCommission ?? r.revenue), 0),
    gross: rows.reduce((s, r) => s + (r.realGoOutRevenue ?? 0), 0),
    clicks: rows.reduce((s, r) => s + r.redirects, 0),
  }), [rows]);

  // GoOut sales that couldn't be matched to a catalog party: matched ones are
  // covered by the per-party table above.
  const unmatched = useMemo(() => {
    const byEvent = new Map<string, PartySalesRecord>();
    for (const row of salesRows.filter(r => !r.partyId && (r.confirmedTickets > 0 || r.totalTicketsSold > 0))) {
      const key = row.goOutEventId || `name:${row.eventName}:${row.accountId || ''}`;
      const existing = byEvent.get(key);
      if (!existing || row.totalTicketsSold > existing.totalTicketsSold) byEvent.set(key, row);
    }
    return Array.from(byEvent.values()).sort((a, b) => b.totalTicketsSold - a.totalTicketsSold);
  }, [salesRows]);

  const toggleSort = (key: PartySortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const cols = COLUMNS.filter(c => allCols || c.core);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Panel title="מסיבות לפי חודש אירוע" note="כרטיסים, עמלה ומחזור GoOut מצטברים לכל חיי המסיבה. קליקים וצפיות לפי טווח הפעילות של החודש.">
        <div className="flex overflow-x-auto border border-wood-brown mb-4" role="group" aria-label="חודש אירוע">
          {[...monthOptions, 'all'].map((m, i) => (
            <button
              key={m}
              type="button"
              aria-pressed={month === m}
              onClick={() => setMonth(m)}
              className={`h-11 px-4 text-[15px] font-medium whitespace-nowrap ${i > 0 ? 'border-r border-wood-brown' : ''} ${month === m ? 'bg-jungle-text text-jungle-deep' : 'text-ink-dim hover:text-white hover:bg-white/5'}`}
            >
              {m === 'all' ? 'כל הזמן' : formatMonthLabel(m)}
            </button>
          ))}
        </div>

        {!funnel && loading ? <Skeleton className="h-24 w-full" /> : (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
            <div>
              <dt className="flex items-center gap-2 text-[13px] text-ink-dim"><InkKey ink="sales" />כרטיסים שנמכרו</dt>
              <dd className="text-3xl font-extrabold text-ink-sales mt-1">{formatNumber(totals.tickets)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-dim">עמלה שלנו</dt>
              <dd className="text-3xl font-extrabold text-white mt-1">₪{formatNumber(totals.commission)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-dim">מחזור ב-GoOut (ברוטו)</dt>
              <dd className="text-3xl font-extrabold text-jungle-text mt-1">₪{formatNumber(totals.gross)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-[13px] text-ink-dim"><InkKey ink="click" />קליקים ל-GoOut</dt>
              <dd className="text-3xl font-extrabold text-ink-click mt-1">{formatNumber(totals.clicks)}</dd>
            </div>
          </dl>
        )}
      </Panel>

      <Panel
        title="כל המסיבות"
        note={`${filtered.length} מסיבות · ${month === 'all' ? 'כל הזמן' : formatMonthLabel(month)}`}
        actions={<GhostButton onClick={() => exportPartiesToCsv(filtered)} disabled={filtered.length === 0}>ייצוא CSV</GhostButton>}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם"
            aria-label="חיפוש מסיבה"
            className="h-11 bg-jungle-deep border border-wood-brown text-white px-3 placeholder:text-ink-dim focus:outline-none focus:border-ink-sales"
          />
          <Segmented size="sm" tone="paper" label="סטטוס" value={status} onChange={setStatus}
            options={[{ value: 'all', label: 'הכל' }, { value: 'active', label: 'פעילות' }, { value: 'inactive', label: 'עברו' }]} />
          <Segmented size="sm" tone="paper" label="חשבון" value={account} onChange={setAccount}
            options={[{ value: 'all', label: 'כל החשבונות' }, { value: 'account1', label: 'account1' }, { value: 'account2', label: 'account2' }]} />
        </div>

        {!funnel && loading ? <Skeleton className="h-64 w-full" /> : (
          <div className="overflow-x-auto border border-wood-brown">
            <table className="w-full text-[15px] border-collapse">
              <thead>
                <tr className="text-ink-dim text-[13px] bg-jungle-deep">
                  <th className="sticky right-0 z-10 bg-jungle-deep text-right font-medium px-3 py-2.5 min-w-[160px] border-l border-wood-brown">
                    <button type="button" onClick={() => toggleSort('name')} className="font-medium hover:text-white">
                      מסיבה {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  {cols.map(c => (
                    <th key={c.key} className="text-right font-medium px-3 py-2.5 whitespace-nowrap">
                      {c.sort ? (
                        <button type="button" onClick={() => toggleSort(c.sort!)} className={`font-medium hover:text-white ${sortKey === c.sort ? 'text-white' : ''}`}>
                          {c.label} {sortKey === c.sort ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </button>
                      ) : c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.partyId} className="border-t border-wood-brown/70 hover:bg-white/[0.03]">
                    <td className="sticky right-0 z-10 bg-jungle-surface px-3 py-3 border-l border-wood-brown min-w-[160px] max-w-[220px]">
                      <p className="text-white font-medium truncate">{r.name || '—'}</p>
                      <p className="text-[12px] text-ink-dim truncate">{r.accountIds.length ? r.accountIds.join(' + ') : 'ללא חשבון'}</p>
                    </td>
                    {cols.map(c => (
                      <td key={c.key} className={`px-3 py-3 whitespace-nowrap ${c.cls ?? ''}`}>{c.render(r)}</td>
                    ))}
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={cols.length + 1} className="py-8 text-center text-ink-dim">לא נמצאו מסיבות תואמות</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <GhostButton onClick={() => setAllCols(v => !v)}>{allCols ? 'פחות עמודות' : 'עוד עמודות'}</GhostButton>
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-ink-dim">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} מתוך {filtered.length}</span>
              <GhostButton onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>הקודם</GhostButton>
              <GhostButton onClick={() => setPage(p => ((p + 1) * PAGE_SIZE < filtered.length ? p + 1 : p))} disabled={(page + 1) * PAGE_SIZE >= filtered.length}>הבא</GhostButton>
            </div>
          )}
        </div>
      </Panel>

      {unmatched.length > 0 && (
        <Panel title="מכירות ב-GoOut בלי קישור לקטלוג" note="אירועים שנמכרו בהם כרטיסים אבל לא נמצאה להם מסיבה בקטלוג.">
          <div className="overflow-x-auto border border-wood-brown">
            <table className="w-full text-[15px] border-collapse">
              <thead>
                <tr className="text-ink-dim text-[13px] bg-jungle-deep">
                  {['אירוע', 'מאושרים', 'ממתינים', 'סה״כ כרטיסים', 'עמלה', 'צפיות ב-GoOut', 'מחזור GoOut'].map(h => (
                    <th key={h} className="text-right font-medium px-3 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unmatched.map(r => (
                  <tr key={r.goOutEventId || r.eventName} className="border-t border-wood-brown/70">
                    <td className="px-3 py-3 text-white font-medium max-w-[240px] truncate">{r.eventName || '—'}</td>
                    <td className="px-3 py-3 text-ink-sales font-bold">{r.confirmedTickets}</td>
                    <td className="px-3 py-3 text-ink-dim">{r.pendingTickets}</td>
                    <td className="px-3 py-3 text-ink-sales font-bold">{r.totalTicketsSold}</td>
                    <td className="px-3 py-3 text-white whitespace-nowrap">{r.totalRevenue > 0 ? `₪${r.totalRevenue.toFixed(0)}` : '—'}</td>
                    <td className="px-3 py-3 text-ink-dim">{r.realViews ?? '—'}</td>
                    <td className="px-3 py-3 text-jungle-text whitespace-nowrap">{r.realTotalRevenue != null ? `₪${r.realTotalRevenue.toFixed(0)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
};

export default PartiesTab;
