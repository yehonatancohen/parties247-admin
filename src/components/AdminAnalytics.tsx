"use client";
import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import RecentActivityFeed from './RecentActivityFeed';
import { getAnalyticsSummary, getDetailedAnalytics, getVisitorAnalytics } from '../services/api';
import { AnalyticsSummary, AnalyticsSummaryParty, DetailedAnalyticsResponse, VisitorAnalyticsResponse, VisitorRecord, BreakdownItem } from '../data/types';
import { FireIcon, TicketIcon, MegaphoneIcon } from './Icons';

// --- Helpers ---
const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);

const calculateCTR = (views: number, clicks: number) => {
  if (views === 0) return 0;
  return (clicks / views) * 100;
};

// --- CSV export ---
const csvEscape = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
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

const exportPartiesToCsv = (parties: AnalyticsSummaryParty[]) => {
  const rows = parties.map(p => [
    p.name,
    p.slug,
    p.date ? new Date(p.date).toLocaleDateString('he-IL') : '',
    p.views,
    p.redirects,
    calculateCTR(p.views, p.redirects).toFixed(1) + '%',
  ]);
  downloadCsv(
    `parties-performance-${new Date().toISOString().slice(0, 10)}.csv`,
    ['שם', 'Slug', 'תאריך', 'צפיות', 'קליקים', 'CTR'],
    rows,
  );
};

const exportVisitorsToCsv = (visitors: VisitorRecord[]) => {
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

// Icons
const UsersIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0a9.042 9.042 0 01-2.003 3.853" />
  </svg>
);

const DeviceIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

// --- Components ---

// 1. KPI Card
const KpiCard = ({ title, value, subtext, icon: Icon, colorClass }: { title: string, value: string, subtext?: string, icon: any, colorClass: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start justify-between relative overflow-hidden group hover:border-white/20 transition-all">
    <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`} />
    <div>
      <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-display text-white font-bold">{value}</h3>
      {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-xl bg-white/5 ${colorClass.replace('bg-', 'text-')} opacity-80 group-hover:scale-110 transition-transform`}>
      <Icon className="w-6 h-6" />
    </div>
  </div>
);

// 2. Bar Chart Row
const PartyPerformanceRow = ({ name, views, clicks, maxViews }: { name: string, views: number, clicks: number, maxViews: number }) => {
  const viewWidth = Math.max((views / maxViews) * 100, 1);
  const ctr = calculateCTR(views, clicks);

  return (
    <div className="mb-4 group">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-bold text-gray-200 truncate max-w-[200px]">{name}</span>
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-gray-400">{views} צפיות</span>
          <span className="text-jungle-lime">{clicks} המרות ({ctr.toFixed(1)}%)</span>
        </div>
      </div>
      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden relative">
        <div
          className="h-full bg-blue-500/40 absolute right-0 top-0 rounded-full transition-all duration-1000"
          style={{ width: `${viewWidth}%` }}
        />
        <div
          className="h-full bg-jungle-lime/80 absolute right-0 top-0 rounded-full transition-all duration-1000 z-10"
          style={{ width: `${(clicks / maxViews) * 100}%` }}
        />
      </div>
    </div>
  );
};

