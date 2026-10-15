/**
 * Resolves the active backend API base URL for SMS Webhook ingestion and inbox sync.
 * 
 * When hosted on Firebase Hosting (static CDN on *.web.app or *.firebaseapp.com),
 * relative /api calls hit the static hosting rewrite (index.html).
 * This resolver automatically routes API calls to the live Cloud Run backend server.
 */

export const DEFAULT_BACKEND_URL =
  'https://ais-dev-pquh4jdaxruvj2t7ydhal7-244583500242.asia-southeast1.run.app';

export function getApiBaseUrl(customUrl?: string): string {
  // 1. Explicit user override from settings
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // 2. Build-time environment variable if configured
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Runtime origin detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If running on static hosting (Firebase Hosting, GitHub Pages, Vercel, etc.)
    const isStaticHosting =
      hostname.endsWith('.web.app') ||
      hostname.endsWith('.firebaseapp.com') ||
      hostname.endsWith('.github.io') ||
      hostname.endsWith('.pages.dev') ||
      hostname.endsWith('.vercel.app') ||
      hostname.endsWith('.netlify.app');

    if (isStaticHosting) {
      return DEFAULT_BACKEND_URL;
    }

    // If running on Cloud Run (*.run.app) or local dev server
    return window.location.origin;
  }

  return DEFAULT_BACKEND_URL;
}

export function getApiUrl(path: string, customServerUrl?: string): string {
  const base = getApiBaseUrl(customServerUrl);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
