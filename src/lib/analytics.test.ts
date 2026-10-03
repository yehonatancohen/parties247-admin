import { describe, expect, it } from 'vitest';
import { FUNNEL_WINDOW_DAYS, indexSalesByParty, mergePartyRows, monthTotals } from './analytics';
import type { FunnelResponse, PartyFunnelRow, PartySalesRecord } from '../data/types';

const funnelRow = (over: Partial<PartyFunnelRow>): PartyFunnelRow => ({
  partyId: 'p1', accountIds: ['account2'], name: 'party', slug: 'party', date: '2026-10-01T23:00:00',
  views: 0, redirects: 0, purchases: 0, revenue: 0,
  viewToRedirectRate: null, redirectToPurchaseRate: null,
  realGoOutViews: null, realGoOutRevenue: null,
  ...over,
});

const funnel = (rows: PartyFunnelRow[]): FunnelResponse => ({
  siteWide: { ...funnelRow({}), windowDays: FUNNEL_WINDOW_DAYS, realMonth: 'all' },
  byParty: rows,
  realMonthsAvailable: [],
});

const sale = (over: Partial<PartySalesRecord>): PartySalesRecord => ({
  goOutEventId: 'e1', accountId: 'account2', partyId: 'p1', partyName: 'party', partySlug: 'party',
  partyDate: '2026-10-01T23:00:00', eventName: 'party', confirmedTickets: 6, pendingTickets: 0,
  totalRevenue: 60, totalTicketsSold: 6,
  realViews: null, realTotalRevenue: null, realOwnRevenue: null, realSalesPerDate: {}, realBuyerCount: 0,
  ...over,
} as PartySalesRecord);

describe('funnel window', () => {
  it('always asks for the API maximum so clicks span the same period as lifetime tickets', () => {
    expect(FUNNEL_WINDOW_DAYS).toBe(180);
  });
});

describe('mergePartyRows', () => {
  const sales = indexSalesByParty([sale({})]);

  it('pairs lifetime tickets with the clicks the funnel returned for that party', () => {
    const rows = mergePartyRows(funnel([funnelRow({ views: 30, redirects: 7, purchases: 6, revenue: 60 })]), sales, '2026-10');
    expect(rows).toHaveLength(1);
    expect(rows[0].redirects).toBe(7);
    expect(rows[0].totalTicketsSold).toBe(6);
    expect(rows[0].lifetimeCommission).toBe(60);
  });

  it('filters by the month of the event date, not by when activity happened', () => {
    const f = funnel([
      funnelRow({ partyId: 'p1', views: 5, redirects: 2 }),
      funnelRow({ partyId: 'p2', date: '2026-09-18T23:00:00', views: 5, redirects: 4 }),
    ]);
    expect(mergePartyRows(f, sales, '2026-10').map(r => r.partyId)).toEqual(['p1']);
    expect(mergePartyRows(f, sales, 'all').map(r => r.partyId)).toEqual(['p1', 'p2']);
  });

  it('drops rows with no activity and no GoOut data', () => {
    expect(mergePartyRows(funnel([funnelRow({})]), {}, 'all')).toEqual([]);
  });

  it('returns nothing before the funnel has loaded', () => {
    expect(mergePartyRows(null, sales, 'all')).toEqual([]);
  });
});

describe('monthTotals', () => {
  it('prefers lifetime tickets/commission and sums clicks and views', () => {
    const rows = mergePartyRows(
      funnel([
        funnelRow({ partyId: 'p1', views: 30, redirects: 7, purchases: 2, revenue: 20 }),
        funnelRow({ partyId: 'p2', views: 10, redirects: 1, purchases: 3, revenue: 30 }),
      ]),
      indexSalesByParty([sale({})]),
      '2026-10',
    );
    expect(monthTotals(rows)).toMatchObject({ tickets: 9, commission: 90, clicks: 8, views: 40 });
  });
});
