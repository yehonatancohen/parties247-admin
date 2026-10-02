"use client";
import React from 'react';
import { FunnelResponse } from '../../data/types';
import { formatNumber } from '../../lib/analytics';
import { InkKey, Panel, Skeleton } from './ui';
import { Period, PERIOD_LABEL } from './SalesHero';

const WhatSells: React.FC<{ funnel: FunnelResponse | null; loading: boolean; period: Period }> = ({ funnel, loading, period }) => {
  if (!funnel) {
    return (
      <Panel title="איזו מסיבה מוכרת">
        {loading ? <Skeleton className="h-40 w-full" /> : <p className="text-ink-dim">אין נתונים כרגע.</p>}
      </Panel>
    );
  }
  const sellers = funnel.byParty
    .filter(r => r.purchases > 0)
    .sort((a, b) => b.purchases - a.purchases || b.revenue - a.revenue)
    .slice(0, 8);
  const maxTickets = Math.max(1, ...sellers.map(r => r.purchases));
  // Clicks with zero confirmed sales in the window: where traffic goes but nothing lands.
  const stuck = funnel.byParty
    .filter(r => r.purchases === 0 && r.redirects >= 3)
    .sort((a, b) => b.redirects - a.redirects)
    .slice(0, 5);

  return (
    <Panel title="איזו מסיבה מוכרת" note={`כרטיסים מאושרים ב${PERIOD_LABEL[period]}, ועמלה שלנו.`}>
      {sellers.length === 0 ? (
        <p className="text-ink-dim py-3">אין מכירות מאושרות בטווח הזה.</p>
      ) : (
        <ol className="space-y-4">
          {sellers.map(r => (
            <li key={r.partyId}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[16px] font-medium text-white truncate">{r.name || 'מסיבה ללא שם'}</span>
                <span className="shrink-0 text-ink-sales font-extrabold text-xl">{r.purchases}</span>
              </div>
              <div className="h-3 mt-1 bg-ink-cell">
                <div className="h-full bg-ink-sales" style={{ width: `${(r.purchases / maxTickets) * 100}%` }} />
              </div>
              <p className="text-[13px] text-ink-dim mt-1">
                עמלה ₪{formatNumber(r.revenue)} · {r.accountIds.length ? r.accountIds.join(' + ') : 'ללא חשבון'} · {formatNumber(r.redirects)} קליקים
              </p>
            </li>
          ))}
        </ol>
      )}

      {stuck.length > 0 && (
        <div className="mt-6 pt-4 border-t border-wood-brown">
          <h4 className="text-[15px] font-bold text-white">קליקים בלי מכירה</h4>
          <p className="text-[13px] text-ink-dim mt-1 mb-3">מסיבות שמקבלות קליקים ל-GoOut אבל אין להן אף מכירה מאושרת בטווח.</p>
          <ul className="space-y-2">
            {stuck.map(r => (
              <li key={r.partyId} className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="truncate text-jungle-text">{r.name || 'מסיבה ללא שם'}</span>
                <span className="shrink-0 inline-flex items-center gap-2 text-white font-bold"><InkKey ink="click" />{r.redirects}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
};

export default WhatSells;
