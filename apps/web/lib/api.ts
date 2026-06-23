import { API_BASE_URL } from './constants';
import type { LinkAnalytics, LinkView, PaginatedLinks, User } from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, init?: RequestInit, allowRefresh = true): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  // Transparently refresh an expired access token once, then retry.
  if (res.status === 401 && allowRefresh && !path.startsWith('/api/auth/')) {
    const refreshed = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      return apiFetch<T>(path, init, false);
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = body.message;
    } catch {
      // keep status text
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface CreateLinkInput {
  originalUrl: string;
  customSlug?: string;
  expiresAt?: string;
}

export interface UpdateLinkInput {
  originalUrl?: string;
  isActive?: boolean;
  expiresAt?: string | null;
}

export interface ListLinksParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export const api = {
  register: (email: string, password: string): Promise<{ user: User }> =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string): Promise<{ user: User }> =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: (): Promise<{ success: boolean }> => apiFetch('/api/auth/logout', { method: 'POST' }),

  me: (): Promise<{ user: User }> => apiFetch('/api/auth/me'),

  listLinks: (params: ListLinksParams = {}): Promise<PaginatedLinks> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.q) qs.set('q', params.q);
    const query = qs.toString();
    return apiFetch(`/api/links${query ? `?${query}` : ''}`);
  },

  createLink: (input: CreateLinkInput): Promise<LinkView> =>
    apiFetch('/api/links', { method: 'POST', body: JSON.stringify(input) }),

  updateLink: (id: string, patch: UpdateLinkInput): Promise<LinkView> =>
    apiFetch(`/api/links/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  deleteLink: (id: string): Promise<void> => apiFetch(`/api/links/${id}`, { method: 'DELETE' }),

  analytics: (id: string, days = 30): Promise<LinkAnalytics> =>
    apiFetch(`/api/links/${id}/analytics?days=${days}`),
};
