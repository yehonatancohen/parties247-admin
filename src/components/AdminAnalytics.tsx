"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RecentActivityFeed from './RecentActivityFeed';
import { getAnalyticsSummary, getDetailedAnalytics, getPartyFunnel, getPartySales, getRecentActivity } from '../services/api';
import { AnalyticsSummary, DetailedAnalyticsResponse, FunnelResponse, PartySalesRecord, RecentActivityEvent } from '../data/types';
import {
  FUNNEL_WINDOW_DAYS, formatMonthLabel, indexSalesByParty, jerusalemYyyyMm, mergePartyRows, monthTotals,
  readAnalyticsCache, readAnalyticsCacheAt, writeAnalyticsCache,
} from '../lib/analytics';
import SalesHero from './analytics/SalesHero';
import ActivityChart from './analytics/ActivityChart';
import PeaksPanel from './analytics/PeaksPanel';
import BreakdownBars from './analytics/BreakdownBars';
import WhatSells from './analytics/WhatSells';
import PartiesTab from './analytics/PartiesTab';
import VisitorsTab from './analytics/VisitorsTab';
import { GhostButton, Segmented } from './analytics/ui';

type Tab = 'overview' | 'parties' | 'visitors';

// Reload while the page is open, and as soon as it comes back to the foreground
// (a phone tab restored from the background keeps its old state otherwise).
const AUTO_REFRESH_MS = 60_000;
const REFOCUS_STALE_MS = 15_000;

const formatClock = (ms: number) =>
  new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' }).format(ms);

