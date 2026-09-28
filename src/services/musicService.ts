import { Track, ArtworkPalette, SpotifyPlaylistResult } from '../types/music';
import { getApiBaseUrl, fetchApiWithFallback } from './apiConfig';
import { extractAudioStream, searchYouTube } from '../../modules/youtube-extractor';

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
 * Uses on-device native NewPipeExtractor on Android (SimpMusic engine),
 * with graceful fallback to companion API server if available.
 */
export async function resolveYouTubeAudioStream(
  videoId: string,
  title?: string
): Promise<ResolvedYouTubeAudio> {
  console.log(`[AUDIO STREAM] Resolving audio stream for YouTube ID: ${videoId}`);

  // 1. Try on-device native extraction (SimpMusic engine via NewPipeExtractor)
  try {
    const extracted = await extractAudioStream(videoId);
    if (extracted && extracted.success && extracted.streamUrl) {
      console.log(
        `[AUDIO STREAM] On-device native extraction succeeded for ${videoId} (${extracted.format || 'm4a'}, ${extracted.bitrate || 128}kbps)`
      );
      return {
        audioUrl: extracted.streamUrl,
        downloadUrl: extracted.streamUrl,
        palette: undefined,
        isCleanStudio: false,
        studioVideoId: videoId,
        studioTitle: extracted.title || title,
        studioDuration: extracted.duration,
      };
    }
  } catch (nativeErr: any) {
    console.warn(`[AUDIO STREAM] On-device native extraction attempt failed:`, nativeErr?.message);
  }

  // 2. Fallback to companion local dev server if available (e.g. during local node development)
  try {
    const apiPath = `/api/audio?id=${videoId}`;
    console.log(`[AUDIO STREAM] Falling back to companion server for ${videoId}`);
    const response = await fetchApiWithFallback(apiPath);

    if (response.ok) {
      const data = await response.json();
      if (data.audioUrl || data.streamUrl) {
        const audioUrl = data.audioUrl || data.streamUrl;
        const targetId = data.studioVideoId || data.videoId || videoId;
        const titleParam = title ? `&title=${encodeURIComponent(title)}` : '';
        const downloadUrl = data.downloadUrl || `${getApiBaseUrl(5000)}/api/download?id=${targetId}${titleParam}`;

        console.log(`[AUDIO STREAM] Companion server resolved stream URL:`, audioUrl, data.isCleanStudio ? '(Clean Studio Audio)' : '');
        return {
          audioUrl,
          downloadUrl,
          palette: data.palette || undefined,
          isCleanStudio: !!data.isCleanStudio,
          studioVideoId: targetId,
          studioTitle: data.studioTitle || undefined,
          studioDuration: typeof data.studioDuration === 'number' ? data.studioDuration : undefined,
        };
      }
    }
  } catch (err: any) {
    console.warn(`[AUDIO STREAM] Companion server resolution failed for ${videoId}:`, err?.message);
  }

  throw new Error(`Unable to extract audio from YouTube for ID: ${videoId}`);
}

/**
 * Fetches the authentic high-resolution (640x640) album cover for a specific Spotify track.
 * Uses Spotify's public oEmbed service with automatic dimension upgrading.
 */
export async function fetchSpotifyTrackArtwork(spotifyUriOrTrackId: string): Promise<string | null> {
  const match = spotifyUriOrTrackId.match(/(?:track[:/])?([a-zA-Z0-9]{22})/);
  const trackId = match ? match[1] : spotifyUriOrTrackId;
  if (!trackId) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail_url && typeof data.thumbnail_url === 'string') {
        // Upgrade from 300x300 (1e02) to pristine 640x640 (b273)
        return data.thumbnail_url.replace('ab67616d00001e02', 'ab67616d0000b273');
      }
    }
  } catch {}
  return null;
}

/**
 * Direct client-side Spotify playlist metadata extractor.
 * Functions 100% offline from the companion server/Render by parsing Spotify's public embed page directly.
 */
export async function fetchSpotifyPlaylistDirect(playlistUrl: string): Promise<SpotifyPlaylistResult> {
  const match = playlistUrl.match(/(?:playlist\/|spotify:playlist:)([a-zA-Z0-9]+)/);
  if (!match) {
    throw new Error('Invalid Spotify playlist URL or ID');
  }
  const playlistId = match[1];
  const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;

  const res = await fetch(embedUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load Spotify playlist (HTTP ${res.status})`);
  }

  const html = await res.text();
  const idx = html.indexOf('__NEXT_DATA__');
  if (idx === -1) {
    throw new Error('Spotify playlist metadata not found. Ensure playlist is public.');
  }
  const start = html.indexOf('{', idx);
  const end = html.indexOf('</script>', start);
  const data = JSON.parse(html.slice(start, end));
  const entity = data.props?.pageProps?.state?.data?.entity;
  if (!entity) {
    throw new Error('Spotify playlist entity not found or playlist is private');
  }

  const playlistName = entity.name || 'Spotify Playlist';
  const coverUrl =
    entity.visualIdentity?.image?.[2]?.url ||
    entity.visualIdentity?.image?.[1]?.url ||
    entity.visualIdentity?.image?.[0]?.url ||
    entity.coverArt?.sources?.[0]?.url ||
    '';
  const rawTracks = entity.trackList || [];

  // Fetch individual album artwork for each track via Spotify's public oEmbed service in small batches
  const trackCoverMap = new Map<string, string>();
  const batchSize = 6;
  for (let i = 0; i < rawTracks.length; i += batchSize) {
    const batch = rawTracks.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item: any) => {
        const trackIdMatch = (item.uri || '').match(/track:([a-zA-Z0-9]+)/);
        if (!trackIdMatch) return;
        const id = trackIdMatch[1];
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const oembedRes = await fetch(
            `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${id}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            if (oembedData.thumbnail_url) {
              const highRes = oembedData.thumbnail_url.replace('ab67616d00001e02', 'ab67616d0000b273');
              trackCoverMap.set(item.uri, highRes);
            }
          }
        } catch {
          // Unresolved covers will be resolved on-demand
        }
      })
    );
  }

  const tracks: Track[] = rawTracks.map((item: any, trackIdx: number) => {
    const trackTitle = item.title || 'Track';
    const trackArtist = item.subtitle || 'Various Artists';
    const durationSec = Math.round((item.duration || 180000) / 1000);
    // Explicitly keep individual artwork distinct; never poison track.artworkUrl with the playlist collage
    const individualCover = trackCoverMap.get(item.uri) || '';

    return {
      id: `sp-${playlistId}-${trackIdx}-${Date.now()}`,
      title: trackTitle,
      artist: trackArtist,
      album: playlistName,
      duration: durationSec,
      artworkUrl: individualCover,
      audioUrl: '', // Resolved on-demand when clicked
      isDownloaded: false,
      source: 'spotify',
      spotifyUri: item.uri || '',
    };
  });

  return {
    id: playlistId,
    name: playlistName,
    description: entity.description || `Imported Spotify playlist (${tracks.length} tracks)`,
    coverUrl,
    trackCount: tracks.length,
    tracks,
  };
}

