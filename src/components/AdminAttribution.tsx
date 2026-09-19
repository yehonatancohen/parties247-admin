"use client";

import React, { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { getAttribution, AttributionResponse } from '../services/api';

const CHANNEL_LABELS: Record<string, string> = {
  direct: 'ישיר / לא ידוע',
  google: 'גוגל',
  other_search: 'מנועי חיפוש אחרים',
  instagram: 'אינסטגרם',
  facebook: 'פייסבוק',
  tiktok: 'טיקטוק',
  telegram: 'טלגרם',
  whatsapp: 'וואטסאפ',
  twitter: 'טוויטר / X',
  ai_assistant: 'עוזרי AI',
  referral: 'אתרים אחרים',
  untracked: 'לפני תחילת המעקב',
};

const money = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;
const pct = (n: number | null) => (n === null ? '-' : `${(n * 100).toFixed(1)}%`);

const AdminAttribution: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AttributionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    getAttribution(days)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [days]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <LoadingSpinner />;

  const totalRevenue = data.channels.reduce((sum, c) => sum + c.estRevenue, 0);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">מאיפה מגיעים הקונים</h1>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-md bg-gray-800 px-3 py-1.5 text-sm">
          {[7, 30, 90].map((d) => <option key={d} value={d}>{d} ימים</option>)}
        </select>
      </div>

      <p className="text-sm text-gray-400">
        ההכנסה לפי ערוץ היא <b>הערכה</b>: העמלה של כל אירוע מחולקת לפי היחס בין ערוצי הלחיצות לרכישה באותו אירוע.
        גו-אאוט לא מספקת מקור לכל הזמנה.
        {data.trackingSince
          ? ` המעקב לפי מקור פעיל מ-${new Date(data.trackingSince).toLocaleDateString('he-IL')}; נתונים קודמים מסומנים "לפני תחילת המעקב".`
          : ' המעקב לפי מקור עדיין לא התחיל לצבור נתונים.'}
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-right">
            <tr>
              <th className="p-3">ערוץ</th>
              <th className="p-3">צפיות (סשנים)</th>
              <th className="p-3">לחיצות לרכישה (סשנים)</th>
              <th className="p-3">שיעור מעבר</th>
              <th className="p-3">הכנסה משוערת</th>
              <th className="p-3">נתח</th>
            </tr>
          </thead>
          <tbody>
            {data.channels.map((c) => (
              <tr key={c.channel} className="border-t border-gray-700">
                <td className="p-3 font-semibold">{CHANNEL_LABELS[c.channel] ?? c.channel}</td>
                <td className="p-3">{c.viewSessions}</td>
                <td className="p-3">{c.redirectSessions}</td>
                <td className="p-3">{pct(c.clickOutRate)}</td>
                <td className="p-3">{money(c.estRevenue)}</td>
                <td className="p-3">{totalRevenue > 0 ? `${Math.round((c.estRevenue / totalRevenue) * 100)}%` : '-'}</td>
              </tr>
            ))}
            {data.channels.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400">אין נתונים בטווח הזה.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data.unattributedRevenue > 0 && (
        <p className="text-sm text-gray-400">
          {money(data.unattributedRevenue)} הכנסה מאירועים ללא לחיצות מעקב בטווח (לא משויכת לערוץ).
        </p>
      )}
    </div>
  );
};

export default AdminAttribution;
