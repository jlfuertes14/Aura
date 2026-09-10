// Dynamic API & Metro Host Configuration
// Dynamically resolves host IP so Expo Go on physical mobile devices connects over Wi-Fi
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Gets the base URL for the backend API services.
 * Dynamically resolves to the Metro port (8081) on LAN Wi-Fi.
 */
export function getApiBaseUrl(port: number = 8081): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.protocol}//${window.location.hostname}:${port}`;
    }
    return `http://localhost:${port}`;
  }

  // Native mobile: extract host IP from Expo Go runtime config
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ipOnly = hostUri.split(':')[0];
    return `http://${ipOnly}:${port}`;
  }

  // Default fallback to local network Wi-Fi IP
  return `http://192.168.1.10:${port}`;
}

/**
 * Executes a fetch with automatic failover between Metro dev server (port 8081)
 * and the companion extraction server (port 5000).
 */
export async function fetchApiWithFallback(
  pathWithParams: string,
  options?: RequestInit
): Promise<Response> {
  const cleanPath = pathWithParams.startsWith('/') ? pathWithParams : `/${pathWithParams}`;
  
  // Try Metro server (8081) first
  const metroUrl = `${getApiBaseUrl(8081)}${cleanPath}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(metroUrl, {
      ...options,
      signal: options?.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    // If Metro served the API response (JSON, audio, or image, not standard HTML page)
    if (res.ok && !contentType.includes('text/html')) {
      return res;
    }
  } catch (err) {
    // Metro middleware not yet loaded or timed out, fallback to port 5000
  }

  // Fallback to standalone server (5000)
  const standaloneUrl = `${getApiBaseUrl(5000)}${cleanPath}`;
  return fetch(standaloneUrl, options);
}
