import { requireNativeModule, Platform } from 'expo-modules-core';

export interface ExtractedStream {
  success: boolean;
  streamUrl?: string;
  title?: string;
  duration?: number;
  author?: string;
  bitrate?: number;
  format?: string;
  error?: string;
}

let nativeModule: any = null;

try {
  if (Platform.OS === 'android') {
    nativeModule = requireNativeModule('YouTubeExtractor');
  }
} catch (e) {
  // Native module not compiled in current dev client or on Web
  nativeModule = null;
}

// Resilient fallback public endpoints for Web and Expo Go preview
const FALLBACK_INSTANCES = [
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://invidious.private.coffee',
];

async function fallbackExtractAudioStream(videoId: string): Promise<ExtractedStream> {
  for (const inst of FALLBACK_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const adaptiveFormats = data.adaptiveFormats || [];
        const audioFormats = adaptiveFormats.filter((f: any) =>
          f.type && typeof f.type === 'string' && f.type.startsWith('audio')
        );
        if (audioFormats.length > 0) {
          const m4a = audioFormats.find((f: any) => f.container === 'm4a') || audioFormats[0];
          return {
            success: true,
            streamUrl: m4a.url,
            title: data.title,
            duration: data.lengthSeconds,
            author: data.author,
            format: m4a.container || 'm4a',
            bitrate: m4a.bitrate ? parseInt(m4a.bitrate, 10) : undefined,
          };
        }
      }
    } catch {
      // Try next fallback instance
    }
  }

  return {
    success: false,
    error: 'Unable to extract audio stream from YouTube',
  };
}

/**
 * Extracts YouTube audio stream natively on Android via NewPipeExtractor (SimpMusic engine).
 * On Web or environments without the native module compiled, gracefully falls back to public instances.
 */
export async function extractAudioStream(videoId: string): Promise<ExtractedStream> {
  if (nativeModule && typeof nativeModule.extractAudioStream === 'function') {
    try {
      const res = await nativeModule.extractAudioStream(videoId);
      if (res && res.success && res.streamUrl) {
        return res as ExtractedStream;
      }
    } catch (err: any) {
      console.warn('[YouTubeExtractor] Native extraction warning:', err.message);
    }
  }

  // Graceful fallback for Web and preview environments
  return fallbackExtractAudioStream(videoId);
}

export interface YouTubeSearchResult {
  videoId: string;
  url?: string;
  title: string;
  author: string;
  duration?: number;
  thumbnailUrl?: string;
}

export interface SearchResponse {
  success: boolean;
  results: YouTubeSearchResult[];
  error?: string;
}

/**
 * Searches YouTube natively on Android via NewPipeExtractor.
 */
export async function searchYouTube(query: string): Promise<SearchResponse> {
  if (nativeModule && typeof nativeModule.searchYouTube === 'function') {
    try {
      const res = await nativeModule.searchYouTube(query);
      if (res && res.success && Array.isArray(res.results)) {
        return res as SearchResponse;
      }
    } catch (err: any) {
      console.warn('[YouTubeExtractor] Native search warning:', err.message);
    }
  }

  return {
    success: false,
    results: [],
    error: 'Native search unavailable in this environment',
  };
}

export interface DownloadToFileResult {
  success: boolean;
  bytesWritten?: number;
  error?: string;
}

/**
 * Downloads a media stream URL directly to a local file using Android OkHttp native client.
 */
export async function downloadToFile(
  url: string,
  destinationPath: string
): Promise<DownloadToFileResult> {
  if (nativeModule && typeof nativeModule.downloadToFile === 'function') {
    try {
      const res = await nativeModule.downloadToFile(url, destinationPath);
      return res as DownloadToFileResult;
    } catch (err: any) {
      console.warn('[YouTubeExtractor] Native download error:', err.message);
      return {
        success: false,
        error: err.message || 'Native download failed',
      };
    }
  }

  return {
    success: false,
    error: 'Native downloader unavailable on this platform',
  };
}

export default {
  extractAudioStream,
  searchYouTube,
  downloadToFile,
};

