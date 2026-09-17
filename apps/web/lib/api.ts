/**
 * Wrapper fetch qui :
 *  1. Ajoute automatiquement l'access token au header Authorization
 *  2. Sur 401, tente un POST /auth/refresh avec le refreshToken
 *  3. Si refresh OK → retry la requête initiale
 *  4. Si refresh KO → clear tokens + redirect /login
 *
 * Usage : remplacer `fetch('/api/...')` par `apiFetch('/api/...')`
 */

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_KEYS = ['token', 'refreshToken', 'role', 'isOwner', 'orgType', 'orgName'];

// ─── Tokens ─────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
}

// ─── Refresh (avec déduplication des appels concurrents) ─

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Si un refresh est déjà en cours, on attend le même
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return null;

      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const data = await res.json();
      if (!data.accessToken) {
        clearTokens();
        return null;
      }

      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    } catch {
      clearTokens();
      return null;
    } finally {
      // Libère le verrou après un court délai (laisse le temps aux autres appels de lire)
      setTimeout(() => { refreshPromise = null; }, 100);
    }
  })();

  return refreshPromise;
}

// ─── apiFetch ───────────────────────────────────────────

function isApiUrl(url: string): boolean {
  return url.startsWith('/api/') || url.includes('/api/');
}

function buildInit(init: RequestInit, token: string | null, isApi: boolean): RequestInit {
  const headers = new Headers(init.headers || {});
  if (token && isApi) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return { ...init, headers };
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  const isApi = isApiUrl(url);

  // 1ère tentative avec le token courant
  let res = await fetch(input, buildInit(init, getAccessToken(), isApi));

  // Si 401 sur un appel API → tenter un refresh
  if (res.status === 401 && isApi && getRefreshToken()) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry avec le nouveau token
      res = await fetch(input, buildInit(init, newToken, isApi));
    } else {
      // Refresh échoué → redirect vers login (sauf si déjà sur /login)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
  }

  return res;
}

// ─── Logout ─────────────────────────────────────────────

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // ignore : on clear local quoi qu'il arrive
  }
  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
