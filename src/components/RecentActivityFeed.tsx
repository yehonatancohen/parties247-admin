"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getRecentActivity } from '../services/api';
import { RecentActivityEvent } from '../data/types';
import LoadingSpinner from './LoadingSpinner';
import { TicketIcon } from './Icons';

// Use a simple icon for generic visits if not available in Icons
const GlobeIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m-15.686 0A8.959 8.959 0 013 12c0-.778.099-1.533.284-2.253m0 0A11.959 11.959 0 013 12a11.959 11.959 0 01-2.917-8.192" />
    </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

type ActivityFilter = 'all' | 'purchase' | 'view' | 'visit';
type DeviceFilter = 'all' | 'mobile' | 'desktop' | 'tablet';
type SourceFilter = 'all' | 'direct' | 'organic_search' | 'social' | 'referral';
type RangeFilter = '24h' | '7d' | '30d';

const PAGE_SIZE = 20;

const RANGE_TO_HOURS: Record<RangeFilter, number> = {
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
};

const TYPE_FILTERS: { key: ActivityFilter; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'purchase', label: 'רכישות' },
    { key: 'view', label: 'צפיות' },
    { key: 'visit', label: 'ביקורים' },
];

const RANGE_FILTERS: { key: RangeFilter; label: string }[] = [
    { key: '24h', label: '24 שעות' },
    { key: '7d', label: '7 ימים' },
    { key: '30d', label: '30 ימים' },
];

const DEVICE_OPTIONS: { value: DeviceFilter; label: string }[] = [
    { value: 'all', label: 'כל המכשירים' },
    { value: 'mobile', label: 'מובייל' },
    { value: 'desktop', label: 'מחשב' },
    { value: 'tablet', label: 'טאבלט' },
];

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
    { value: 'all', label: 'כל המקורות' },
    { value: 'direct', label: 'ישיר' },
    { value: 'organic_search', label: 'חיפוש אורגני' },
    { value: 'social', label: 'רשתות חברתיות' },
    { value: 'referral', label: 'הפניה' },
];

const RecentActivityFeed: React.FC = () => {
    const [events, setEvents] = useState<RecentActivityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [filter, setFilter] = useState<ActivityFilter>('all');
    const [device, setDevice] = useState<DeviceFilter>('all');
    const [source, setSource] = useState<SourceFilter>('all');
    const [range, setRange] = useState<RangeFilter>('24h');

    const filtersRef = useRef({ filter, device, source, range });
    filtersRef.current = { filter, device, source, range };
    const eventCountRef = useRef(events.length);
    eventCountRef.current = events.length;

    const fetchEvents = useCallback(async (
        f: { filter: ActivityFilter; device: DeviceFilter; source: SourceFilter; range: RangeFilter },
        offset: number,
        limit: number = PAGE_SIZE,
    ) => {
        const data = await getRecentActivity({
            types: f.filter === 'all' ? undefined : [f.filter],
            devices: f.device === 'all' ? undefined : [f.device],
            sources: f.source === 'all' ? undefined : [f.source],
            hours: RANGE_TO_HOURS[f.range],
            limit,
            offset,
        });
        return data;
    }, []);

    // Initial load + refetch whenever any filter changes
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchEvents({ filter, device, source, range }, 0)
            .then((data) => {
                if (cancelled) return;
                setEvents(data.events);
                setHasMore(data.hasMore);
            })
            .catch((error) => console.error("Error fetching recent activity:", error))
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [filter, device, source, range, fetchEvents]);

    // Poll every 30 seconds, re-fetching however many pages the user has already loaded
    useEffect(() => {
        const interval = setInterval(() => {
            const currentCount = Math.max(PAGE_SIZE, eventCountRef.current);
            fetchEvents(filtersRef.current, 0, currentCount)
                .then((data) => {
                    setEvents(data.events);
                    setHasMore(data.hasMore);
                })
                .catch((error) => console.error("Error polling recent activity:", error));
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchEvents]);

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        try {
            const data = await fetchEvents({ filter, device, source, range }, events.length);
            setEvents((prev) => [...prev, ...data.events]);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error("Error loading more activity:", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const selectClass = "bg-white/5 border border-white/10 text-gray-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-jungle-accent";

    return (
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full">
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-xl text-white font-bold flex items-center gap-2">
                        📡 פעילות אחרונה
                    </h3>
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 self-start">
                        {RANGE_FILTERS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setRange(key)}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${range === key
                                    ? 'bg-white/10 text-white font-medium shadow-sm'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
                        {TYPE_FILTERS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${filter === key
                                    ? 'bg-white/10 text-white font-medium shadow-sm'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <select value={device} onChange={(e) => setDevice(e.target.value as DeviceFilter)} className={selectClass}>
                        {DEVICE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <select value={source} onChange={(e) => setSource(e.target.value as SourceFilter)} className={selectClass}>
                        {SOURCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="p-6 flex justify-center"><LoadingSpinner /></div>
            ) : events.length === 0 ? (
                <div className="p-6 text-center text-gray-500">אין פעילות התואמת את הסינון</div>
            ) : (
                <>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {events.map((event) => (
                            <div key={event.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                <div className={`mt-1 p-2 rounded-full ${event.type === 'purchase' ? 'bg-jungle-lime/20 text-jungle-lime' :
                                    event.type === 'view' ? 'bg-blue-500/20 text-blue-500' :
                                        'bg-purple-500/20 text-purple-500'
                                    }`}>
                                    {event.type === 'purchase' && <TicketIcon className="w-4 h-4" />}
                                    {event.type === 'view' && <EyeIcon className="w-4 h-4" />}
                                    {event.type === 'visit' && <GlobeIcon className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-medium text-gray-200 truncate">
                                            {event.type === 'purchase' ? 'רכישת כרטיס' :
                                                event.type === 'view' ? 'צפייה במסיבה' : 'ביקור באתר'}
                                        </p>
                                        <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                                            {new Date(event.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {event.partyName && (
                                        <p className="text-xs text-blue-300 mt-0.5 truncate">{event.partyName}</p>
                                    )}
                                    {event.details && (
                                        <p className="text-xs text-gray-500 mt-1">{event.details}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {hasMore && (
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="px-4 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition disabled:opacity-50"
                            >
                                {isLoadingMore ? <LoadingSpinner size="sm" /> : 'טען עוד'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RecentActivityFeed;
