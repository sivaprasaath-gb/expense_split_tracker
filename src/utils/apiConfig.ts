/**
 * Resolves the active backend API base URL for SMS Webhook ingestion and inbox sync.
 *
 * Defaults to current origin (window.location.origin) so when deployed to Firebase Hosting
 * or Cloud Run, requests stay on the same domain without cross-origin or auth cookie issues.
 */

export function getApiBaseUrl(customUrl?: string): string {
  // 1. Explicit user override from app state / settings
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // 2. Build-time environment variable if configured (e.g. VITE_API_URL)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Current origin (e.g. https://varaavuselaavu.web.app or http://localhost:3000)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
}

export function getApiUrl(path: string, customServerUrl?: string): string {
  const base = getApiBaseUrl(customServerUrl);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
