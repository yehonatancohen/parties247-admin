"use client";
import React from 'react';
import { FunnelResponse, RecentActivityEvent } from '../../data/types';
import { formatNumber, relativeTimeHe } from '../../lib/analytics';
import { InkKey, Skeleton } from './ui';

export type Period = '1' | '7' | '30';

export const PERIOD_LABEL: Record<Period, string> = {
  '1': '24 השעות האחרונות',
  '7': '7 הימים האחרונים',
  '30': '30 הימים האחרונים',
};

const nf = new Intl.NumberFormat('en-US');

const SalesHero: React.FC<{
  period: Period;
  funnel: FunnelResponse | null;
  loading: boolean;
  lastSale: RecentActivityEvent | null;
}> = ({ period, funnel, loading, lastSale }) => {
  const s = funnel?.siteWide;
  const tickets = s?.purchases ?? 0;

  return (
    <section aria-label="מכירות" className="pt-2 pb-1">
      <p className="text-[15px] text-ink-dim">כרטיסים שנמכרו · {PERIOD_LABEL[period]}</p>
      {!s ? (
        loading ? <Skeleton className="h-[88px] w-48 mt-2" /> : <p className="text-ink-dim mt-3">אין נתונים כרגע. נסה לרענן.</p>
      ) : (
        <>
          <div className="flex items-end gap-x-6 gap-y-1 flex-wrap mt-1">
            <p className={`font-extrabold leading-[0.95] tracking-tight text-[88px] sm:text-[120px] ${tickets > 0 ? 'text-ink-sales' : 'text-ink-dim'}`}>
              {nf.format(tickets)}
            </p>
            <div className="pb-2 sm:pb-4">
              <p className="text-[15px] text-ink-dim">עמלה שלנו</p>
              <p className="text-3xl font-bold text-white leading-none mt-1">₪{nf.format(Math.round(s.revenue))}</p>
            </div>
          </div>

          {tickets === 0 && (
            <p className="text-[15px] text-ink-dim mt-2">עוד לא נמכרו כרטיסים ב{PERIOD_LABEL[period]}.</p>
          )}

          <dl className="grid grid-cols-3 gap-x-4 mt-5 border-t border-wood-brown pt-4">
            <div>
              <dt className="flex items-center gap-2 text-[13px] text-ink-dim"><InkKey ink="view" />צפיות במסיבות</dt>
              <dd className="text-2xl font-bold text-white mt-1">{formatNumber(s.views)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-[13px] text-ink-dim"><InkKey ink="click" />קליקים</dt>
              <dd className="text-2xl font-bold text-white mt-1">{formatNumber(s.redirects)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-dim">צפייה ← קליק</dt>
              <dd className="text-2xl font-bold text-white mt-1">{s.viewToRedirectRate != null ? `${s.viewToRedirectRate.toFixed(1)}%` : '—'}</dd>
            </div>
          </dl>
          <p className="text-[13px] text-ink-dim mt-3">קליק אינו מכירה: מכירה נספרת רק אחרי אישור מ-GoOut&rlm;.</p>
        </>
      )}

      {lastSale && (
        <p className="mt-4 text-[15px] text-jungle-text border-t border-wood-brown pt-3">
          <span className="text-ink-sales font-bold">המכירה האחרונה</span>{' '}
          {relativeTimeHe(lastSale.timestamp)}{lastSale.partyName ? ` · ${lastSale.partyName}` : ''}
        </p>
      )}
    </section>
  );
};

export default SalesHero;
