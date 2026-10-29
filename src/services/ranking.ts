// Site ranking + per-party commission deals. The backend (promo.rank_parties)
// orders the website by expected ₪ per page view = our ₪ per ticket x how
// likely a visitor is to buy; this is the admin's view of it.

/* eslint-disable @typescript-eslint/no-explicit-any -- raw API JSON, normalised below */

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://parties247-backend.onrender.com/api';

const JWT_TOKEN_STORAGE = 'jwtAuthToken';

export type CommissionType = 'fixed' | 'percent';

export interface CommissionDeal {
  type: CommissionType;
  /** ₪ per ticket (fixed) or % of the ticket price (percent). */
  value: number;
}

export interface RankedParty {
  partyId: string;
  name: string;
  slug: string;
  date: string | null;
  imageUrl: string | null;
  tier: 'account1' | 'account2';
  commission: CommissionDeal | null;
  perTicket: number;
  perTicketEstimated: boolean;
  ticketPrice: number | null;
  soldOut: boolean;
  views: number;
  redirects: number;
  tickets: number;
  ticketsPer100Views: number;
  /** Expected ₪ per 100 page views. */
  score: number;
  rankScore: number;
  position: number;
}

export interface RankingResponse {
  generatedAt: string | null;
  defaults: { account1FlatFee: number; account2Percent: number };
  parties: RankedParty[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem(JWT_TOKEN_STORAGE);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  let data: any = null;
  try { data = await response.json(); } catch { /* handled below */ }
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data as T;
}

const num = (v: any, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

const normalizeDeal = (c: any): CommissionDeal | null =>
  c && (c.type === 'fixed' || c.type === 'percent') && typeof c.value === 'number' ? { type: c.type, value: c.value } : null;

export const getRanking = async (): Promise<RankingResponse> => {
  const data = await request<any>('/admin/ranking');
  return {
    generatedAt: data?.generatedAt ?? null,
    defaults: {
      account1FlatFee: num(data?.defaults?.account1FlatFee, 15),
      account2Percent: num(data?.defaults?.account2Percent, 6),
    },
    parties: (Array.isArray(data?.parties) ? data.parties : []).map((p: any): RankedParty => ({
      partyId: String(p?.partyId ?? ''),
      name: String(p?.name ?? ''),
      slug: String(p?.slug ?? ''),
      date: p?.date ?? null,
      imageUrl: p?.imageUrl ?? null,
      tier: p?.tier === 'account1' ? 'account1' : 'account2',
      commission: normalizeDeal(p?.commission),
      perTicket: num(p?.perTicket),
      perTicketEstimated: Boolean(p?.perTicketEstimated),
      ticketPrice: typeof p?.ticketPrice === 'number' ? p.ticketPrice : null,
      soldOut: Boolean(p?.soldOut),
      views: num(p?.views),
      redirects: num(p?.redirects),
      tickets: num(p?.tickets),
      ticketsPer100Views: num(p?.ticketsPer100Views),
      score: num(p?.score),
      rankScore: num(p?.rankScore),
      position: num(p?.position),
    })),
  };
};

/** `null` returns the party to its account's default deal. */
export const setPartyCommission = (partyId: string, deal: CommissionDeal | null) =>
  request<{ message: string; commission: CommissionDeal | null }>(`/admin/parties/${partyId}/commission`, {
    method: 'PUT',
    body: JSON.stringify(deal ?? { type: null }),
  });
