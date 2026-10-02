"use client";
import React from 'react';
import { RecentActivityEvent } from '../../data/types';
import { formatMonthLabel, relativeTimeHe } from '../../lib/analytics';
import { Skeleton } from './ui';

const nf = new Intl.NumberFormat('en-US');

const SalesHero: React.FC<{
  month: string;
  totals: { tickets: number; commission: number; clicks: number } | null;
  loading: boolean;
  lastSale: RecentActivityEvent | null;
}> = ({ month, totals, loading, lastSale }) => (
  <section aria-label="מכירות" className="pt-2">
    <p className="text-[15px] text-ink-dim">
      כרטיסים שנמכרו למסיבות של {month === 'all' ? 'כל התקופה' : formatMonthLabel(month)}
    </p>
    {!totals ? (
      loading ? <Skeleton className="h-[84px] w-40 mt-2" /> : <p className="text-ink-dim mt-3">אין נתונים כרגע. נסה לרענן.</p>
    ) : (
      <div className="flex items-end gap-x-8 gap-y-2 flex-wrap mt-1">
        <p className="font-bold leading-none tracking-tight text-[84px] sm:text-[104px] text-ink-sales">{nf.format(totals.tickets)}</p>
        <div className="pb-1 sm:pb-3">
          <p className="text-[15px] text-ink-dim">עמלה שלנו</p>
          <p className="text-3xl font-bold text-white leading-none mt-1">₪{nf.format(Math.round(totals.commission))}</p>
        </div>
      </div>
    )}
    {totals && (
      <p className="text-[15px] text-ink-dim mt-3">{nf.format(totals.clicks)} קליקים ל-GoOut. קליק אינו מכירה.</p>
    )}
    {lastSale && (
      <p className="mt-3 text-[15px] text-jungle-text">
        המכירה האחרונה: {relativeTimeHe(lastSale.timestamp)}{lastSale.partyName ? ` · ${lastSale.partyName}` : ''}
      </p>
    )}
  </section>
);

export default SalesHero;
