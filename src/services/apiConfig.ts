// Dynamic API & Metro Host Configuration
// Dynamically resolves host IP so Expo Go on physical mobile devices connects over Wi-Fi
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_HOST_KEY = 'aura_custom_server_host';
let memoryCustomHost: string | null = null;

// Initialize custom host from storage
AsyncStorage.getItem(CUSTOM_HOST_KEY)
  .then((saved) => {
    if (saved) {
      memoryCustomHost = saved.trim().replace(/\/+$/, '');
    }
  })
  .catch(() => {});

export function setCustomServerHost(hostOrUrl: string | null): void {
  memoryCustomHost = hostOrUrl ? hostOrUrl.trim().replace(/\/+$/, '') : null;
  if (memoryCustomHost) {
    AsyncStorage.setItem(CUSTOM_HOST_KEY, memoryCustomHost).catch(() => {});
  } else {
    AsyncStorage.removeItem(CUSTOM_HOST_KEY).catch(() => {});
  }
}

export function getCustomServerHost(): string | null {
  return memoryCustomHost;
}

/**
 * Gets the base URL for the backend API services.
 * Defaults to companion server port (5000) on LAN Wi-Fi.
 */
export function getApiBaseUrl(port: number = 5000): string {
  if (memoryCustomHost) {
    if (memoryCustomHost.startsWith('http://') || memoryCustomHost.startsWith('https://')) {
      return memoryCustomHost;
    }
    return `http://${memoryCustomHost}:${port}`;
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.protocol}//${window.location.hostname}:${port}`;
    }
    return `http://localhost:${port}`;
  }

  // Native mobile in Expo Go: extract host IP from Metro runtime config
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ipOnly = hostUri.split(':')[0];
    return `http://${ipOnly}:${port}`;
  }

  // Standalone APK or production release fallback to local network Wi-Fi IP
  return `http://192.168.1.10:${port}`;
}

/**
 * Executes a fetch with automatic failover between Metro dev server (port 8081)
 * and the companion extraction server (port 5000).
 * In standalone APKs, targets the companion server (port 5000) directly for fast responses.
 */
export async function fetchApiWithFallback(
  pathWithParams: string,
  options?: RequestInit
): Promise<Response> {
  const cleanPath = pathWithParams.startsWith('/') ? pathWithParams : `/${pathWithParams}`;
  
  // Only probe Metro (port 8081) if running in dev with an active Metro packager
  const isDevWithMetro = (!!Constants.expoConfig?.hostUri || Platform.OS === 'web') && !memoryCustomHost;
  if (isDevWithMetro) {
    const metroUrl = `${getApiBaseUrl(8081)}${cleanPath}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(metroUrl, {
        ...options,
        signal: options?.signal || controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      // If Metro served the API response
      if (res.ok && !contentType.includes('text/html')) {
        return res;
      }
    } catch (err) {
      // Metro middleware timed out or not loaded, fallback to port 5000
    }
  }

  // Standalone APK / Direct companion server (port 5000)
  const standaloneUrl = `${getApiBaseUrl(5000)}${cleanPath}`;
  return fetch(standaloneUrl, options);
}

