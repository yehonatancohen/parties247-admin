import { Party, Carousel, AnalyticsSummary, AnalyticsSummaryParty, DetailedAnalyticsResponse, RecentActivityResponse, RecentActivityFilters, VisitorAnalyticsResponse, AuditLogResponse } from '../data/types';
import { SeoPageConfig } from '../lib/seoparties';

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://parties247-backend.onrender.com/api';

const ANALYTICS_API_BASE = `${API_URL}/analytics`;
const JWT_TOKEN_STORAGE = 'jwtAuthToken';

// --- Helper Functions ---

const getAuthHeader = (): { [key: string]: string } => {
  if (typeof sessionStorage === 'undefined') return {};
  const token = sessionStorage.getItem(JWT_TOKEN_STORAGE);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const isDateInWeekend = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDay(); // 4 = Thursday, 5 = Friday, 6 = Saturday
  return day === 4 || day === 5 || day === 6;
};

const isDateToday = (dateString: string) => {
  const partyDate = new Date(dateString).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);
  return partyDate === today;
};

type PartyAnalyticsPayload = {
  partyId: string;
  partySlug: string;
  sessionId?: string;
  referrer?: string;
};

const mapPartyToFrontend = (backendParty: any): Party => {
  if (!backendParty) throw new Error("Received invalid party data from backend.");

  let slug = backendParty.slug;
  const urlForSlug = backendParty.goOutUrl || backendParty.originalUrl;

  if (!slug && urlForSlug && typeof urlForSlug === 'string') {
    try {
      const match = urlForSlug.match(/\/event\/([^/?#]+)/);
      if (match && match[1]) slug = match[1];
    } catch (e) {
      console.error('Could not parse URL to derive slug:', urlForSlug);
    }
  }

  const name = backendParty.title?.he || backendParty.name;
  const description = backendParty.description?.he || backendParty.summary?.he || backendParty.description;

  const locationName = backendParty.geo?.address
    || backendParty.venue?.name?.he || backendParty.venue
    || backendParty.city?.name?.he || backendParty.city
    || backendParty.location?.name || backendParty.location
    || 'Location not specified';

  const locationAddress = backendParty.geo?.address
    || backendParty.venue?.geo?.address
    || backendParty.location?.address;

  const locationGeo = backendParty.geo || backendParty.location?.geo;
  const geo = locationGeo?.lat && locationGeo?.lon
    ? { latitude: String(locationGeo.lat), longitude: String(locationGeo.lon) }
    : undefined;

  let finalImageUrl = backendParty.images?.[0]?.url || backendParty.images?.[0] || backendParty.imageUrl || '';
  if (finalImageUrl) {
    finalImageUrl = finalImageUrl.replace('_whatsappImage.jpg', '_coverImage.jpg');
    if (!finalImageUrl.startsWith('http')) {
      finalImageUrl = `https://d15q6k8l9pfut7.cloudfront.net/${finalImageUrl.startsWith('/') ? finalImageUrl.substring(1) : finalImageUrl}`;
    }
  }

  // --- AGE EXTRACTION LOGIC ---
  // If 'age' field is missing, look for it in tags
  let age = backendParty.age;
  const tags = backendParty.tags || backendParty.genres || [];

  if (!age || age === 'כל הגילאים') {
    const ageTag = tags.find((t: string) => t.includes('+') || t.includes('גיל') || t.includes('סטודנט'));
    if (ageTag) age = ageTag;
  }

  let eventStatus: Party['eventStatus'] = backendParty.eventStatus;
  if (backendParty.status) {
    switch (backendParty.status) {
      case 'scheduled': eventStatus = 'EventScheduled'; break;
      case 'cancelled': eventStatus = 'EventCancelled'; break;
      case 'postponed': eventStatus = 'EventPostponed'; break;
      case 'rescheduled': eventStatus = 'EventRescheduled'; break;
    }
  }

  return {
    id: backendParty._id,
    slug: slug,
    name: name || 'Untitled Event',
    imageUrl: finalImageUrl,
    date: backendParty.startsAt || backendParty.date,
    musicGenres: backendParty.musicGenres || '',
    location: { name: locationName, address: locationAddress, geo: geo },
    description: description || 'No description available.',
    originalUrl: backendParty.purchaseUrl || backendParty.originalUrl || backendParty.goOutUrl,
    region: backendParty.region || 'לא ידוע',
    musicType: backendParty.musicType || 'אחר',
    eventType: backendParty.eventType || 'אחר',
    age: age || 'כל הגילאים',
    tags: tags,
    referralCode: backendParty.referralCode,
    pixelId: backendParty.pixelId,
    eventStatus: eventStatus,
    eventAttendanceMode: backendParty.eventAttendanceMode,
    organizer: backendParty.organizer,
    performer: backendParty.performer,
    ticketPrice: backendParty.ticketPrice,
    soldOut: backendParty.soldOut ?? false,
  };
};

// ... mapCarouselToFrontend remains the same ...
const mapCarouselToFrontend = (backendCarousel: any): Carousel => {
  return {
    id: backendCarousel._id || backendCarousel.id,
    title: backendCarousel.title,
    partyIds: backendCarousel.partyIds || [],
    order: backendCarousel.order ?? 0,
  };
};

// --- UPDATED API Functions ---


export const getParties = async (filters?: SeoPageConfig["apiFilters"], includeHidden = false): Promise<Party[]> => {
  // Use 'upcoming=true' by default, if we also want past parties we need another param
  const response = await fetch(`${API_URL}/parties?upcoming=true`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) throw new Error("Failed to fetch parties");

  const data = await response.json();

  let parties = data.map(mapPartyToFrontend).filter((party: Party) => party.slug);

  // Filter out promotion parties unless explicitly requested
  if (!includeHidden) {
    parties = parties.filter((p: Party) => !p.tags?.includes('promotion'));
  }

  if (filters) {
    parties = parties.filter((party: Party) => {
      let matches = true;

      // Region
      if (filters.region && party.region !== filters.region) matches = false;

      // Age (Check mapped field OR tags)
      if (filters.age) {
        const ageFieldMatch = party.age === filters.age;
        const tagMatch = party.tags?.some(t => t.includes(filters.age!));
        if (!ageFieldMatch && !tagMatch) matches = false;
      }

      // Music Type
      if (filters.musicType) {
        const isPrimary = party.musicType === filters.musicType;
        const isInGenres = party.musicGenres?.includes(filters.musicType);
        if (!isPrimary && !isInGenres) matches = false;
      }

      // Event Type
      if (filters.eventType && party.eventType !== filters.eventType) matches = false;

      // City Tag
      if (filters.cityTag) {
        const tagMatch = party.tags?.some((t) => t.includes(filters.cityTag!));
        const cityMatch = party.location?.name?.includes(filters.cityTag!);
        if (!tagMatch && !cityMatch) matches = false;
      }

      // General Tag (e.g. "Alcohol")
      if (filters.generalTag) {
        const tagMatch = party.tags?.some((t) => t.includes(filters.generalTag!));
        if (!tagMatch) matches = false;
      }

      // Date Range (Today vs Weekend)
      if (filters.dateRange === 'today') {
        if (!isDateToday(party.date)) matches = false;
      } else if (filters.dateRange === 'weekend') {
        if (!isDateInWeekend(party.date)) matches = false;
      }

      return matches;
    });
  }

  return parties;
};

// ... (Rest of the file: getPartyBySlug, addParty, etc. remains exactly as you provided) ...
// Copy the rest of your provided api.ts functions here below getParties
export const getPartyBySlug = async (slug: string): Promise<Party> => {
  // Try fetching from the specific event endpoint first
  const response = await fetch(`${API_URL}/events/${slug}`, { cache: 'no-store' });

  if (response.ok) {
    const data = await response.json();
    if (data.event) {
      // If we HAVE the pixelId (or it's explicitly null), return it
      // Only fallback if it's completely missing/undefined
      if (data.event.pixelId !== undefined) {
        return mapPartyToFrontend(data.event);
      }
    }
  }

  // Fallback: Fetch all parties (including hidden ones) and find by slug
  // This is heavier but ensures we get the full Party object with all fields
  const allParties = await getParties(undefined, true);
  const party = allParties.find(p => p.slug === slug);

  if (!party) {
    throw new Error(`Party not found with slug: ${slug}`);
  }

  return party;
};

export const addParty = async (url: string): Promise<Party> => {
  const response = await fetch(`${API_URL}/admin/add-party`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ url }),
  });
  let responseData;
  try { responseData = await response.json(); }
  catch (e) { throw new Error("Unexpected server response."); }
  if (!response.ok) throw new Error(responseData.message || 'Failed to add party');
  return mapPartyToFrontend(responseData.party);
};

