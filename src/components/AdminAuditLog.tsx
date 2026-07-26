"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { getAuditLog } from '../services/api';
import { AuditLogEntry } from '../data/types';
import LoadingSpinner from './LoadingSpinner';

const PAGE_SIZE = 30;

const ACTION_LABELS: Record<string, string> = {
    add_party: 'הוספת אירוע',
    clone_party: 'שכפול אירוע',
    delete_party: 'מחיקת אירוע',
    update_party: 'עדכון אירוע',
    add_carousel: 'הוספת קרוסלה',
    update_carousel: 'עדכון קרוסלה',
    update_carousel_parties: 'עדכון אירועים בקרוסלה',
    delete_carousel: 'מחיקת קרוסלה',
    reorder_carousels: 'סידור מחדש של קרוסלות',
    reorder_tag: 'סידור מחדש של תגית',
    rename_tag: 'שינוי שם תגית',
    rename_carousel: 'שינוי שם קרוסלה',
    update_section: 'עדכון סקשן',
    reorder_sections: 'סידור מחדש של סקשנים',
    add_section: 'הוספת סקשן',
    import_carousel_from_urls: 'ייבוא אירועים מקישורים',
    set_referral: 'עדכון קוד הפניה',
    manual_price_scan: 'סריקת מחירים ידנית',
    goout_approve: 'אישור אירוע Go-Out',
    goout_reject: 'דחיית אירוע Go-Out',
    goout_edit_approve: 'עריכה ואישור אירוע Go-Out',
};

const actionLabel = (action: string) => ACTION_LABELS[action] || action;

const AdminAuditLog: React.FC = () => {
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchPage = useCallback(async (offset: number) => {
        return getAuditLog({ limit: PAGE_SIZE, offset });
    }, []);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);
        fetchPage(0)
            .then((data) => {
                if (cancelled) return;
                setEntries(data.entries);
                setHasMore(data.hasMore);
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'שגיאה בטעינת יומן הפעולות');
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [fetchPage]);

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        try {
            const data = await fetchPage(entries.length);
            setEntries((prev) => [...prev, ...data.entries]);
            setHasMore(data.hasMore);
        } catch (err) {
            console.error('Failed to load more audit entries', err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    return (
        <div className="bg-jungle-surface border border-wood-brown rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl text-jungle-text font-bold flex items-center gap-2">
                    🛡️ יומן פעולות ניהול
                </h3>
            </div>
            <p className="text-xs text-jungle-text/60 mb-4">
                מעקב אחר שינויים שבוצעו בפאנל הניהול. זיהוי המבצע מבוסס על כתובת IP בלבד — למערכת אין כניסה אישית לכל מנהל.
            </p>

            {isLoading ? (
                <div className="p-6 flex justify-center"><LoadingSpinner /></div>
            ) : error ? (
                <div className="p-4 bg-red-500/10 text-red-300 rounded-xl border border-red-500/30 text-sm">{error}</div>
            ) : entries.length === 0 ? (
                <div className="p-6 text-center text-jungle-text/50">אין פעולות רשומות עדיין</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-jungle-text/50 text-xs border-b border-wood-brown">
                                    <th className="text-right py-2 px-3">זמן</th>
                                    <th className="text-right py-2 px-3">פעולה</th>
                                    <th className="text-right py-2 px-3">יעד</th>
                                    <th className="text-right py-2 px-3">IP</th>
                                    <th className="text-right py-2 px-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <React.Fragment key={entry.id}>
                                        <tr className="border-b border-wood-brown/50 hover:bg-white/5 transition-colors">
                                            <td className="py-2 px-3 text-jungle-text/60 font-mono text-xs whitespace-nowrap">
                                                {new Date(entry.timestamp).toLocaleString('he-IL', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                                                })}
                                            </td>
                                            <td className="py-2 px-3 text-jungle-text font-medium">{actionLabel(entry.action)}</td>
                                            <td className="py-2 px-3 text-jungle-text/60 text-xs">
                                                {entry.targetType || '-'}
                                                {entry.targetId && <span className="text-jungle-text/40 font-mono"> · {entry.targetId}</span>}
                                            </td>
                                            <td className="py-2 px-3 text-jungle-text/60 font-mono text-xs">{entry.ip || '-'}</td>
                                            <td className="py-2 px-3 text-left">
                                                {entry.details && (
                                                    <button
                                                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                                        className="text-xs text-jungle-lime hover:underline"
                                                    >
                                                        {expandedId === entry.id ? 'הסתר' : 'פרטים'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedId === entry.id && entry.details && (
                                            <tr className="bg-white/5">
                                                <td colSpan={5} className="py-2 px-3">
                                                    <pre className="text-xs text-jungle-text/60 whitespace-pre-wrap break-words font-mono">
                                                        {JSON.stringify(entry.details, null, 2)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {hasMore && (
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="px-4 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-jungle-text/70 rounded-lg border border-wood-brown transition disabled:opacity-50"
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

export default AdminAuditLog;
