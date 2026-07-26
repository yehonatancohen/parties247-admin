
export interface Party {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  date: string; // ISO 8601 format
  musicGenres: string;
  location: {
    name: string;
    address?: string;
    geo?: {
      latitude: string;
      longitude: string;
    };
  };
  description: string;
  originalUrl: string;
  ticketPrice?: number;
  soldOut?: boolean;
  region: 'דרום' | 'מרכז' | 'צפון' | 'לא ידוע';
  musicType: 'מיינסטרים' | 'טכנו' | 'טראנס' | 'אחר';
  eventType: 'מסיבת בית' | 'מסיבת מועדון' | 'מסיבת טבע' | 'פסטיבל' | 'אחר';
  age: 'נוער' | '18+' | '21+' | 'כל הגילאים';
  tags: string[];
  referralCode?: string;
  pixelId?: string; // Meta Pixel ID for conversion tracking
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?: 'OnlineEventAttendanceMode' | 'OfflineEventAttendanceMode' | 'MixedEventAttendanceMode';
  organizer?: {
    name: string;
    url?: string;
  };
  performer?: {
    name: string;
  };
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string;
  content: string;
  datePublished: string; // ISO 8601
  dateModified: string;  // ISO 8601
}

export interface Carousel {
  id: string;
  title: string;
  partyIds: string[];
  order: number;
}

export interface PartyProviderInitialState {
  parties?: Party[];
  carousels?: Carousel[];
  defaultReferral?: string;
  disableInitialFetch?: boolean;
}

export type FilterState = {
  region?: string;
  musicType?: string;
  eventType?: string;
  age?: string;
  tags: string[];
  date?: string;
  weekday?: number;
};

export interface PartyContextType {
  allParties: Party[]; // Includes hidden/promotion parties
  parties: Party[];
  carousels: Carousel[];
  addParty: (url: string) => Promise<Party>;
  deleteParty: (partyId: string) => Promise<void>;
  updateParty: (partyToUpdate: Party) => Promise<Party>;
  addCarousel: (title: string) => Promise<void>;
  deleteCarousel: (carouselId: string) => Promise<void>;
  updateCarousel: (carouselId: string, updates: { title?: string; order?: number }) => Promise<void>;
  reorderCarousels: (orderedIds: string[]) => Promise<void>;
  cloneParty: (sourceSlug: string, newSlug: string, purchaseLink: string, referralCode?: string, pixelId?: string) => Promise<Party>;
  addPartyToCarousel: (carouselId: string, partyId: string) => Promise<void>;
  removePartyFromCarousel: (carouselId: string, partyId: string) => Promise<void>;
  isLoading: boolean;
  defaultReferral: string;
  setDefaultReferral: (code: string) => Promise<void>;
  error: string | null;
  loadingMessage: string | null;
}

export interface AnalyticsSummaryParty {
  partyId: string;
  slug: string;
  name: string;
  date: string;
  views: number;
  redirects: number;
  metadata?: Record<string, unknown>;
}

export interface BreakdownItem {
  label: string;
  count: number;
  percent: number;
}

export interface AnalyticsSummary {
  generatedAt: string;
  uniqueVisitors24h: number;
  parties: AnalyticsSummaryParty[];
  trafficSources: BreakdownItem[];
  devices: BreakdownItem[];
}

export interface DetailedAnalyticsDataPoint {
  timestamp: string;
  visits: number;
  partyViews: number;
  purchases: number;
}

export interface DetailedAnalyticsResponse {
  data: DetailedAnalyticsDataPoint[];
  range: string;
  interval: 'day' | 'hour';
  partyId: string | null;
}

export interface RecentActivityEvent {
  id: string;
  type: 'view' | 'purchase' | 'visit';
  partyName?: string;
  partyId?: string;
  timestamp: string;
  details?: string;
  device?: string;
  source?: string;
}

export interface RecentActivityResponse {
  events: RecentActivityEvent[];
  total: number;
  hasMore: boolean;
}

export interface RecentActivityFilters {
  types?: Array<'view' | 'purchase' | 'visit'>;
  devices?: string[];
  sources?: string[];
  limit?: number;
  offset?: number;
  hours?: number;
}

export interface VisitorRecord {
  sessionId: string;
  timestamp: string;
  deviceType: string;
  browser: string;
  os: string;
  trafficSource: string;
  referer?: string;
  language: string;
  screen?: string;
  pageUrl?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export interface VisitorAnalyticsResponse {
  total: number;
  range: string;
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  operatingSystems: BreakdownItem[];
  trafficSources: BreakdownItem[];
  languages: BreakdownItem[];
  topReferrers: BreakdownItem[];
  visitors: VisitorRecord[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
  timestamp: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}