export const deleteParty = async (partyId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/delete-party/${partyId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  if (!response.ok) {
    const responseData = await response.json();
    throw new Error(responseData.message || 'Failed to delete party');
  }
};

export const triggerPriceUpdate = async (): Promise<{ checked: number; updated: number }> => {
  const response = await fetch(`${API_URL}/admin/update-prices`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update prices');
  return data.details;
};

export const updateParty = async (partyId: string, partyData: Omit<Party, 'id'>): Promise<Party> => {
  const updatePayload = {
    title: partyData.name,
    slug: partyData.slug,
    image: partyData.imageUrl,
    url: partyData.originalUrl,
    startsAt: partyData.date,
    location: partyData.location?.name,
    tags: partyData.tags,
    description: partyData.description,
    referralCode: partyData.referralCode,
    pixelId: partyData.pixelId,
    ticketPrice: partyData.ticketPrice,
  };
  const response = await fetch(`${API_URL}/admin/update-party/${partyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(updatePayload),
  });
  let responseData;
  try { responseData = await response.json(); }
  catch (e) { throw new Error("Unexpected server response on update."); }
  if (!response.ok) throw new Error(responseData.message || 'Failed to update party');
  return responseData.party ? mapPartyToFrontend(responseData.party) : { ...partyData, id: partyId };
};

export const cloneParty = async (sourceSlug: string, newSlug: string, purchaseLink: string, referralCode?: string, pixelId?: string): Promise<Party> => {
  const payload = {
    sourceSlug,
    newSlug,
    purchaseLink,
    referralCode,
    pixelId,
  };

  const response = await fetch(`${API_URL}/admin/clone-party`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();
  if (!response.ok) throw new Error(responseData.message || 'Failed to clone party');

  return mapPartyToFrontend(responseData.party);
};

export const login = async (password: string): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Login failed');
  if (data.token && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(JWT_TOKEN_STORAGE, data.token);
  } else if (!data.token) {
    throw new Error('Login response did not include a token.');
  }
};

export const verifyToken = async (): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/verify-token`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || 'Invalid or expired token';
    throw new Error(message);
  }
};

export const getDefaultReferral = async (): Promise<string> => {
  const response = await fetch(`${API_URL}/referral`);
  if (!response.ok) {
    if (response.status === 404) return '';
    throw new Error('Failed to fetch default referral code');
  }
  const data = await response.json();
  return data.referral || '';
};

export const setDefaultReferral = async (code: string): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/referral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw new Error('Failed to set default referral code');
};

export const getCarousels = async (): Promise<Carousel[]> => {
  const response = await fetch(`${API_URL}/carousels`);
  if (!response.ok) throw new Error('Failed to fetch carousels');
  const data = await response.json();
  return Array.isArray(data) ? data.map(mapCarouselToFrontend) : [];
};

export const addCarousel = async (title: string): Promise<Carousel> => {
  const response = await fetch(`${API_URL}/admin/carousels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ title }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create carousel');
  return mapCarouselToFrontend(data);
};

export const updateCarouselInfo = async (carouselId: string, data: { title: string, order: number }): Promise<Carousel> => {
  const response = await fetch(`${API_URL}/admin/carousels/${carouselId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  const resData = await response.json();
  if (!response.ok) throw new Error(resData.message || 'Failed to update carousel info');
  return mapCarouselToFrontend(resData.carousel);
};

export const updateCarouselParties = async (carouselId: string, partyIds: string[]): Promise<Carousel> => {
  const response = await fetch(`${API_URL}/admin/carousels/${carouselId}/parties`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ partyIds }),
  });
  const resData = await response.json();
  if (!response.ok) throw new Error(resData.message || 'Failed to update carousel parties');
  return mapCarouselToFrontend(resData.carousel);
};

