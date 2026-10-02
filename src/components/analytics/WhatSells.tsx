"use client";
import React from 'react';
import { MergedPartyRow, formatNumber } from '../../lib/analytics';
import { Panel, Skeleton } from './ui';

const WhatSells: React.FC<{ rows: MergedPartyRow[]; loading: boolean }> = ({ rows, loading }) => {
  const top = [...rows]
    .filter(r => (r.totalTicketsSold ?? r.purchases) > 0)
    .sort((a, b) => (b.totalTicketsSold ?? b.purchases) - (a.totalTicketsSold ?? a.purchases)
      || (b.lifetimeCommission ?? b.revenue) - (a.lifetimeCommission ?? a.revenue))
    .slice(0, 5);
  const max = Math.max(1, ...top.map(r => r.totalTicketsSold ?? r.purchases));

  return (
    <Panel title="איזו מסיבה מוכרת">
      {loading && rows.length === 0 ? (
        <Skeleton className="h-40 w-full" />
      ) : top.length === 0 ? (
        <p className="text-ink-dim">אין עדיין מכירות לתקופה הזו.</p>
      ) : (
        <ol className="space-y-4">
          {top.map(r => {
            const t = r.totalTicketsSold ?? r.purchases;
            return (
              <li key={r.partyId}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[16px] font-medium text-white truncate">{r.name || 'מסיבה ללא שם'}</span>
                  <span className="shrink-0 text-ink-sales font-bold text-xl">{t}</span>
                </div>
                <div className="h-2.5 mt-1 bg-ink-cell">
                  <div className="h-full bg-ink-sales" style={{ width: `${(t / max) * 100}%` }} />
                </div>
                <p className="text-[13px] text-ink-dim mt-1">עמלה ₪{formatNumber(r.lifetimeCommission ?? r.revenue)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
};

export default WhatSells;
