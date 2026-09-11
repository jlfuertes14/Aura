import { Track, ArtworkPalette, SpotifyPlaylistResult } from '../types/music';
import { getApiBaseUrl, fetchApiWithFallback } from './apiConfig';

// Helper to construct companion streaming audio URLs
export function getCuratedStreamUrl(videoId: string): string {
  return `${getApiBaseUrl(5000)}/api/stream?id=${videoId}`;
}
export const getStreamUrl = getCuratedStreamUrl;

// Curated local images bundled into the binary app
export const LOCAL_IMAGES: Record<string, any> = {
  lofi_city: require('../../assets/images/lofi_city.jpg'),
  synthwave_grid: require('../../assets/images/synthwave_grid.jpg'),
  acoustic_morning: require('../../assets/images/acoustic_morning.jpg'),
  ambient_astral: require('../../assets/images/ambient_astral.jpg'),
  edm_pulse: require('../../assets/images/edm_pulse.jpg'),
  hiphop_street: require('../../assets/images/hiphop_street.jpg'),
  empty_library: require('../../assets/images/empty_library.jpg'),
};

/**
 * Universal artwork resolver that works for:
 * 1. Bundled local assets (lofi_city, empty_library, etc.)
 * 2. Remote YouTube thumbnails (https://img.youtube.com/...)
 * 3. Remote Spotify/CDN images
 * 4. Custom file system URIs (file:///...)
 */
export function resolveArtworkSource(artworkUrl?: string | number | null): any {
  if (!artworkUrl) {
    return LOCAL_IMAGES.empty_library;
  }
  if (typeof artworkUrl === 'number') {
    return artworkUrl;
  }
  if (typeof artworkUrl === 'string') {
    if (
      artworkUrl.startsWith('http://') ||
      artworkUrl.startsWith('https://') ||
      artworkUrl.startsWith('file://') ||
      artworkUrl.startsWith('data:')
    ) {
      return { uri: artworkUrl };
    }
    const lower = artworkUrl.toLowerCase();
    for (const key of Object.keys(LOCAL_IMAGES)) {
      if (lower.includes(key)) {
        return LOCAL_IMAGES[key];
      }
    }
    return { uri: artworkUrl };
  }
  return LOCAL_IMAGES.empty_library;
}

export const EMPTY_LIBRARY_ARTWORK = 'empty_library';

// Curated authentic hit tracks with verified YouTube audio streams and synchronized LRCLIB lyrics
export const CURATED_TRACKS: Track[] = [
  {
    id: 'curated-paradise',
    title: 'PARADISE',
    artist: 'Chase Atlantic',
    album: 'BEAUTY IN DEATH (Deluxe Edition)',
    duration: 256,
    artworkUrl: 'https://img.youtube.com/vi/4tijiFGhBN8/hqdefault.jpg',
    audioUrl: getStreamUrl('4tijiFGhBN8'),
    isDownloaded: false,
    source: 'youtube',
    genre: 'Alt R&B',
    videoId: '4tijiFGhBN8',
  },
  {
    id: 'curated-blinding-lights',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200,
    artworkUrl: 'https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    audioUrl: getStreamUrl('4NRXx6U8ABQ'),
    isDownloaded: false,
    source: 'youtube',
    genre: 'Synthwave',
    videoId: '4NRXx6U8ABQ',
  },
  {
    id: 'curated-birds-of-a-feather',
    title: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    duration: 196,
    artworkUrl: 'https://img.youtube.com/vi/d5gf9dXbPi0/hqdefault.jpg',
    audioUrl: getStreamUrl('d5gf9dXbPi0'),
    isDownloaded: false,
    source: 'youtube',
    genre: 'Alt Pop',
    videoId: 'd5gf9dXbPi0',
  },
  {
    id: 'curated-fein',
    title: 'FE!N',
    artist: 'Travis Scott',
    album: 'UTOPIA',
    duration: 191,
    artworkUrl: 'https://img.youtube.com/vi/B9synWjqBn8/hqdefault.jpg',
    audioUrl: getStreamUrl('B9synWjqBn8'),
    isDownloaded: false,
    source: 'youtube',
    genre: 'Hip Hop',
    videoId: 'B9synWjqBn8',
  },
  {
    id: 'curated-505',
    title: '505',
    artist: 'Arctic Monkeys',
    album: 'Favourite Worst Nightmare',
    duration: 253,
    artworkUrl: 'https://img.youtube.com/vi/qU9mHegkTc4/hqdefault.jpg',
    audioUrl: getStreamUrl('qU9mHegkTc4'),
    isDownloaded: false,
    source: 'youtube',
    genre: 'Indie Rock',
    videoId: 'qU9mHegkTc4',
  },
  {
    id: 'curated-snooze',
    title: 'Snooze',
    artist: 'SZA',
    album: 'SOS',
    duration: 201,
    artworkUrl: 'https://img.youtube.com/vi/Sv5yCzPCkv8/hqdefault.jpg',
    audioUrl: getStreamUrl('Sv5yCzPCkv8'),
    isDownloaded: false,
    source: 'youtube',
    genre: 'R&B',
    videoId: 'Sv5yCzPCkv8',
  },
  {
    id: 'curated-chemical',
    title: 'Chemical',
    artist: 'Post Malone',
    album: 'AUSTIN',
    duration: 184,
    artworkUrl: 'https://img.youtube.com/vi/D2HMHH6sRBY/hqdefault.jpg',
    audioUrl: getStreamUrl('D2HMHH6sRBY'),
    isDownloaded: false,
    source: 'youtube',
    genre: 'Pop Rock',
    videoId: 'D2HMHH6sRBY',
  },
  {
    id: 'curated-levitating',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    duration: 203,
    artworkUrl: 'https://img.youtube.com/vi/TUVcZfQe-Kw/hqdefault.jpg',
    audioUrl: getStreamUrl('TUVcZfQe-Kw'),
    isDownloaded: false,
    source: 'youtube',
    genre: 'Dance Pop',
    videoId: 'TUVcZfQe-Kw',
  },
];