export const deleteCarousel = async (carouselId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/carousels/${carouselId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Failed to delete carousel');
  }
};

export const reorderCarousels = async (orderedIds: string[]): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/carousels/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ orderedIds }),
  });
  if (!response.ok) throw new Error('Failed to reorder carousels');
};

interface AddSectionPayload {
  carouselName: string;
  title: string;
  url: string;
}
export const addSection = async (payload: AddSectionPayload): Promise<{ carousel: Carousel; message: string; partyCount: number; warnings: any[] }> => {
  const response = await fetch(`${API_URL}/admin/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to add section');
  return { ...data, carousel: mapCarouselToFrontend(data.carousel) };
};

const normalizeCount = (value: unknown): number => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
};

const mapSummaryParty = (item: any): AnalyticsSummaryParty => {
  const partyId = typeof item?.partyId === 'string' ? item.partyId : '';
  const slug = typeof item?.slug === 'string' ? item.slug : '';
  const name = typeof item?.name === 'string' ? item.name : 'אירוע ללא שם';
  const date = typeof item?.date === 'string' ? item.date : '';
  const metadata: Record<string, unknown> | undefined = (() => {
    if (!item || typeof item !== 'object') return undefined;
    const { partyId: _pid, slug: _slug, name: _name, date: _date, views: _views, redirects: _redirects, ...rest } = item as Record<string, unknown>;
    return Object.keys(rest).length > 0 ? rest : undefined;
  })();

  return {
    partyId,
    slug,
    name,
    date,
    views: normalizeCount(item?.views),
    redirects: normalizeCount(item?.redirects),
    metadata,
  };
};

export const recordVisitor = async (sessionId: string, context?: Record<string, unknown>): Promise<void> => {
  const payload: Record<string, unknown> = { sessionId, ...context };

  const response = await fetch(`${ANALYTICS_API_BASE}/visitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  if (!response.ok) throw new Error('Failed to record visitor');
};

export const recordPartyRedirect = async (payload: PartyAnalyticsPayload): Promise<void> => {
  const response = await fetch(`${ANALYTICS_API_BASE}/party-redirect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  if (!response.ok) throw new Error('Failed to record party redirect');
};

export const recordPartyView = async (payload: PartyAnalyticsPayload): Promise<void> => {
  const response = await fetch(`${ANALYTICS_API_BASE}/party-view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  if (!response.ok) throw new Error('Failed to record party view');
};

export const getAnalyticsSummary = async (): Promise<AnalyticsSummary> => {
  const response = await fetch(`${ANALYTICS_API_BASE}/summary`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Failed to fetch analytics summary');
  return {
    generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : new Date().toISOString(),
    uniqueVisitors24h: normalizeCount(data.uniqueVisitors24h),
    parties: Array.isArray(data.parties) ? data.parties.map(mapSummaryParty) : [],
    trafficSources: Array.isArray(data.trafficSources) ? data.trafficSources : [],
    devices: Array.isArray(data.devices) ? data.devices : [],
  };
};

export const getDetailedAnalytics = async (
  range: '7d' | '24h' | '30d' = '7d',
  interval: 'day' | 'hour' = 'day',
  partyId?: string
): Promise<DetailedAnalyticsResponse> => {
  const params = new URLSearchParams({ range, interval });
  if (partyId) params.append('partyId', partyId);

  const response = await fetch(`${API_URL}/admin/analytics/detailed?${params.toString()}`, {
    headers: { ...getAuthHeader() },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Failed to fetch detailed analytics');

  return {
    data: Array.isArray(data.data) ? data.data.map((item: any) => ({
      timestamp: typeof item.timestamp === 'string' ? item.timestamp : '',
      visits: normalizeCount(item.visits),
      partyViews: normalizeCount(item.partyViews),
      purchases: normalizeCount(item.purchases),
    })) : [],
    range: typeof data.range === 'string' ? data.range : range,
    interval: data.interval === 'hour' || data.interval === 'day' ? data.interval : interval,
    partyId: typeof data.partyId === 'string' ? data.partyId : null,
  };
};

export const getRecentActivity = async (
  filters: RecentActivityFilters = {}
): Promise<RecentActivityResponse> => {
  const { types, devices, sources, limit, offset, hours } = filters;
  const params = new URLSearchParams();
  if (types && types.length > 0) params.set('type', types.join(','));
  if (devices && devices.length > 0) params.set('device', devices.join(','));
  if (sources && sources.length > 0) params.set('source', sources.join(','));
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  if (hours != null) params.set('hours', String(hours));

  const query = params.toString();
  try {
    const response = await fetch(`${ANALYTICS_API_BASE}/recent${query ? `?${query}` : ''}`, {
      headers: { ...getAuthHeader() },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        events: Array.isArray(data.events) ? data.events : [],
        total: typeof data.total === 'number' ? data.total : 0,
        hasMore: Boolean(data.hasMore),
      };
    }
  } catch (error) {
    console.warn("Failed to fetch recent activity from API.", error);
  }

  return { events: [], total: 0, hasMore: false };
};

export const getVisitorAnalytics = async (
  range: '24h' | '7d' | '30d' = '24h'
): Promise<VisitorAnalyticsResponse> => {
  const params = new URLSearchParams({ range });
  try {
    const response = await fetch(`${API_URL}/admin/analytics/visitors?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Failed to fetch visitor analytics');

    return {
      total: normalizeCount(data.total),
      range: typeof data.range === 'string' ? data.range : range,
      devices: Array.isArray(data.devices) ? data.devices : [],
      browsers: Array.isArray(data.browsers) ? data.browsers : [],
      operatingSystems: Array.isArray(data.operatingSystems) ? data.operatingSystems : [],
      trafficSources: Array.isArray(data.trafficSources) ? data.trafficSources : [],
      languages: Array.isArray(data.languages) ? data.languages : [],
      topReferrers: Array.isArray(data.topReferrers) ? data.topReferrers : [],
      visitors: Array.isArray(data.visitors) ? data.visitors : [],
    };
  } catch (error) {
    console.error("Critical error in getVisitorAnalytics:", error);
    throw error;
  }
};

export const getAuditLog = async (
  filters: { actions?: string[]; limit?: number; offset?: number } = {}
): Promise<AuditLogResponse> => {
  const { actions, limit, offset } = filters;
  const params = new URLSearchParams();
  if (actions && actions.length > 0) params.set('action', actions.join(','));
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));

  const query = params.toString();
  try {
    const response = await fetch(`${API_URL}/admin/audit-log${query ? `?${query}` : ''}`, {
      headers: { ...getAuthHeader() },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Failed to fetch audit log');

    return {
      entries: Array.isArray(data.entries) ? data.entries : [],
      total: normalizeCount(data.total),
      hasMore: Boolean(data.hasMore),
    };
  } catch (error) {
    console.error("Critical error in getAuditLog:", error);
    throw error;
  }
};