/**
 * Fetches and extracts a Spotify playlist via the companion backend API with automatic
 * seamless client-side direct fallback if companion server or Render is sleeping or unreachable.
 */
export async function fetchSpotifyPlaylist(playlistUrl: string): Promise<SpotifyPlaylistResult> {
  console.log(`[SPOTIFY SERVICE] Fetching Spotify playlist:`, playlistUrl);

  // 1. Try companion or cloud backend API first
  try {
    const apiPath = `/api/spotify/playlist?url=${encodeURIComponent(playlistUrl)}`;
    const response = await fetchApiWithFallback(apiPath);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.playlist) {
        return data.playlist as SpotifyPlaylistResult;
      }
    }
  } catch (backendErr: any) {
    console.warn('[SPOTIFY SERVICE] Backend API unreachable, falling back to direct client extraction:', backendErr?.message);
  }

  // 2. Direct client extraction fallback
  return fetchSpotifyPlaylistDirect(playlistUrl);
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
 * First leverages on-device YouTube extraction / search before falling back to companion server.
 */
export async function resolveTrackAudio(track: Track): Promise<MatchResolvedTrack> {
  // If track already has a working YouTube videoId, directly extract the audio stream on-device
  if (track.videoId && track.source !== 'spotify') {
    const resolved = await resolveYouTubeAudioStream(track.videoId, track.title);
    return {
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      duration: resolved.studioDuration || track.duration,
      audioUrl: resolved.audioUrl,
      downloadUrl: resolved.downloadUrl,
      artworkUrl: track.artworkUrl,
      palette: resolved.palette || track.palette,
    };
  }

  const query = `${track.artist} ${track.title}`.trim();
  console.log(`[RESOLVE SERVICE] Resolving audio stream for "${query}"`);

  // Check if current artwork is missing or was mistakenly set to the playlist collage (ab67706f)
  const isCollageOrEmpty = !track.artworkUrl ||
    track.artworkUrl.includes('ab67706f') ||
    track.artworkUrl.includes('empty_library');

  let trackArtwork = track.artworkUrl;
  if (track.source === 'spotify' && isCollageOrEmpty && track.spotifyUri) {
    try {
      const freshSpotifyArt = await fetchSpotifyTrackArtwork(track.spotifyUri);
      if (freshSpotifyArt) {
        trackArtwork = freshSpotifyArt;
      }
    } catch {}
  }

  // 1. Try on-device native search first
  try {
    const searchRes = await searchYouTube(query);
    if (searchRes && searchRes.success && searchRes.results.length > 0) {
      const bestMatch = searchRes.results[0];
      if (bestMatch.videoId) {
        console.log(`[RESOLVE SERVICE] On-device search matched: "${bestMatch.title}" (${bestMatch.videoId})`);
        const resolved = await resolveYouTubeAudioStream(bestMatch.videoId, bestMatch.title);
        
        // Never keep the playlist collage as the track's individual album art
        const finalArtwork = trackArtwork && !trackArtwork.includes('ab67706f')
          ? trackArtwork
          : (bestMatch.thumbnailUrl || track.artworkUrl);

        return {
          videoId: bestMatch.videoId,
          title: track.title || bestMatch.title,
          artist: track.artist || bestMatch.author,
          duration: resolved.studioDuration || bestMatch.duration || track.duration,
          audioUrl: resolved.audioUrl,
          downloadUrl: resolved.downloadUrl,
          artworkUrl: finalArtwork,
          palette: resolved.palette || track.palette,
        };
      }
    }
  } catch (searchErr: any) {
    console.warn('[RESOLVE SERVICE] Native search match failed, trying companion API:', searchErr?.message);
  }

  // 2. Fallback to companion backend API
  try {
    const apiPath = `/api/resolve?q=${encodeURIComponent(query)}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`;
    const response = await fetchApiWithFallback(apiPath);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.videoId) {
        const finalArtwork = trackArtwork && !trackArtwork.includes('ab67706f')
          ? trackArtwork
          : (data.artworkUrl || track.artworkUrl);

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
    }
  } catch (err: any) {
    console.error('[RESOLVE SERVICE] Failed to resolve track via companion API:', err);
  }

  throw new Error(`Unable to resolve matching audio stream for: ${track.artist} - ${track.title}`);
}


export { fetchRemoteArtworkPalette } from '../utils/artworkColors';


