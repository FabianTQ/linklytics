export interface User {
  id: string;
  email: string;
}

export interface LinkView {
  id: string;
  slug: string;
  originalUrl: string;
  shortUrl: string;
  clickCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLinks {
  items: LinkView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface ReferrerBucket {
  referrer: string;
  count: number;
}

export interface GeoBucket {
  country: string;
  count: number;
}

export interface LinkAnalytics {
  linkId: string;
  rangeDays: number;
  totalClicks: number;
  timeSeries: TimeSeriesPoint[];
  topReferrers: ReferrerBucket[];
  geo: GeoBucket[];
}
