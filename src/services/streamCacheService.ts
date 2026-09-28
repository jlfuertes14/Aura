// High-Performance Stream Audio & Lyrics Cache Service
// Automatically caches streamed YouTube audio files (.m4a) and synced lyrics locally
// Prevents device overheating, CPU baseband drain, and repeated network re-buffering
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadToFile } from '../../modules/youtube-extractor';
import { fetchLyrics } from './lyricsService';

export interface CachedStreamMeta {
  trackId: string;
  videoId?: string;
  fileName: string;
  fileUri: string;
  fileSize: number;
  lastAccessedAt: number;
  cachedAt: number;
}

const CACHE_INDEX_KEY = '@music_player/stream_cache_index_v1';
const STREAM_CACHE_DIR =
  Platform.OS !== 'web' && FileSystem.cacheDirectory
    ? `${FileSystem.cacheDirectory}stream_cache/`
    : '';

// Target upper limit: 300 MB (~60 tracks), prune down to 200 MB on overflow
const MAX_CACHE_BYTES = 300 * 1024 * 1024;
const TARGET_CACHE_BYTES = 200 * 1024 * 1024;
const MIN_VALID_AUDIO_BYTES = 50 * 1024; // 50 KB

class StreamCacheService {
  private cacheIndex: Map<string, CachedStreamMeta> = new Map();
  private isInitialized: boolean = false;
  private inFlightDownloads: Map<string, Promise<string | null>> = new Map();

  /**
   * Initializes stream cache directory and loads existing metadata index.
   */
  public async init(): Promise<void> {
    if (this.isInitialized || Platform.OS === 'web' || !STREAM_CACHE_DIR) {
      return;
    }

    try {
      const dirInfo = await FileSystem.getInfoAsync(STREAM_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(STREAM_CACHE_DIR, { intermediates: true });
      }

      // Load persistent index from AsyncStorage
      const rawIndex = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (rawIndex) {
        const parsed: Record<string, CachedStreamMeta> = JSON.parse(rawIndex);
        for (const [key, meta] of Object.entries(parsed)) {
          this.cacheIndex.set(key, meta);
        }
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('Failed to initialize stream cache directory:', err);
    }
  }

  /**
   * Generates a safe file identifier from trackId or YouTube videoId.
   */
  private getSafeId(trackId: string, videoId?: string): string {
    const raw = videoId || trackId;
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Checks if an audio stream is already cached on disk.
   * Returns valid file:// URI if present and non-empty, otherwise null.
   */
  public async getCachedAudio(trackId: string, videoId?: string): Promise<string | null> {
    if (Platform.OS === 'web' || !STREAM_CACHE_DIR) return null;
    await this.init();

    const safeId = this.getSafeId(trackId, videoId);
    const targetFileUri = `${STREAM_CACHE_DIR}${safeId}.m4a`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(targetFileUri);
      if (fileInfo.exists && (fileInfo as any).size && (fileInfo as any).size >= MIN_VALID_AUDIO_BYTES) {
        // Update access time for LRU tracking
        const existing = this.cacheIndex.get(safeId) || {
          trackId,
          videoId,
          fileName: `${safeId}.m4a`,
          fileUri: targetFileUri,
          fileSize: (fileInfo as any).size,
          cachedAt: Date.now(),
          lastAccessedAt: Date.now(),
        };
        existing.lastAccessedAt = Date.now();
        this.cacheIndex.set(safeId, existing);
        this.persistIndexDebounced();

        return targetFileUri;
      }
    } catch {
      // File does not exist or cannot be accessed
    }

    return null;
  }

  /**
   * Caches a streaming audio URL to local storage in the background.
   * Also pre-caches lyrics so they are ready offline without heating up the phone.
   */
  public async cacheStreamAudio(
    trackId: string,
    audioUrl: string,
    videoId?: string,
    trackTitle?: string,
    trackArtist?: string,
    duration?: number
  ): Promise<string | null> {
    if (Platform.OS === 'web' || !STREAM_CACHE_DIR) return null;
    if (!audioUrl || audioUrl.startsWith('file://')) return null;

    await this.init();

    const safeId = this.getSafeId(trackId, videoId);
    const targetFileUri = `${STREAM_CACHE_DIR}${safeId}.m4a`;

    // 1. If already in flight, return active promise to avoid duplicate downloads
    if (this.inFlightDownloads.has(safeId)) {
      return this.inFlightDownloads.get(safeId)!;
    }

    // 2. Check if already cached
    const existing = await this.getCachedAudio(trackId, videoId);
    if (existing) {
      // Also ensure lyrics are cached
      if (trackTitle && trackArtist) {
        fetchLyrics(trackTitle, trackArtist, duration, trackId).catch(() => {});
      }
      return existing;
    }

    // 3. Initiate background download task
    const downloadPromise = (async () => {
      try {
        let success = false;

        // Try native OkHttp downloader first on Android for maximum speed & reliability
        if (Platform.OS === 'android') {
          try {
            const nativeRes = await downloadToFile(audioUrl, targetFileUri);
            if (nativeRes && nativeRes.success && (nativeRes.bytesWritten || 0) >= MIN_VALID_AUDIO_BYTES) {
              success = true;
            }
          } catch (nativeErr) {
            console.warn('Native stream cache download note, using FileSystem fallback:', nativeErr);
          }
        }

        // Fallback to FileSystem.downloadAsync
        if (!success) {
          const result = await FileSystem.downloadAsync(audioUrl, targetFileUri, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
              'Accept': '*/*',
            },
          });
          if (result && result.status >= 200 && result.status < 300) {
            success = true;
          }
        }

        // Verify downloaded file size
        const fileInfo = await FileSystem.getInfoAsync(targetFileUri);
        const actualSize = (fileInfo as any).size || 0;

        if (success && fileInfo.exists && actualSize >= MIN_VALID_AUDIO_BYTES) {
          const meta: CachedStreamMeta = {
            trackId,
            videoId,
            fileName: `${safeId}.m4a`,
            fileUri: targetFileUri,
            fileSize: actualSize,
            cachedAt: Date.now(),
            lastAccessedAt: Date.now(),
          };

          this.cacheIndex.set(safeId, meta);
          this.persistIndexDebounced();

          // Also trigger background lyrics fetch and offline cache
          if (trackTitle && trackArtist) {
            fetchLyrics(trackTitle, trackArtist, duration, trackId).catch(() => {});
          }

          // Trigger background LRU eviction check
          this.pruneCacheIfNeeded().catch(() => {});

          return targetFileUri;
        } else {
          // Clean up corrupt/partial file
          await FileSystem.deleteAsync(targetFileUri, { idempotent: true }).catch(() => {});
          return null;
        }
      } catch (err) {
        console.warn(`Failed to background cache stream for track ${trackId}:`, err);
        await FileSystem.deleteAsync(targetFileUri, { idempotent: true }).catch(() => {});
        return null;
      } finally {
        this.inFlightDownloads.delete(safeId);
      }
    })();

