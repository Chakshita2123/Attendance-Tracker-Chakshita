import { Capacitor } from '@capacitor/core'

export const PRODUCTION_API_URL = 'https://markd-attendance-tracker.onrender.com'

/**
 * Returns the correct API base URL.
 * When running inside a native Capacitor mobile app, returns the full production URL.
 * When running on the web, respects VITE_API_BASE_URL / VITE_API_URL or defaults to localhost in dev.
 */
export function getApiBaseUrl() {
  const isNative = Capacitor.isNativePlatform()
  const platform = Capacitor.getPlatform()

  // Capacitor webview detection (protocol capacitor:// or https://localhost in PROD bundle)
  const isCapacitorOrigin = typeof window !== 'undefined' && (
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && import.meta.env.PROD)
  )

  const isMobileApp = isNative || platform !== 'web' || isCapacitorOrigin

  const rawUrl = isMobileApp
    ? PRODUCTION_API_URL
    : (import.meta.env.VITE_API_BASE_URL ??
       import.meta.env.VITE_API_URL ??
       (import.meta.env.PROD ? '' : 'http://localhost:5000'))

  const cleanUrl = String(rawUrl || '').replace(/\/+$/, '').replace(/\/api$/, '')

  console.log(`[API_BASE_URL] Platform: ${platform}, isNative: ${isNative}, isMobileApp: ${isMobileApp}, Resolved URL: "${cleanUrl}"`)

  return cleanUrl
}


