// Universal Storage & File System Manager
// Supports Native (iOS & Android via expo-file-system) AND Web (Browser storage & automatic blob file downloads)
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, Playlist } from '../types/music';
import { fetchLyrics, saveOfflineLyrics, deleteOfflineLyrics } from './lyricsService';

const STORAGE_KEYS = {
  DOWNLOADED_TRACKS: '@music_player/downloaded_tracks',
  FAVORITES: '@music_player/favorites',
  PLAYLISTS: '@music_player/playlists',
  RECENT_TRACKS: '@music_player/recent_tracks',
};

// Base folders in device persistent storage (Native only)
const MUSIC_DIR = Platform.OS !== 'web' && FileSystem.documentDirectory ? `${FileSystem.documentDirectory}music/` : '';
const ARTWORK_DIR = Platform.OS !== 'web' && FileSystem.documentDirectory ? `${FileSystem.documentDirectory}artworks/` : '';

/**
 * Initializes required directories on native mobile devices. Safe no-op on Web.
 */
export async function initStorage(): Promise<void> {
  if (Platform.OS === 'web' || !MUSIC_DIR) {
    return;
  }

  try {
    const musicDirInfo = await FileSystem.getInfoAsync(MUSIC_DIR);
    if (!musicDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(MUSIC_DIR, { intermediates: true });
    }

    const artworkDirInfo = await FileSystem.getInfoAsync(ARTWORK_DIR);
    if (!artworkDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(ARTWORK_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Failed to initialize native storage directories:', error);
  }
}

/**
 * Formats bytes into human-readable string (e.g., 4.2 MB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(1)} MB`;
}

/**
 * Downloads an MP3 file directly onto the user's phone or computer.
 * On Native: Saves directly to persistent app storage (FileSystem.documentDirectory).
 * On Web: Downloads the .mp3 file to the user's downloads folder and registers it in offline library.
 */
export async function downloadTrackToDevice(
  track: Track,
  onProgress?: (progress: number) => void
): Promise<Track> {
  // WEB PLATFORM IMPLEMENTATION
  if (Platform.OS === 'web') {
    if (onProgress) onProgress(0.25);

    // Trigger browser file download so the user gets the .mp3 file saved to their computer
    if (typeof document !== 'undefined') {
      try {
        const isStreamEndpoint = track.audioUrl.includes('/api/stream');
        const downloadHref = isStreamEndpoint
          ? track.audioUrl.replace('/api/stream', '/api/download') + `&title=${encodeURIComponent(track.title)}`
          : track.audioUrl;
        const link = document.createElement('a');
        link.href = downloadHref;
        link.download = `${track.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp3`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.warn('Web file download trigger note:', err);
      }
    }

    if (onProgress) onProgress(0.75);

    const downloadedTrack: Track = {
      ...track,
      isDownloaded: true,
      localUri: track.audioUrl,
      fileSize: track.fileSize || '4.1 MB',
      downloadDate: new Date().toISOString(),
    };

    await saveDownloadedTrack(downloadedTrack);

    // Save offline lyrics on web as well
    try {
      const lyrics = await fetchLyrics(track.title, track.artist, track.duration, track.id);
      if (lyrics) {
        await saveOfflineLyrics(track.id, track.title, track.artist, lyrics);
      }
    } catch {}

    if (onProgress) onProgress(1.0);
    return downloadedTrack;
  }

  // NATIVE MOBILE (iOS & ANDROID) IMPLEMENTATION
  await initStorage();

  const safeId = track.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetFileUri = `${MUSIC_DIR}${safeId}.mp3`;
  const targetArtworkUri = `${ARTWORK_DIR}${safeId}.jpg`;

  try {
    // 1. Download audio file with real-time percentage progress
    const downloadResumable = FileSystem.createDownloadResumable(
      track.audioUrl,
      targetFileUri,
      {},
      (downloadProgress) => {
        const total = downloadProgress.totalBytesExpectedToWrite;
        const written = downloadProgress.totalBytesWritten;
        if (total > 0 && onProgress) {
          const progress = written / total;
          onProgress(Math.min(progress, 0.99));
        }
      }
    );

    const downloadResult = await downloadResumable.downloadAsync();
    if (!downloadResult || !downloadResult.uri) {
      throw new Error('Download failed: No URI returned from FileSystem');
    }

    // 2. Cache artwork locally if remote
    let localArtworkUri = track.artworkUrl;
    if (track.artworkUrl && track.artworkUrl.startsWith('http')) {
      try {
        const artResult = await FileSystem.downloadAsync(track.artworkUrl, targetArtworkUri);
        if (artResult.uri) {
          localArtworkUri = artResult.uri;
        }
      } catch {
        // Fallback to remote artwork
      }
    }

    // 3. Inspect saved file size
    const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
    const sizeFormatted = fileInfo.exists && (fileInfo as any).size ? formatBytes((fileInfo as any).size) : '3.8 MB';

    // 4. Construct updated Track object with native file URI
    const downloadedTrack: Track = {
      ...track,
      isDownloaded: true,
      localUri: downloadResult.uri,
      artworkUrl: localArtworkUri,
      fileSize: sizeFormatted,
      downloadDate: new Date().toISOString(),
    };

    // 5. Download & persist synchronized lyrics for offline playback
    try {
      const lyrics = await fetchLyrics(track.title, track.artist, track.duration, track.id);
      if (lyrics) {
        await saveOfflineLyrics(track.id, track.title, track.artist, lyrics);
      }
    } catch {}

    // 6. Index into local offline database
    await saveDownloadedTrack(downloadedTrack);

    if (onProgress) {
      onProgress(1.0);
    }

    return downloadedTrack;
  } catch (error) {
    console.error(`Error downloading track ${track.title}:`, error);
    throw error;
  }
}

/**
 * Saves a track's metadata to the offline downloaded tracks list in AsyncStorage.
 */
export async function saveDownloadedTrack(track: Track): Promise<void> {
  try {
    const existing = await getDownloadedTracks();
    const updated = [track, ...existing.filter((t) => t.id !== track.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_TRACKS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save track to AsyncStorage:', error);
  }
}

/**
 * Retrieves all offline downloaded tracks stored on the device.
 */
export async function getDownloadedTracks(): Promise<Track[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_TRACKS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load downloaded tracks from AsyncStorage:', error);
    return [];
  }
}

/**
 * Deletes a downloaded MP3 file from the device storage and removes it from the index.
 */
export async function deleteDownloadedTrack(trackId: string): Promise<void> {
  try {
    if (Platform.OS !== 'web' && MUSIC_DIR) {
      const safeId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetFileUri = `${MUSIC_DIR}${safeId}.mp3`;
      const targetArtworkUri = `${ARTWORK_DIR}${safeId}.jpg`;

      await FileSystem.deleteAsync(targetFileUri, { idempotent: true }).catch(() => {});
      await FileSystem.deleteAsync(targetArtworkUri, { idempotent: true }).catch(() => {});
    }

    // Remove offline lyrics
    await deleteOfflineLyrics(trackId).catch(() => {});

    // Remove from AsyncStorage
    const existing = await getDownloadedTracks();
    const updated = existing.filter((t) => t.id !== trackId);
    await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_TRACKS, JSON.stringify(updated));
  } catch (error) {
    console.error(`Failed to delete track ${trackId}:`, error);
  }
}

// ---------------- FAVORITES & PLAYLISTS ---------------- //

export async function getFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleFavoriteId(trackId: string): Promise<string[]> {
  try {
    const favorites = await getFavorites();
    const isFav = favorites.includes(trackId);
    const updated = isFav ? favorites.filter((id) => id !== trackId) : [...favorites, trackId];
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    if (raw) return JSON.parse(raw);
    
    // Default initial playlists
    const defaults: Playlist[] = [
      {
        id: 'pl-favorites',
        name: 'Liked Songs',
        description: 'Your favorite tracks',
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
        tracks: [],
        isCustom: false,
      },
      {
        id: 'pl-offline',
        name: 'Offline Mix',
        description: 'Downloaded music ready for no-internet listening',
        coverUrl: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=600&q=80',
        tracks: [],
        isCustom: false,
      },
    ];
    await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(defaults));
    return defaults;
  } catch {
    return [];
  }
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  } catch (error) {
    console.error('Failed to save playlists:', error);
  }
}
