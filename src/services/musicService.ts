import { Track, ArtworkPalette } from '../types/music';
import { getApiBaseUrl, fetchApiWithFallback } from './apiConfig';

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
 * 2. Pre-existing cached HTTP URLs (e.g. localhost:5000/assets/images/...)
 * 3. Remote YouTube thumbnails (https://img.youtube.com/...)
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

// Curated royalty-free tracks with bespoke high-fidelity cover artwork & streams
export const CURATED_TRACKS: Track[] = [
  {
    id: 'curated-1',
    title: 'Midnight City Vibes',
    artist: 'Lofi Dreamer',
    album: 'Chillhop Horizons',
    duration: 165,
    artworkUrl: 'lofi_city',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    isDownloaded: false,
    source: 'curated',
    genre: 'Lofi',
    lyrics: [
      'Neon lights through the rainy glass',
      'Watching midnight shadows pass',
      'Coffee brewing, tempo slow',
      'Lost inside this gentle glow',
      'Tape deck winding through the beat',
      'Empty rhythm down the street',
      'Let the city drift away',
      'Waiting for another day',
    ],
  },
  {
    id: 'curated-2',
    title: 'Neon Odyssey',
    artist: 'Cyberwave 84',
    album: 'Retrogrid Future',
    duration: 198,
    artworkUrl: 'synthwave_grid',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=synthwave-80s-110045.mp3',
    isDownloaded: false,
    source: 'curated',
    genre: 'Synthwave',
    lyrics: [
      'Accelerating past the digital line',
      'Grid lines glowing in the summer time',
      'Synthesizers pulse into the night',
      'Chasing down the ultraviolet light',
      'Chrome reflections in the rear-view mirror',
      'Everything is getting clearer',
      'Outrun the horizon, break the speed',
      'Pure adrenaline is all we need',
    ],
  },
  {
    id: 'curated-3',
    title: 'Sunny Morning Acoustic',
    artist: 'Oak & String',
    album: 'Folk Reverie',
    duration: 142,
    artworkUrl: 'acoustic_morning',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=acoustic-guitars-ambient-10777.mp3',
    isDownloaded: false,
    source: 'curated',
    genre: 'Acoustic',
    lyrics: [
      'Golden sunlight on the wooden floor',
      'Gentle breeze through an open door',
      'Strings are humming with a quiet tone',
      'Peaceful moments that we call our own',
      'Time moves gently like an autumn leaf',
      'Finding solace in a calm belief',
    ],
  },
  {
    id: 'curated-4',
    title: 'Deep Focus Ambience',
    artist: 'Astral Flow',
    album: 'Neural Waves',
    duration: 210,
    artworkUrl: 'ambient_astral',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77348.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    isDownloaded: false,
    source: 'curated',
    genre: 'Ambient',
    lyrics: [
      '[Instrumental Harmonic Drone]',
      '[Subtle Ocean Resonances]',
      '[Binaural Waveform Shifts]',
      '[Deep Breath & Centering]',
    ],
  },
  {
    id: 'curated-5',
    title: 'Electric Pulse Workout',
    artist: 'Bass Overdrive',
    album: 'Velocity Club',
    duration: 185,
    artworkUrl: 'edm_pulse',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c340b10bc4.mp3?filename=electronic-future-beats-117997.mp3',
    isDownloaded: false,
    source: 'curated',
    genre: 'EDM',
    lyrics: [
      'Push the limit, feel the drive',
      'This is how we stay alive',
      'Beat drop heavy on the floor',
      'Energy is wanting more',
      'One two three, accelerate!',
    ],
  },
  {
    id: 'curated-6',
    title: 'Urban Sunset Groove',
    artist: 'Velvet Soul',
    album: 'Downtown Sessions',
    duration: 174,
    artworkUrl: 'hiphop_street',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=groove-lofi-hip-hop-118833.mp3',
    isDownloaded: false,
    source: 'curated',
    genre: 'Hip Hop',
    lyrics: [
      'Rooftop breeze as the sky turns red',
      'Quiet rhythm inside my head',
      'Soul chords ringing on the electric piano',
      'Smooth like vinyl, easy and slow',
    ],
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
      const downloadUrl = data.downloadUrl || `${getApiBaseUrl(8081)}/api/download?id=${targetId}${titleParam}`;

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

export { fetchRemoteArtworkPalette } from '../utils/artworkColors';


