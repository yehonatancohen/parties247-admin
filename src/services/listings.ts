// Listing Guard: the backend's single pipeline for what a listing says
// (price, name, location, duplicates). Rules live in parties247_backend's
// listings.py; this file is only the admin's view of its review queue.

/* eslint-disable @typescript-eslint/no-explicit-any -- raw API JSON, normalised into the types below */

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://parties247-backend.onrender.com/api';

const JWT_TOKEN_STORAGE = 'jwtAuthToken';

const authHeader = (): Record<string, string> => {
  if (typeof localStorage === 'undefined') return {};
  const token = localStorage.getItem(JWT_TOKEN_STORAGE);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export type IssueType =
  | 'duplicate'
  | 'zero_tier'
  | 'location_vague'
  | 'title_date'
  | 'test_listing'
  | 'price_suspicious'
  | 'source_gone'
  | 'price_unverified'
  | 'stale_sync'
  | 'site_render';

export interface ListingTier {
  name: string;
  price: number;
  final: number | null;
  display: string;
}

export interface ListingPriceInfo {
  from: number | null;
  hasFree: boolean;
  freeLabel: string | null;
  onlyFree: boolean;
  salesState: 'on_sale' | 'coming_soon' | 'sold_out' | 'closed';
  verified: boolean;
}

export interface ListingCard {
  id: string;
  name: string;
  slug: string;
  date: string | null;
  location: string | null;
  imageUrl: string | null;
  account: 'account1' | 'account2';
  commission: number;
  ticketPrice: number | null;
  soldOut: boolean;
  priceInfo: ListingPriceInfo | null;
  listingStatus: 'live' | 'hidden' | 'merged' | null;
  statusReason: string | null;
  locks: string[];
  canonicalUrl: string | null;
  source: {
    title: string | null;
    startsAt: string | null;
    address: string | null;
    englishAddress: string | null;
    producersName: string | null;
    publicity: string | null;
    tiers: ListingTier[] | null;
    fetchedAt: string | null;
  };
}

export interface ListingIssue {
  id: string;
  type: IssueType;
  status: 'open' | 'resolved' | 'ignored' | 'auto_fixed';
  summary: string;
  evidence: Record<string, any>;
  suggestion: { keeperId: string; why: 'account1' | 'revenue' | 'older' } | null;
  firstSeen: string | null;
  lastSeen: string | null;
  parties: ListingCard[];
}

export interface ListingAuditRun {
  at: string;
  checked: number;
  waiting: number;
  new: number;
  merged: number;
  siteChecked: number;
}

export interface ListingIssuesResponse {
  issues: ListingIssue[];
  waiting: number;
  lastAudit: ListingAuditRun | null;
}

export interface ListingChange {
  partyId: string;
  partyName: string | null;
  field: string;
  old: unknown;
  new: unknown;
  reason: string | null;
  at: string | null;
}

export type IssueDecision =
  | { decision: 'keep'; keeperId: string; remember: boolean }
  | { decision: 'different'; remember: boolean }
  | { decision: 'free' | 'not_free' | 'ignore' | 'hide' }
  | { decision: 'set'; location: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(init?.headers || {}) },
  });
  let data: any = null;
  try { data = await response.json(); } catch { /* handled below */ }
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data as T;
}

const normalizeCard = (c: any): ListingCard => ({
  id: String(c?.id ?? ''),
  name: String(c?.name ?? ''),
  slug: String(c?.slug ?? ''),
  date: c?.date ?? null,
  location: c?.location ?? null,
  imageUrl: c?.imageUrl ?? null,
  account: c?.account === 'account1' ? 'account1' : 'account2',
  commission: typeof c?.commission === 'number' ? c.commission : 0,
  ticketPrice: typeof c?.ticketPrice === 'number' ? c.ticketPrice : null,
  soldOut: Boolean(c?.soldOut),
  priceInfo: c?.priceInfo ?? null,
  listingStatus: c?.listingStatus ?? 'live',
  statusReason: c?.statusReason ?? null,
  locks: Array.isArray(c?.locks) ? c.locks : [],
  canonicalUrl: c?.canonicalUrl ?? null,
  source: {
    title: c?.source?.title ?? null,
    startsAt: c?.source?.startsAt ?? null,
    address: c?.source?.address ?? null,
    englishAddress: c?.source?.englishAddress ?? null,
    producersName: c?.source?.producersName ?? null,
    publicity: c?.source?.publicity ?? null,
    tiers: Array.isArray(c?.source?.tiers) ? c.source.tiers : null,
    fetchedAt: c?.source?.fetchedAt ?? null,
  },
});

export const getListingIssues = async (status: 'open' | 'auto_fixed' | 'all' = 'open'): Promise<ListingIssuesResponse> => {
  const data = await request<any>(`/admin/listings/issues?status=${status}`);
  return {
    issues: (Array.isArray(data.issues) ? data.issues : []).map((i: any) => ({
      ...i,
      evidence: i.evidence ?? {},
      suggestion: i.suggestion ?? null,
      parties: (Array.isArray(i.parties) ? i.parties : []).map(normalizeCard),
    })),
    waiting: Number(data.waiting) || 0,
    lastAudit: data.lastAudit ?? null,
  };
};

export const resolveListingIssue = (issueId: string, decision: IssueDecision) =>
  request<{ message: string; waiting: number }>(`/admin/listings/issues/${issueId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(decision),
  });

export const getListingChanges = async (hours = 24): Promise<ListingChange[]> => {
  const data = await request<any>(`/admin/listings/changes?hours=${hours}`);
  return Array.isArray(data.changes) ? data.changes : [];
};

export const getHiddenListings = async (): Promise<ListingCard[]> => {
  const data = await request<any>('/admin/listings/hidden');
  return (Array.isArray(data.parties) ? data.parties : []).map(normalizeCard);
};

export const setListingStatus = (partyId: string, status: 'live' | 'hidden') =>
  request<{ message: string }>(`/admin/listings/${partyId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });

export const unlockListingField = (partyId: string, field: string) =>
  request<{ message: string }>(`/admin/listings/${partyId}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ field }),
  });

export const resyncListing = (partyId: string) =>
  request<{ message: string; changes: Record<string, [unknown, unknown]> }>(`/admin/listings/${partyId}/resync`, {
    method: 'POST',
  });
