// Ken-Gei Prelude — API Client

import type { ApiResponse, Concert } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    const json = await res.json();
    return json as ApiResponse<T>;
  } catch {
    return { ok: false, error: '通信に失敗しました。接続を確認してください。' };
  }
}

// Concerts
export async function fetchConcerts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  sort?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  includeUnpublished?: boolean;
}): Promise<ApiResponse<Concert[]>> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.category) sp.set('category', params.category);
  if (params?.sort) sp.set('sort', params.sort);
  if (params?.search) sp.set('search', params.search);
  if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params?.dateTo) sp.set('dateTo', params.dateTo);
  if (params?.includeUnpublished) sp.set('includeUnpublished', '1');
  return request(`/concerts?${sp}`);
}

export async function fetchConcert(slug: string): Promise<ApiResponse<Concert>> {
  return request(`/concerts/${slug}`);
}

export async function createConcert(data: Record<string, unknown>): Promise<ApiResponse<Concert>> {
  return request('/concerts', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateConcert(
  slug: string,
  data: Record<string, unknown>,
  password: string
): Promise<ApiResponse<Concert>> {
  return request(`/concerts/${slug}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, edit_password: password }),
  });
}

export async function deleteConcert(slug: string, password: string): Promise<ApiResponse<void>> {
  return request(`/concerts/${slug}`, {
    method: 'DELETE',
    body: JSON.stringify({ edit_password: password }),
  });
}

// Admin
export async function adminAuth(password: string): Promise<ApiResponse<{ token: string }>> {
  return request('/admin/auth', { method: 'POST', body: JSON.stringify({ password }) });
}

export async function adminFetchConcerts(token: string): Promise<ApiResponse<Concert[]>> {
  return request('/concerts?includeUnpublished=1&includeDeleted=1', {
    headers: { 'X-Admin-Token': token },
  });
}

export async function adminUpdateConcert(
  slug: string,
  data: Record<string, unknown>,
  token: string
): Promise<ApiResponse<Concert>> {
  return request(`/concerts/${slug}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, admin_token: token }),
    headers: { 'X-Admin-Token': token },
  });
}

export async function adminDeleteConcert(slug: string, token: string): Promise<ApiResponse<void>> {
  return request(`/concerts/${slug}`, {
    method: 'DELETE',
    body: JSON.stringify({ admin_token: token }),
    headers: { 'X-Admin-Token': token },
  });
}

// Contact
export async function submitContact(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  concert_id?: string;
  honeypot?: string;
}): Promise<ApiResponse<void>> {
  return request('/contact', { method: 'POST', body: JSON.stringify(data) });
}

// Inquiries (admin)
export async function fetchInquiries(token: string): Promise<ApiResponse<import('../types').Inquiry[]>> {
  return request('/inquiries', { headers: { 'X-Admin-Token': token } });
}

export async function updateInquiry(
  id: number,
  data: { status?: string; admin_note?: string },
  token: string
): Promise<ApiResponse<void>> {
  return request(`/inquiries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'X-Admin-Token': token },
  });
}

// Venues
export async function fetchVenues(): Promise<ApiResponse<import('../types').VenueRecord[]>> {
  return request('/concerts/venues');
}

// Verify edit password
export async function verifyEditPassword(
  slug: string,
  password: string
): Promise<ApiResponse<{ valid: boolean }>> {
  return request(`/concerts/${slug}/verify`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

// Upload flyer
export async function uploadFlyer(formData: FormData): Promise<ApiResponse<{ key: string; thumbnail_key: string }>> {
  try {
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData });
    return await res.json();
  } catch {
    return { ok: false, error: 'アップロードに失敗しました。' };
  }
}

// Analytics / Stats (admin)
export async function fetchStats(token: string): Promise<
  ApiResponse<{
    total: number;
    upcoming: number;
    past: number;
    totalViews: number;
    monthViews: number;
    byCategory: Record<string, number>;
    topConcerts: { slug: string; title: string; views: number }[];
    dailyViews: { date: string; count: number }[];
    recentInquiries: number;
    unpublished: number;
  }>
> {
  return request('/admin/stats', { headers: { 'X-Admin-Token': token } });
}

// Maintenance log (admin)
export async function fetchMaintenanceLogs(
  token: string
): Promise<ApiResponse<import('../types').MaintenanceLogEntry[]>> {
  return request('/admin/maintenance', { headers: { 'X-Admin-Token': token } });
}
