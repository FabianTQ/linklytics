import { API_BASE_URL } from './constants';
import type { LinkAnalytics, LinkView, User } from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

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

export const api = {
  register: (email: string, password: string): Promise<{ user: User }> =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string): Promise<{ user: User }> =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: (): Promise<{ success: boolean }> => apiFetch('/api/auth/logout', { method: 'POST' }),

  me: (): Promise<{ user: User }> => apiFetch('/api/auth/me'),

  listLinks: (): Promise<LinkView[]> => apiFetch('/api/links'),

  createLink: (originalUrl: string): Promise<LinkView> =>
    apiFetch('/api/links', { method: 'POST', body: JSON.stringify({ originalUrl }) }),

  deleteLink: (id: string): Promise<void> => apiFetch(`/api/links/${id}`, { method: 'DELETE' }),

  analytics: (id: string, days = 30): Promise<LinkAnalytics> =>
    apiFetch(`/api/links/${id}/analytics?days=${days}`),
};
