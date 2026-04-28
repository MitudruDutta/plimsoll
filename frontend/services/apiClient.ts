/**
 * Shared fetch wrapper for Plimsoll demo APIs.
 *
 * Why this exists
 * ---------------
 * The app talks to both authenticated FastAPI routers and public demo
 * routers. Authenticated calls need a Supabase bearer token; public demo
 * calls should stay anonymous so they never trigger Supabase/JWKS checks.
 *
 * This module exposes:
 *  - `setApiAccessToken(token)` — called by `SupabaseAuthContext` whenever
 *    the user's Supabase session changes. Also persists the token in
 *    sessionStorage so a fresh hard navigate can re-attach the header
 *    before the auth context has hydrated.
 *  - `apiFetch(path, init)` — drop-in `fetch()` replacement that:
 *      * resolves a relative `/api/...` path against the page origin so
 *        `new URL(...)` (used for query params) doesn't blow up,
 *      * attaches `Authorization: Bearer <jwt>` only for authenticated calls,
 *      * normalises non-2xx responses into a thrown `Error` with the
 *        FastAPI `detail` payload (or a sensible fallback).
 */

const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  "/api";

const TOKEN_STORAGE_KEY = "plimsoll.api.accessToken";

let currentAccessToken: string | null = null;

function readPersistedToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage?.getItem(TOKEN_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function persistToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.sessionStorage?.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage?.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // sessionStorage can be disabled — we already keep an in-memory copy.
  }
}

// Hydrate the in-memory cache on first import in the browser so
// services calling apiFetch on a hard refresh (before auth context
// finishes booting) still pick up the token.
if (typeof window !== "undefined") {
  currentAccessToken = readPersistedToken();
}

export function setApiAccessToken(token: string | null | undefined): void {
  const next = token || null;
  currentAccessToken = next;
  persistToken(next);
}

export function getApiAccessToken(): string | null {
  return currentAccessToken;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Resolve a path that may be relative ("/api/...") or absolute
 * ("https://...") into an absolute URL string. Falls back to the
 * relative form on the server where there's no `window.location`.
 */
export function resolveApiUrl(
  path: string,
  searchParams?: Record<string, string | number | boolean | undefined | null>,
): string {
  let urlString: string;

  if (/^https?:\/\//i.test(path)) {
    urlString = path;
  } else {
    const normalisedPath = path.startsWith("/") ? path : `/${path}`;
    if (typeof window !== "undefined" && window.location?.origin) {
      urlString = `${window.location.origin}${normalisedPath}`;
    } else {
      urlString = normalisedPath;
    }
  }

  if (!searchParams) return urlString;

  // For SSR / non-browser contexts where the URL is relative, fall back
  // to manual query-string construction so we never call `new URL()`
  // with an unparsable input.
  if (!/^https?:\/\//i.test(urlString)) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null) continue;
      qs.set(key, String(value));
    }
    const sep = urlString.includes("?") ? "&" : "?";
    const tail = qs.toString();
    return tail ? `${urlString}${sep}${tail}` : urlString;
  }

  const url = new URL(urlString);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export interface ApiFetchOptions extends RequestInit {
  /** Throw with a friendlier message if the user is not signed in. */
  requireAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function shouldUsePublicDemoFallback(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof ApiError)) return false;

  const message = error.message.toLowerCase();
  return (
    error.status === 401 ||
    error.status === 403 ||
    (error.status >= 500 &&
      (message.includes("auth") ||
        message.includes("jwks") ||
        message.includes("key")))
  );
}

/**
 * `fetch()` wrapper that injects the Supabase access token for authenticated
 * requests and normalises errors.
 */
export async function apiFetch(
  url: string,
  init: ApiFetchOptions = {},
  _retries = 2,
): Promise<Response> {
  const { requireAuth = true, headers: rawHeaders, ...rest } = init;

  const token = getApiAccessToken();
  if (requireAuth && !token) {
    throw new ApiError(
      "You need to sign in to run this analysis.",
      401,
      { code: "missing_token" },
    );
  }

  const headers = new Headers(rawHeaders || {});
  if (requireAuth && token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData =
    typeof FormData !== "undefined" && rest.body instanceof FormData;

  if (!isFormData && rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...rest, headers });

  // Auto-retry on 5xx (server/JWKS transient errors) with exponential backoff
  if (response.status >= 500 && _retries > 0) {
    const delay = (3 - _retries) * 800; // 800ms, then 1600ms
    await new Promise((resolve) => setTimeout(resolve, delay));
    return apiFetch(url, init, _retries - 1);
  }

  return response;
}

/**
 * Convenience helper: make an authed JSON request and parse the body.
 * Throws an `ApiError` with the FastAPI `detail` field on non-2xx.
 */
export async function apiRequest<T>(
  path: string,
  init: ApiFetchOptions & {
    searchParams?: Record<string, string | number | boolean | undefined | null>;
    json?: unknown;
  } = {},
): Promise<T> {
  const { searchParams, json, ...fetchInit } = init;
  const url = resolveApiUrl(path, searchParams);

  const finalInit: ApiFetchOptions = { ...fetchInit };
  if (json !== undefined) {
    finalInit.body = JSON.stringify(json);
    if (!finalInit.method) finalInit.method = "POST";
  }

  const response = await apiFetch(url, finalInit);

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = { detail: response.statusText };
    }
    const message =
      (detail as { detail?: string })?.detail || response.statusText || "Request failed";
    throw new ApiError(String(message), response.status, detail);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return (await response.json()) as T;
}