    this.inFlightDownloads.set(safeId, downloadPromise);
    return downloadPromise;
  }

  /**
   * Automatically removes oldest accessed tracks if stream cache exceeds maximum bounds.
   */
  private async pruneCacheIfNeeded(): Promise<void> {
    if (Platform.OS === 'web' || !STREAM_CACHE_DIR) return;

    try {
      let totalBytes = 0;
      const entries: CachedStreamMeta[] = [];

      for (const meta of this.cacheIndex.values()) {
        totalBytes += meta.fileSize || 0;
        entries.push(meta);
      }

      if (totalBytes <= MAX_CACHE_BYTES) {
        return;
      }

      // Sort by last accessed time (oldest first)
      entries.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

      for (const item of entries) {
        if (totalBytes <= TARGET_CACHE_BYTES) break;

        const safeId = this.getSafeId(item.trackId, item.videoId);
        try {
          await FileSystem.deleteAsync(item.fileUri, { idempotent: true });
          totalBytes -= item.fileSize || 0;
          this.cacheIndex.delete(safeId);
        } catch {}
      }

      this.persistIndexDebounced();
    } catch (err) {
      console.warn('Stream cache pruning warning:', err);
    }
  }

  private persistTimeout: any = null;
  private persistIndexDebounced(): void {
    if (this.persistTimeout) clearTimeout(this.persistTimeout);
    this.persistTimeout = setTimeout(async () => {
      try {
        const obj: Record<string, CachedStreamMeta> = {};
        for (const [k, v] of this.cacheIndex.entries()) {
          obj[k] = v;
        }
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(obj));
      } catch {}
    }, 2000);
  }

  /**
   * Clears the entire stream audio cache.
   */
  public async clearCache(): Promise<void> {
    if (Platform.OS === 'web' || !STREAM_CACHE_DIR) return;

    try {
      await FileSystem.deleteAsync(STREAM_CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(STREAM_CACHE_DIR, { intermediates: true });
      this.cacheIndex.clear();
      await AsyncStorage.removeItem(CACHE_INDEX_KEY);
    } catch (err) {
      console.warn('Failed to clear stream cache:', err);
    }
  }
}

export const streamCacheService = new StreamCacheService();
