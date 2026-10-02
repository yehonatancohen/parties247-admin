"use client";
import React, { useCallback, useEffect, useState } from 'react';
import RecentActivityFeed from './RecentActivityFeed';
import { getAnalyticsSummary, getDetailedAnalytics, getPartyFunnel, getRecentActivity } from '../services/api';
import { AnalyticsSummary, DetailedAnalyticsResponse, FunnelResponse, RecentActivityEvent } from '../data/types';
import { readAnalyticsCache, writeAnalyticsCache } from '../lib/analytics';
import SalesHero, { Period } from './analytics/SalesHero';
import PeaksPanel from './analytics/PeaksPanel';
import BreakdownBars from './analytics/BreakdownBars';
import WhatSells from './analytics/WhatSells';
import PartiesTab from './analytics/PartiesTab';
import VisitorsTab from './analytics/VisitorsTab';
import { GhostButton, Segmented } from './analytics/ui';

type Tab = 'overview' | 'parties' | 'visitors';

// Window cache keys are versioned apart from the month-scoped funnel cache the
// parties tab uses, because the two calls ask the backend different questions.
const windowKey = (p: Period) => `window:${p}`;

const AdminAnalytics: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState<Period>('7');
  const [funnels, setFunnels] = useState<Partial<Record<Period, FunnelResponse>>>({});
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [detailed, setDetailed] = useState<DetailedAnalyticsResponse | null>(null);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [lastSale, setLastSale] = useState<RecentActivityEvent | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache first: the backend takes ~5s per call, and a phone glance should not wait for it.
  useEffect(() => {
    const cachedSummary = readAnalyticsCache<AnalyticsSummary>('summary');
    const cachedDetailed = readAnalyticsCache<DetailedAnalyticsResponse>('peaks:7d');
    const cachedFunnels: Partial<Record<Period, FunnelResponse>> = {};
    (['1', '7', '30'] as Period[]).forEach(p => {
      const c = readAnalyticsCache<FunnelResponse>(windowKey(p));
      if (c) cachedFunnels[p] = c;
    });
    if (cachedSummary) setSummary(cachedSummary);
    if (cachedDetailed) setDetailed(cachedDetailed);
    setFunnels(cachedFunnels);
  }, []);

  const loadFunnel = useCallback(async (p: Period) => {
    setFunnelLoading(true);
    try {
      const data = await getPartyFunnel(Number(p), 'all');
      setFunnels(prev => ({ ...prev, [p]: data }));
      writeAnalyticsCache(windowKey(p), data);
    } catch (err) {
      console.error('Failed to load sales window', err);
    } finally {
      setFunnelLoading(false);
    }
  }, []);

  const loadShared = useCallback(async () => {
    setError(null);
    setDetailedLoading(true);
    const jobs = [
      getAnalyticsSummary()
        .then(d => { setSummary(d); writeAnalyticsCache('summary', d); })
        .catch(err => { console.error('Failed to load analytics summary', err); if (!readAnalyticsCache('summary')) setError('לא הצלחנו לטעון את הנתונים. נסה לרענן.'); }),
      getDetailedAnalytics('7d', 'hour')
        .then(d => { setDetailed(d); writeAnalyticsCache('peaks:7d', d); })
        .catch(err => console.error('Failed to load peaks', err)),
      getRecentActivity({ types: ['goout_purchase'], limit: 1, hours: 24 * 30 })
        .then(r => setLastSale(r.events[0] ?? null))
        .catch(() => {}),
    ];
    await Promise.all(jobs);
    setDetailedLoading(false);
  }, []);

  useEffect(() => { loadShared(); }, [loadShared]);
  useEffect(() => { loadFunnel(period); }, [period, loadFunnel]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadShared(), loadFunnel(period)]);
    setRefreshing(false);
  };

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

      {error && <p role="alert" className="text-ink-click py-2">{error}</p>}

      {tab === 'overview' && (
        <>
          <Segmented
            label="טווח זמן"
            value={period}
            onChange={setPeriod}
            options={[
              { value: '1', label: '24 שעות' },
              { value: '7', label: '7 ימים' },
              { value: '30', label: '30 ימים' },
            ]}
          />
          <SalesHero period={period} funnel={funnels[period] ?? null} loading={funnelLoading} lastSale={lastSale} />
          <PeaksPanel data={detailed} loading={detailedLoading} />
          <div className="grid gap-4 md:grid-cols-2 items-start">
            <WhatSells funnel={funnels[period] ?? null} loading={funnelLoading} period={period} />
            <div className="space-y-4">
              {summary && <BreakdownBars title="מאיפה נכנסים" note="מקורות תנועה" items={summary.trafficSources} />}
              {summary && <BreakdownBars title="באיזה מכשיר" items={summary.devices} />}
            </div>
          </div>
          <div>
            {showActivity ? (
              <RecentActivityFeed />
            ) : (
              <GhostButton onClick={() => setShowActivity(true)} className="w-full h-12">הצג פעילות אחרונה</GhostButton>
            )}
          </div>
        </>
      )}

      {tab === 'parties' && <PartiesTab />}
      {tab === 'visitors' && <VisitorsTab />}
    </div>
  );
};

export default AdminAnalytics;