const AdminAnalytics: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState<string>(() => jerusalemYyyyMm());
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [monthsAvailable, setMonthsAvailable] = useState<string[]>([]);
  const [salesRows, setSalesRows] = useState<PartySalesRecord[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [hourly, setHourly] = useState<DetailedAnalyticsResponse | null>(null);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyAt, setHourlyAt] = useState<number | null>(null);
  const [dataAt, setDataAt] = useState<number | null>(null);
  const [lastSale, setLastSale] = useState<RecentActivityEvent | null>(null);
  const [sales7, setSales7] = useState<RecentActivityEvent[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache first: the backend takes ~5s per call, and a phone glance should not wait for it.
  useEffect(() => {
    const cachedSummary = readAnalyticsCache<AnalyticsSummary>('summary');
    const cachedHourly = readAnalyticsCache<DetailedAnalyticsResponse>('peaks:7d');
    const cachedSales = readAnalyticsCache<PartySalesRecord[]>('sales');
    const cachedFunnel = readAnalyticsCache<FunnelResponse>(`funnel:${jerusalemYyyyMm()}`);
    const cachedLastSale = readAnalyticsCache<RecentActivityEvent | null>('lastSale');
    const cachedSales7 = readAnalyticsCache<RecentActivityEvent[]>('sales7');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cachedSummary) setSummary(cachedSummary);
    if (cachedLastSale) setLastSale(cachedLastSale);
    if (cachedSales7) setSales7(cachedSales7);
    if (cachedHourly) { setHourly(cachedHourly); setHourlyAt(readAnalyticsCacheAt('peaks:7d')); }
    setDataAt(readAnalyticsCacheAt('summary'));
    if (cachedSales) setSalesRows(cachedSales);
    if (cachedFunnel) { setFunnel(cachedFunnel); setMonthsAvailable(cachedFunnel.realMonthsAvailable); }
  }, []);

  const loadFunnel = useCallback(async (m: string) => {
    const cached = readAnalyticsCache<FunnelResponse>(`funnel:${m}`);
    setFunnel(cached);
    setFunnelLoading(!cached);
    try {
      const data = await getPartyFunnel(FUNNEL_WINDOW_DAYS, m);
      setFunnel(data);
      setMonthsAvailable(prev => Array.from(new Set([...prev, ...data.realMonthsAvailable])));
      writeAnalyticsCache(`funnel:${m}`, data);
    } catch (err) {
      console.error('Failed to load month totals', err);
      setError('חלק מהנתונים לא נטענו ומוצגים מהטעינה הקודמת. נסה לרענן.');
    } finally {
      setFunnelLoading(false);
    }
  }, []);

  const loadShared = useCallback(async () => {
    setHourlyLoading(true);
    // A failed call keeps whatever was on screen (cache or previous load); the
    // banner says the numbers may be stale instead of silently showing gaps.
    let failed = false;
    const fail = (what: string) => (err: unknown) => { console.error(`Failed to load ${what}`, err); failed = true; };
    await Promise.all([
      getPartySales()
        .then(rows => { setSalesRows(rows); writeAnalyticsCache('sales', rows); })
        .catch(fail('party sales')),
      getAnalyticsSummary()
        .then(d => { setSummary(d); writeAnalyticsCache('summary', d); })
        .catch(fail('analytics summary')),
      getDetailedAnalytics('7d', 'hour')
        .then(d => { setHourly(d); setHourlyAt(Date.now()); writeAnalyticsCache('peaks:7d', d); })
        .catch(fail('hourly series')),
      getRecentActivity({ types: ['goout_purchase'], limit: 1, hours: 24 * 30 })
        .then(r => { const e = r.events[0] ?? null; setLastSale(e); writeAnalyticsCache('lastSale', e); })
        .catch(fail('last sale')),
      getRecentActivity({ types: ['goout_purchase'], limit: 200, hours: 24 * 7 })
        .then(r => { setSales7(r.events); writeAnalyticsCache('sales7', r.events); })
        .catch(fail('7-day sales')),
    ]);
    if (failed) setError('חלק מהנתונים לא נטענו ומוצגים מהטעינה הקודמת. נסה לרענן.');
    else { setError(null); setDataAt(Date.now()); }
    setHourlyLoading(false);
  }, []);

  const monthRef = useRef(month);
  useEffect(() => { monthRef.current = month; }, [month]);
  const inFlight = useRef(false);
  const lastLoad = useRef(0);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    lastLoad.current = Date.now();
    setRefreshing(true);
    try {
      await Promise.all([loadShared(), loadFunnel(monthRef.current)]);
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [loadShared, loadFunnel]);

  useEffect(() => {
    refresh();
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, AUTO_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > REFOCUS_STALE_MS) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refresh]);

  // Month changes load only the funnel; the first load is part of refresh().
  const firstMonth = useRef(true);
  useEffect(() => {
    if (firstMonth.current) { firstMonth.current = false; return; }
    loadFunnel(month);
  }, [month, loadFunnel]);

  const salesByPartyId = useMemo(() => indexSalesByParty(salesRows), [salesRows]);
  const rows = useMemo(() => mergePartyRows(funnel, salesByPartyId, month), [funnel, salesByPartyId, month]);
  const totals = useMemo(() => (funnel ? monthTotals(rows) : null), [funnel, rows]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>(monthsAvailable);
    set.add(jerusalemYyyyMm());
    return Array.from(set).sort().reverse();
  }, [monthsAvailable]);

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Segmented
          className="flex-1"
          tone="paper"
          label="תצוגה"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'סקירה' },
            { value: 'parties', label: 'מסיבות' },
            { value: 'visitors', label: 'מבקרים' },
          ]}
        />
        <GhostButton onClick={refresh} disabled={refreshing} className="h-12" aria-label="רענון נתונים">
          {refreshing ? 'מרענן…' : 'רענון'}
        </GhostButton>
      </div>
      <p className="text-ink-dim text-sm -mt-2" aria-live="polite">
        {refreshing
          ? (dataAt ? `מוצגים נתונים מ-${formatClock(dataAt)} · מעדכן…` : 'טוען נתונים…')
          : (dataAt ? `עודכן ב-${formatClock(dataAt)} · מתעדכן אוטומטית כל דקה` : '')}
      </p>

      {error && <p role="alert" className="text-ink-click py-2">{error}</p>}

      {tab === 'overview' && (
        <>
          <div className="flex overflow-x-auto border border-wood-brown" role="group" aria-label="חודש">
            {[...monthOptions, 'all'].map((m, i) => (
              <button
                key={m}
                type="button"
                aria-pressed={month === m}
                onClick={() => setMonth(m)}
                className={`h-12 px-4 text-[15px] font-medium whitespace-nowrap ${i > 0 ? 'border-r border-wood-brown' : ''} ${month === m ? 'bg-jungle-accent text-white' : 'text-ink-dim hover:text-white hover:bg-white/5'}`}
              >
                {m === 'all' ? 'מאז ההתחלה' : formatMonthLabel(m)}
              </button>
            ))}
          </div>

          <SalesHero month={month} totals={totals} loading={funnelLoading} lastSale={lastSale} />
          <ActivityChart month={month} hourly={hourly} hourlyAt={hourlyAt} hourlyLoading={hourlyLoading} sales={sales7} />
          <RecentActivityFeed initialFilter="goout_purchase" initialRange="7d" />
          <div className="grid gap-4 md:grid-cols-2 items-start">
            <WhatSells rows={rows} loading={funnelLoading} />
            {summary && <BreakdownBars title="מאיפה נכנסים" items={summary.trafficSources} limit={4} />}
          </div>

          {showMore ? (
            <>
              <PeaksPanel data={hourly} asOf={hourlyAt} loading={hourlyLoading} />
              {summary && <BreakdownBars title="באיזה מכשיר" items={summary.devices} />}
            </>
          ) : (
            <GhostButton onClick={() => setShowMore(true)} className="w-full h-12">עוד נתונים: פיקים לפי שעה, מכשירים</GhostButton>
          )}
        </>
      )}

      {tab === 'parties' && <PartiesTab />}
      {tab === 'visitors' && <VisitorsTab />}
    </div>
  );
};

export default AdminAnalytics;