export interface YouTubeInfo {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  url: string;
}

/**
 * Extracts YouTube Video ID from any standard URL format:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtube.com/shorts/dQw4w9WgXcQ
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regex);
  return match && match[1] ? match[1] : null;
}

/**
 * Fetches YouTube video metadata without an API key using YouTube's official oEmbed endpoint.
 */
export async function getYouTubeMetadata(url: string): Promise<YouTubeInfo | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    const data = await response.json();

    return {
      videoId,
      title: data.title || 'YouTube Audio Track',
      author: data.author_name || 'YouTube Creator',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (error) {
    // Fallback thumbnail if oEmbed fails
    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      author: 'YouTube',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }
}

export interface ResolvedYouTubeAudio {
  audioUrl: string;
  downloadUrl: string;
  palette?: ArtworkPalette;
  isCleanStudio?: boolean;
  studioVideoId?: string;
  studioTitle?: string;
  studioDuration?: number;
}

/**
 * Resolves the genuine audio stream URL for a YouTube video.
 * Routes directly to Metro's backend API endpoint on port 8081 (or port 5000).
 * Automatically substitutes Music Videos with clean studio audio (no skits, no intros).
 */
export async function resolveYouTubeAudioStream(
  videoId: string,
  title?: string
): Promise<ResolvedYouTubeAudio> {
  try {
    const apiPath = `/api/audio?id=${videoId}`;
    console.log(`[AUDIO STREAM] Requesting YouTube stream for ${videoId}`);

    const response = await fetchApiWithFallback(apiPath);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.audioUrl || data.streamUrl) {
      const audioUrl = data.audioUrl || data.streamUrl;
      const targetId = data.studioVideoId || data.videoId || videoId;
      const titleParam = title ? `&title=${encodeURIComponent(title)}` : '';
      const downloadUrl = data.downloadUrl || `${getApiBaseUrl(5000)}/api/download?id=${targetId}${titleParam}`;

      console.log(`[AUDIO STREAM] Successfully resolved stream URL:`, audioUrl, data.isCleanStudio ? '(Clean Studio Audio)' : '');
      return {
        audioUrl,
        downloadUrl,
        palette: data.palette || undefined,
        isCleanStudio: !!data.isCleanStudio,
        studioVideoId: targetId,
        studioTitle: data.studioTitle || undefined,
        studioDuration: typeof data.studioDuration === 'number' ? data.studioDuration : undefined,
      };
    } else {
      throw new Error(data.error || 'No audio stream returned from server');
    }
  } catch (err: any) {
    console.error(`[AUDIO STREAM ERROR] Failed to resolve YouTube audio for ${videoId}:`, err);
    throw new Error(
      `Unable to extract audio from YouTube: ${err.message || 'Server connection timeout'}. Please ensure Metro or server is running.`
    );
  }
}

/**
 * Fetches and extracts a Spotify playlist via the companion backend API.
 * Returns parsed playlist metadata and tracks without requiring Spotify API credentials.
 */
export async function fetchSpotifyPlaylist(playlistUrl: string): Promise<SpotifyPlaylistResult> {
  const apiPath = `/api/spotify/playlist?url=${encodeURIComponent(playlistUrl)}`;
  console.log(`[SPOTIFY SERVICE] Fetching Spotify playlist:`, playlistUrl);

  const response = await fetchApiWithFallback(apiPath);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch Spotify playlist (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (data.success && data.playlist) {
    return data.playlist as SpotifyPlaylistResult;
  }
  throw new Error(data.error || 'Failed to parse Spotify playlist');
}

export interface MatchResolvedTrack {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  audioUrl: string;
  downloadUrl: string;
  artworkUrl?: string;
  palette?: ArtworkPalette;
}

/**
 * Resolves a Spotify (or query-based) track to its YouTube audio stream counterpart on demand.
 */
export async function resolveTrackAudio(track: Track): Promise<MatchResolvedTrack> {
  // If track already has a working YouTube videoId, we can directly stream it
  if (track.videoId && track.source !== 'spotify') {
    const audioUrl = `${getApiBaseUrl(5000)}/api/stream?id=${track.videoId}`;
    const downloadUrl = `${getApiBaseUrl(5000)}/api/download?id=${track.videoId}&title=${encodeURIComponent(track.title)}`;
    return {
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      audioUrl,
      downloadUrl,
      artworkUrl: track.artworkUrl,
      palette: track.palette,
    };
  }

  const query = `${track.artist} ${track.title}`.trim();
  const apiPath = `/api/resolve?q=${encodeURIComponent(query)}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`;
  console.log(`[RESOLVE SERVICE] Resolving audio stream for "${query}"`);

  const response = await fetchApiWithFallback(apiPath);
  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status} resolving track audio`);
  }

  const data = await response.json();
  if (data.success && data.videoId) {
    const finalArtwork = (track.source === 'spotify' && track.artworkUrl)
      ? track.artworkUrl
      : (track.artworkUrl || data.artworkUrl);

    return {
      videoId: data.videoId,
      title: data.title || track.title,
      artist: data.artist || track.artist,
      duration: data.duration || track.duration,
      audioUrl: data.audioUrl,
      downloadUrl: data.downloadUrl,
      artworkUrl: finalArtwork,
      palette: data.palette || track.palette,
    };
  }

  throw new Error(data.error || 'Unable to resolve matching audio stream');
}

export { fetchRemoteArtworkPalette } from '../utils/artworkColors';