// 3. Breakdown Donut Chart
const BreakdownDonut = ({ items, title, icon: Icon, colorPalette }: {
  items: BreakdownItem[];
  title: string;
  icon: any;
  colorPalette: string[];
}) => {
  if (!items.length) return null;

  const topItems = items.slice(0, 5);
  const total = topItems.reduce((sum, item) => sum + item.count, 0);

  // Build conic-gradient segments
  let gradientParts: string[] = [];
  let currentAngle = 0;
  topItems.forEach((item, i) => {
    const angle = (item.count / total) * 360;
    const color = colorPalette[i % colorPalette.length];
    gradientParts.push(`${color} ${currentAngle}deg ${currentAngle + angle}deg`);
    currentAngle += angle;
  });

  const sourceLabels: Record<string, string> = {
    'direct': 'ישיר',
    'organic_search': 'חיפוש',
    'social': 'רשת חברתית',
    'referral': 'הפניה',
    'mobile': 'מובייל',
    'desktop': 'מחשב',
    'tablet': 'טאבלט',
    'bot': 'בוט',
    'unknown': 'לא ידוע',
  };

  return (
    <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
      <h3 className="text-lg text-white font-bold mb-5 flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-400" />
        {title}
      </h3>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div
          className="w-24 h-24 rounded-full flex-shrink-0 relative"
          style={{
            background: `conic-gradient(${gradientParts.join(', ')})`,
          }}
        >
          <div className="absolute inset-2 rounded-full bg-gray-900/90 flex items-center justify-center">
            <span className="text-white text-sm font-bold">{total}</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex-1 space-y-2">
          {topItems.map((item, i) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: colorPalette[i % colorPalette.length] }}
                />
                <span className="text-gray-300 truncate max-w-[120px]">
                  {sourceLabels[item.label] || item.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-400">{item.count}</span>
                <span className="font-mono text-gray-500 text-xs w-12 text-left">{item.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 4. Horizontal Bar Breakdown
const BreakdownBars = ({ items, title, icon: Icon, color }: {
  items: BreakdownItem[];
  title: string;
  icon: any;
  color: string;
}) => {
  if (!items.length) return null;
  const topItems = items.slice(0, 6);
  const maxCount = Math.max(...topItems.map(i => i.count), 1);

  const labelMap: Record<string, string> = {
    'direct': 'ישיר',
    'organic_search': 'חיפוש אורגני',
    'social': 'רשתות חברתיות',
    'referral': 'הפניה',
    'mobile': 'מובייל',
    'desktop': 'מחשב',
    'tablet': 'טאבלט',
    'bot': 'בוט',
    'unknown': 'לא ידוע',
  };

  return (
    <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
      <h3 className="text-lg text-white font-bold mb-5 flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-400" />
        {title}
      </h3>
      <div className="space-y-3">
        {topItems.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">{labelMap[item.label] || item.label}</span>
              <span className="text-gray-500 font-mono text-xs">{item.count} ({item.percent}%)</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: color,
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Tab definitions ---
type AnalyticsTab = 'overview' | 'visitors' | 'parties';

// --- Main Layout ---

const AdminAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [detailedData, setDetailedData] = useState<DetailedAnalyticsResponse | null>(null);
  const [visitorData, setVisitorData] = useState<VisitorAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isLoadingVisitors, setIsLoadingVisitors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'daily' | 'hourly'>('daily');
  const [visitorRange, setVisitorRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [visitorPage, setVisitorPage] = useState(0);
  const VISITOR_PAGE_SIZE = 25;
  const [partyTableSearch, setPartyTableSearch] = useState('');
  const [partyTablePage, setPartyTablePage] = useState(0);
  const PARTY_TABLE_PAGE_SIZE = 20;

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAnalyticsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load analytics summary', err);
      setError('שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetailedAnalytics = async () => {
    setIsLoadingChart(true);
    try {
      const range = timeFilter === 'daily' ? '7d' : '24h';
      const interval = 'hour';
      const data = await getDetailedAnalytics(range, interval);
      setDetailedData(data);
    } catch (err) {
      console.error('Failed to load detailed analytics', err);
    } finally {
      setIsLoadingChart(false);
    }
  };

  const fetchVisitorAnalytics = async () => {
    setIsLoadingVisitors(true);
    try {
      const data = await getVisitorAnalytics(visitorRange);
      setVisitorData(data);
    } catch (err) {
      console.error('Failed to load visitor analytics', err);
    } finally {
      setIsLoadingVisitors(false);
    }
  };

  useEffect(() => {
    fetchSummary().catch(() => { });
  }, []);

  useEffect(() => {
    fetchDetailedAnalytics().catch(() => { });
  }, [timeFilter]);

  useEffect(() => {
    if (activeTab === 'visitors') {
      setVisitorPage(0);
      fetchVisitorAnalytics().catch(() => { });
    }
  }, [activeTab, visitorRange]);

  // Derived State
  const stats = useMemo(() => {
    if (!summary) return null;
    const totalViews = summary.parties.reduce((sum, p) => sum + p.views, 0);
    const totalClicks = summary.parties.reduce((sum, p) => sum + p.redirects, 0);
    const avgCTR = calculateCTR(totalViews, totalClicks);

    const sortedByViews = [...summary.parties].sort((a, b) => b.views - a.views);
    const sortedByCTR = [...summary.parties].filter(p => p.views > 5).sort((a, b) => calculateCTR(b.views, b.redirects) - calculateCTR(a.views, a.redirects));

    return {
      totalViews,
      totalClicks,
      avgCTR,
      sortedByViews,
      sortedByCTR,
      topParty: sortedByViews[0],
      bestConverting: sortedByCTR[0]
    };
  }, [summary]);

  const filteredPartyTableRows = useMemo(() => {
    if (!stats) return [];
    const term = partyTableSearch.trim().toLowerCase();
    if (!term) return stats.sortedByViews;
    return stats.sortedByViews.filter(p =>
      p.name.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term)
    );
  }, [stats, partyTableSearch]);

  useEffect(() => {
    setPartyTablePage(0);
  }, [partyTableSearch]);

  const partyTablePageRows = useMemo(() => {
    const start = partyTablePage * PARTY_TABLE_PAGE_SIZE;
    return filteredPartyTableRows.slice(start, start + PARTY_TABLE_PAGE_SIZE);
  }, [filteredPartyTableRows, partyTablePage]);

  // Process chart data from API
  const chartData = useMemo(() => {
    if (!detailedData || !detailedData.data.length) return [];

    return detailedData.data.map(item => {
      let label = item.timestamp;

      const date = new Date(item.timestamp);
      if (detailedData.range === '24h') {
        label = `${date.getHours()}:00`;
      } else {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        label = `${days[date.getDay()]} ${date.getHours()}:00`;
      }

      return {
        label,
        views: item.partyViews,
        clicks: item.purchases,
        visits: item.visits
      };
    });
  }, [detailedData]);

  if (isLoading && !summary) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;
  if (error) return <div className="p-6 bg-red-900/20 text-red-200 rounded-xl border border-red-500/30">{error}</div>;
  if (!summary || !stats) return null;

  const maxValue = Math.max(...chartData.map(d => Math.max(d.views, d.visits || 0)), 1);
  const maxChartValue = maxValue * 1.1;

  const tabs: { key: AnalyticsTab; label: string; emoji: string }[] = [
    { key: 'overview', label: 'סקירה כללית', emoji: '📊' },
    { key: 'visitors', label: 'מבקרים ומקורות תנועה', emoji: '👥' },
    { key: 'parties', label: 'ביצועי אירועים', emoji: '🎉' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl text-white font-display">ביצועי המערכת</h2>
          <p className="text-gray-400 text-sm">סקירה בזמן אמת של התעניינות ומכירות</p>
        </div>
        <button
          onClick={fetchSummary}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm rounded-lg border border-white/10 transition flex items-center gap-2"
        >
          {isLoading ? <LoadingSpinner /> : <span className="text-lg">↻</span>}
          רענון נתונים
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2.5 text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === tab.key
              ? 'bg-white/10 text-white font-medium shadow-sm border border-white/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW TAB === */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="חשיפות למותג"
              value={formatNumber(stats.totalViews)}
              subtext={`${summary.uniqueVisitors24h} מבקרים ייחודיים ב-24 שעות`}
              icon={MegaphoneIcon}
              colorClass="bg-blue-500"
            />
            <KpiCard
              title="קליקים לרכישה"
              value={formatNumber(stats.totalClicks)}
              subtext={`יחס המרה ממוצע: ${stats.avgCTR.toFixed(1)}%`}
              icon={TicketIcon}
              colorClass="bg-jungle-lime"
            />
            <KpiCard
              title="האירוע החם"
              value={stats.topParty ? stats.topParty.name.substring(0, 15) + (stats.topParty.name.length > 15 ? '...' : '') : '-'}
              subtext={stats.topParty ? `${stats.topParty.views} צפיות` : ''}
              icon={FireIcon}
              colorClass="bg-orange-500"
            />
            <KpiCard
              title="מלך ההמרות"
              value={stats.bestConverting ? stats.bestConverting.name.substring(0, 15) : '-'}
              subtext={stats.bestConverting ? `${calculateCTR(stats.bestConverting.views, stats.bestConverting.redirects).toFixed(1)}% המרה` : ''}
              icon={TicketIcon}
              colorClass="bg-purple-500"
            />
          </div>

          {/* Traffic Sources & Devices Breakdown (Quick View) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BreakdownDonut
              items={summary.trafficSources}
              title="מקורות תנועה"
              icon={GlobeIcon}
              colorPalette={['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444']}
            />
            <BreakdownDonut
              items={summary.devices}
              title="מכשירים"
              icon={DeviceIcon}
              colorPalette={['#10b981', '#6366f1', '#f97316', '#ec4899', '#64748b']}
            />
          </div>

          {/* Time-Based Analytics */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl text-white font-bold flex items-center gap-2">
                📊 מגמות
              </h3>
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setTimeFilter('daily')}
                  disabled={isLoadingChart}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${timeFilter === 'daily' ? 'bg-white/10 text-white font-medium shadow-sm' : 'text-gray-400 hover:text-white'} disabled:opacity-50`}
                >
                  7 ימים (לפי שעה)
                </button>
                <button
                  onClick={() => setTimeFilter('hourly')}
                  disabled={isLoadingChart}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${timeFilter === 'hourly' ? 'bg-white/10 text-white font-medium shadow-sm' : 'text-gray-400 hover:text-white'} disabled:opacity-50`}
                >
                  שעתי (24 שעות)
                </button>
              </div>
            </div>

            {isLoadingChart ? (
              <div className="h-64 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                אין נתונים זמינים
              </div>
            ) : (
              <div className="relative h-64 w-full" dir="ltr">
                <div className="absolute inset-0 bottom-6 left-0 right-0">
                  <svg className="w-full h-full" viewBox={`0 0 ${chartData.length} 100`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="grad-visits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="grad-views" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="grad-clicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#84cc16" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#84cc16" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Visits (Purple) */}
                    <path
                      d={`M ${chartData.map((d, i) => `${i + 0.5},${maxChartValue > 0 ? 100 - (d.visits / maxChartValue * 100) : 100}`).join(' L ')} L ${chartData.length - 0.5},100 L 0.5,100 Z`}
                      fill="url(#grad-visits)"
                    />
                    <path
                      d={`M ${chartData.map((d, i) => `${i + 0.5},${maxChartValue > 0 ? 100 - (d.visits / maxChartValue * 100) : 100}`).join(' L ')}`}
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      opacity="0.6"
                    />

                    {/* Views (Blue) */}
                    <path
                      d={`M ${chartData.map((d, i) => `${i + 0.5},${maxChartValue > 0 ? 100 - (d.views / maxChartValue * 100) : 100}`).join(' L ')} L ${chartData.length - 0.5},100 L 0.5,100 Z`}
                      fill="url(#grad-views)"
                    />
                    <path
                      d={`M ${chartData.map((d, i) => `${i + 0.5},${maxChartValue > 0 ? 100 - (d.views / maxChartValue * 100) : 100}`).join(' L ')}`}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Clicks (Green - Top Layer) */}
                    <path
                      d={`M ${chartData.map((d, i) => `${i + 0.5},${maxChartValue > 0 ? 100 - (d.clicks / maxChartValue * 100) : 100}`).join(' L ')} L ${chartData.length - 0.5},100 L 0.5,100 Z`}
                      fill="url(#grad-clicks)"
                    />
                    <path
                      d={`M ${chartData.map((d, i) => `${i + 0.5},${maxChartValue > 0 ? 100 - (d.clicks / maxChartValue * 100) : 100}`).join(' L ')}`}
                      fill="none"
                      stroke="#84cc16"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>

                {/* Interaction Layer */}
                <div className="absolute inset-0 flex items-stretch justify-between z-10 w-full h-full pb-6">
                  {chartData.map((d, i) => {
                    const heightPercent = maxChartValue > 0 ? (d.visits / maxChartValue) * 100 : 0;
                    return (
                      <div key={i} className="relative flex-1 group flex flex-col justify-end items-center cursor-pointer">
                        <div className="absolute top-0 bottom-0 w-[1px] bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div
                          className="w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100 absolute transition-opacity shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                          style={{ bottom: `${heightPercent}%` }}
                        />
                        <div dir="rtl" className="absolute bottom-full mb-2 bg-gray-900/95 backdrop-blur border border-white/10 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none transform translate-y-2 group-hover:translate-y-0 whitespace-nowrap z-20 min-w-[120px]">
                          <p className="font-bold text-sm mb-1 border-b border-white/10 pb-1 text-center">{d.label}</p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-right">
                            <span className="text-purple-400">● ביקורים:</span>
                            <span className="font-mono font-bold text-left">{d.visits}</span>
                            <span className="text-blue-400">● צפיות:</span>
                            <span className="font-mono font-bold text-left">{d.views}</span>
                            <span className="text-jungle-lime">● רכישות:</span>
                            <span className="font-mono font-bold text-left">{d.clicks}</span>
                          </div>
                        </div>
                        {(!detailedData || detailedData.range !== '7d' || i % 12 === 0) && (
                          <div className="absolute -bottom-6 left-0 right-0 flex justify-center">
                            <span className="text-[10px] text-gray-500 rotate-0 truncate px-1 whitespace-nowrap">
                              {detailedData?.range === '7d' ? d.label.split(' ')[0] : d.label}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity + Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <RecentActivityFeed />
            </div>
            <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
              <h3 className="text-xl text-white font-bold mb-6">טעוני שיפור ⚠️</h3>
              <p className="text-xs text-gray-500 mb-4">מסיבות עם חשיפה גבוהה אך מעט הקלקות (Low CTR)</p>
              <div className="space-y-4">
                {stats.sortedByViews
                  .filter(p => p.views > 10 && calculateCTR(p.views, p.redirects) < 2)
                  .slice(0, 5)
                  .map(party => (
                    <div key={party.partyId} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-200 truncate">{party.name}</p>
                        <p className="text-xs text-red-300">
                          {party.views} צפיות · {party.redirects} קליקים
                        </p>
                      </div>
                      <div className="text-lg font-bold text-red-500 font-mono">
                        {calculateCTR(party.views, party.redirects).toFixed(1)}%
                      </div>
                    </div>
                  ))
                }
                {stats.sortedByViews.filter(p => p.views > 10 && calculateCTR(p.views, p.redirects) < 2).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">אין כרגע מסיבות עם ביצועים נמוכים חריגים 👏</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* === VISITORS TAB === */}
      {activeTab === 'visitors' && (
        <>
          {/* Range Selector */}
          <div className="flex justify-end">
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              {([['24h', '24 שעות'], ['7d', '7 ימים'], ['30d', '30 ימים']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setVisitorRange(val)}
                  disabled={isLoadingVisitors}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${visitorRange === val
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-gray-400 hover:text-white'
                    } disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isLoadingVisitors && !visitorData ? (
            <div className="p-12 flex justify-center"><LoadingSpinner /></div>
          ) : visitorData ? (
            <>
              {/* Visitor KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  title="סה״כ מבקרים"
                  value={formatNumber(visitorData.total)}
                  subtext={`בטווח ${visitorRange === '24h' ? '24 שעות' : visitorRange === '7d' ? '7 ימים' : '30 ימים'}`}
                  icon={UsersIcon}
                  colorClass="bg-cyan-500"
                />
                <KpiCard
                  title="מכשיר נפוץ"
                  value={visitorData.devices[0]?.label === 'mobile' ? 'מובייל' : visitorData.devices[0]?.label === 'desktop' ? 'מחשב' : visitorData.devices[0]?.label || '-'}
                  subtext={visitorData.devices[0] ? `${visitorData.devices[0].percent}% מהמבקרים` : ''}
                  icon={DeviceIcon}
                  colorClass="bg-indigo-500"
                />
                <KpiCard
                  title="מקור ראשי"
                  value={
                    visitorData.trafficSources[0]?.label === 'direct' ? 'ישיר' :
                      visitorData.trafficSources[0]?.label === 'social' ? 'רשת חברתית' :
                        visitorData.trafficSources[0]?.label === 'organic_search' ? 'חיפוש' :
                          visitorData.trafficSources[0]?.label || '-'
                  }
                  subtext={visitorData.trafficSources[0] ? `${visitorData.trafficSources[0].percent}% מהתנועה` : ''}
                  icon={GlobeIcon}
                  colorClass="bg-emerald-500"
                />
              </div>

              {/* Breakdowns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BreakdownDonut
                  items={visitorData.trafficSources}
                  title="מקורות תנועה"
                  icon={GlobeIcon}
                  colorPalette={['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444']}
                />
                <BreakdownDonut
                  items={visitorData.devices}
                  title="סוגי מכשירים"
                  icon={DeviceIcon}
                  colorPalette={['#10b981', '#6366f1', '#f97316', '#ec4899', '#64748b']}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <BreakdownBars
                  items={visitorData.browsers}
                  title="דפדפנים"
                  icon={GlobeIcon}
                  color="#8b5cf6"
                />
                <BreakdownBars
                  items={visitorData.operatingSystems}
                  title="מערכות הפעלה"
                  icon={DeviceIcon}
                  color="#06b6d4"
                />
                <BreakdownBars
                  items={visitorData.topReferrers}
                  title="דומיינים מפנים"
                  icon={GlobeIcon}
                  color="#f59e0b"
                />
              </div>

              {/* Visitor Log Table */}
              {visitorData.visitors.length > 0 && (
                <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg text-white font-bold flex items-center gap-2">
                      📋 יומן מבקרים אחרון
                    </h3>
                    <button
                      onClick={() => exportVisitorsToCsv(visitorData.visitors)}
                      className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-md border border-white/10 transition whitespace-nowrap"
                    >
                      📥 ייצוא CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs border-b border-white/5">
                          <th className="text-right py-2 px-3">זמן</th>
                          <th className="text-right py-2 px-3">מכשיר</th>
                          <th className="text-right py-2 px-3">דפדפן</th>
                          <th className="text-right py-2 px-3">מערכת</th>
                          <th className="text-right py-2 px-3">מקור</th>
                          <th className="text-right py-2 px-3">הפניה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitorData.visitors.slice(visitorPage * VISITOR_PAGE_SIZE, (visitorPage + 1) * VISITOR_PAGE_SIZE).map((v, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-2 px-3 text-gray-300 font-mono text-xs whitespace-nowrap">
                              {new Date(v.timestamp).toLocaleString('he-IL', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${v.deviceType === 'mobile' ? 'bg-green-500/10 text-green-400' :
                                v.deviceType === 'desktop' ? 'bg-blue-500/10 text-blue-400' :
                                  'bg-gray-500/10 text-gray-400'
                                }`}>
                                {v.deviceType === 'mobile' ? '📱' : v.deviceType === 'desktop' ? '🖥️' : '📟'} {v.deviceType}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-400">{v.browser}</td>
                            <td className="py-2 px-3 text-gray-400">{v.os}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${v.trafficSource === 'social' ? 'bg-purple-500/10 text-purple-400' :
                                v.trafficSource === 'organic_search' ? 'bg-cyan-500/10 text-cyan-400' :
                                  v.trafficSource === 'direct' ? 'bg-gray-500/10 text-gray-400' :
                                    'bg-amber-500/10 text-amber-400'
                                }`}>
                                {v.trafficSource === 'direct' ? 'ישיר' :
                                  v.trafficSource === 'social' ? 'חברתי' :
                                    v.trafficSource === 'organic_search' ? 'חיפוש' :
                                      v.trafficSource}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-500 text-xs truncate max-w-[200px]" title={v.referer}>
                              {v.referer ? new URL(v.referer).hostname : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {visitorData.visitors.length > VISITOR_PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-gray-500 text-xs">
                        מציג {visitorPage * VISITOR_PAGE_SIZE + 1}-{Math.min((visitorPage + 1) * VISITOR_PAGE_SIZE, visitorData.visitors.length)} מתוך {visitorData.visitors.length} מבקרים
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setVisitorPage(p => Math.max(0, p - 1))}
                          disabled={visitorPage === 0}
                          className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-md border border-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          הקודם
                        </button>
                        <button
                          onClick={() => setVisitorPage(p => ((p + 1) * VISITOR_PAGE_SIZE < visitorData.visitors.length ? p + 1 : p))}
                          disabled={(visitorPage + 1) * VISITOR_PAGE_SIZE >= visitorData.visitors.length}
                          className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-md border border-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          הבא
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {/* === PARTIES TAB === */}
      {activeTab === 'parties' && (
        <>
          {/* Top Parties Performance */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-xl text-white font-bold mb-6 flex items-center gap-2">
              <FireIcon className="text-orange-400 w-5 h-5" />
              מובילים בביקוש
            </h3>
            <div className="space-y-6">
              {stats.sortedByViews.slice(0, 12).map(party => (
                <PartyPerformanceRow
                  key={party.partyId}
                  name={party.name}
                  views={party.views}
                  clicks={party.redirects}
                  maxViews={stats.sortedByViews[0].views}
                />
              ))}
              {stats.sortedByViews.length === 0 && (
                <p className="text-gray-500 text-center py-8">אין אירועים פעילים כרגע</p>
              )}
            </div>
          </div>

          {/* All Parties Table - Full Detail */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-lg text-white font-bold flex items-center gap-2">
                📋 כל האירועים - טבלת ביצועים
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={partyTableSearch}
                  onChange={(e) => setPartyTableSearch(e.target.value)}
                  placeholder="חיפוש לפי שם או slug..."
                  className="bg-white/5 border border-white/10 text-gray-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-jungle-accent w-full sm:w-56"
                />
                <button
                  onClick={() => exportPartiesToCsv(filteredPartyTableRows)}
                  disabled={filteredPartyTableRows.length === 0}
                  className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-md border border-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  📥 ייצוא CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-white/5">
                    <th className="text-right py-2 px-3">שם</th>
                    <th className="text-right py-2 px-3">Slug</th>
                    <th className="text-right py-2 px-3">תאריך</th>
                    <th className="text-right py-2 px-3">צפיות</th>
                    <th className="text-right py-2 px-3">קליקים</th>
                    <th className="text-right py-2 px-3">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {partyTablePageRows.map(party => {
                    const ctr = calculateCTR(party.views, party.redirects);
                    return (
                      <tr key={party.partyId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2 px-3 text-gray-200 font-medium truncate max-w-[200px]">{party.name}</td>
                        <td className="py-2 px-3 text-gray-500 font-mono text-xs">{party.slug}</td>
                        <td className="py-2 px-3 text-gray-400 text-xs whitespace-nowrap">
                          {party.date ? new Date(party.date).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="py-2 px-3 text-blue-400 font-mono">{party.views}</td>
                        <td className="py-2 px-3 text-jungle-lime font-mono">{party.redirects}</td>
                        <td className="py-2 px-3">
                          <span className={`font-mono font-bold ${ctr > 5 ? 'text-green-400' : ctr > 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {ctr.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {partyTablePageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">לא נמצאו אירועים תואמים</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredPartyTableRows.length > PARTY_TABLE_PAGE_SIZE && (
              <div className="flex items-center justify-between mt-3">
                <p className="text-gray-500 text-xs">
                  מציג {partyTablePage * PARTY_TABLE_PAGE_SIZE + 1}-{Math.min((partyTablePage + 1) * PARTY_TABLE_PAGE_SIZE, filteredPartyTableRows.length)} מתוך {filteredPartyTableRows.length} אירועים
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPartyTablePage(p => Math.max(0, p - 1))}
                    disabled={partyTablePage === 0}
                    className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-md border border-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    הקודם
                  </button>
                  <button
                    onClick={() => setPartyTablePage(p => ((p + 1) * PARTY_TABLE_PAGE_SIZE < filteredPartyTableRows.length ? p + 1 : p))}
                    disabled={(partyTablePage + 1) * PARTY_TABLE_PAGE_SIZE >= filteredPartyTableRows.length}
                    className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-md border border-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    הבא
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Best Converting vs Needs Improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Best CTR */}
            <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
              <h3 className="text-lg text-white font-bold mb-4">🏆 אלופי ההמרות</h3>
              <p className="text-xs text-gray-500 mb-4">אירועים עם יחס המרה הגבוה ביותר (מינימום 5 צפיות)</p>
              <div className="space-y-3">
                {stats.sortedByCTR.slice(0, 5).map(party => {
                  const ctr = calculateCTR(party.views, party.redirects);
                  return (
                    <div key={party.partyId} className="flex items-center justify-between p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-200 truncate">{party.name}</p>
                        <p className="text-xs text-green-300">
                          {party.views} צפיות · {party.redirects} קליקים
                        </p>
                      </div>
                      <div className="text-lg font-bold text-green-400 font-mono">
                        {ctr.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
                {stats.sortedByCTR.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">אין מספיק נתונים</p>
                )}
              </div>
            </div>

            {/* Low CTR */}
            <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
              <h3 className="text-lg text-white font-bold mb-4">⚠️ טעוני שיפור</h3>
              <p className="text-xs text-gray-500 mb-4">אירועים עם חשיפה גבוהה אך יחס המרה נמוך</p>
              <div className="space-y-3">
                {stats.sortedByViews
                  .filter(p => p.views > 10 && calculateCTR(p.views, p.redirects) < 2)
                  .slice(0, 5)
                  .map(party => (
                    <div key={party.partyId} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-200 truncate">{party.name}</p>
                        <p className="text-xs text-red-300">
                          {party.views} צפיות · {party.redirects} קליקים
                        </p>
                      </div>
                      <div className="text-lg font-bold text-red-500 font-mono">
                        {calculateCTR(party.views, party.redirects).toFixed(1)}%
                      </div>
                    </div>
                  ))
                }
                {stats.sortedByViews.filter(p => p.views > 10 && calculateCTR(p.views, p.redirects) < 2).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">אין כרגע אירועים עם ביצועים נמוכים חריגים 👏</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalytics;
