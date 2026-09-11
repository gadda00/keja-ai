/**
 * API client for the Phase-2 service seam (audit Ch. 24, P2-2).
 *
 * The platform keeps its static SPA shell; this client is the ONE place that
 * knows how to talk to a backend. When NEXT_PUBLIC_API_URL is unset (today),
 * every call rejects with ApiUnavailable and the store twins transparently
 * fall back to localStorage — the seam is config-only, deployable before the
 * server exists.
 *
 * Contract (the seam's whole surface, deliberately tiny):
 *   POST   /auth/register        {name, email, password}      → {user, token}
 *   POST   /auth/login           {email, password}            → {user, token}
 *   POST   /auth/logout          {}                           → 204
 *   GET    /auth/me              (bearer)                     → {user}
 *   GET    /leads?propertyId=…   (bearer)                     → {items}
 *   POST   /leads                {propertyId?, name, phone…}  → {item}
 *   GET    /viewings, POST /viewings, … same collection shape
 *
 * Session handling: the server mints an opaque token (see prisma/schema.prisma
 * Session.token); the client keeps it in localStorage under keja:api-token and
 * attaches it as a Bearer header. HttpOnly cookies replace this the day the
 * auth service actually ships (the client change is one PR).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'keja:api-token';

export class ApiUnavailable extends Error {
  constructor() {
    super('API seam not configured (NEXT_PUBLIC_API_URL unset) — using local mode');
    this.name = 'ApiUnavailable';
  }
}

export const apiConfigured = (): boolean => API_URL !== '';

export function getApiToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setApiToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export interface ApiError extends Error {
  status: number;
  body?: unknown;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  if (!API_URL) throw new ApiUnavailable();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getApiToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    // network failure — surface a typed error the twins can fall back on
    const err = new Error(`API unreachable: ${e instanceof Error ? e.message : e}`) as ApiError;
    err.status = 0;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`API ${res.status} on ${method} ${path}`) as ApiError;
    err.status = res.status;
    try {
      err.body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
