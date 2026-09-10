import { fetchApiWithFallback } from './apiConfig';

export interface LyricLine {
  time: number; // in seconds (e.g. 15.25)
  text: string;
}

export interface LyricsData {
  id?: number;
  trackName?: string;
  artistName?: string;
  plainLyrics?: string;
  syncedLines?: LyricLine[];
  isInstrumental?: boolean;
}

// In-memory cache for fast repeat access
const lyricsCache = new Map<string, LyricsData | null>();

/**
 * Extracts YouTube 11-character video ID from any track identifier or stream/thumbnail URL
 */
export function resolveTrackVideoId(track: { id?: string; videoId?: string; audioUrl?: string; artworkUrl?: string } | null): string | null {
  if (!track) return null;
  if (track.videoId && /^[a-zA-Z0-9_-]{11}$/.test(track.videoId)) {
    return track.videoId;
  }
  if (track.id) {
    const ytMatch = track.id.match(/^yt-([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return ytMatch[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(track.id)) return track.id;
  }
  if (track.audioUrl) {
    const queryMatch = track.audioUrl.match(/[?&]id=([a-zA-Z0-9_-]{11})/);
    if (queryMatch) return queryMatch[1];
  }
  if (track.artworkUrl) {
    const thumbMatch = track.artworkUrl.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
    if (thumbMatch) return thumbMatch[1];
  }
  return null;
}

/**
 * Sanitizes track title and artist by removing extraneous YouTube / video tags
 * Examples:
 *   "do re mi ft. Gucci Mane (Official Music Video)" -> "do re mi"
 *   "Ariana Grande - hate the other girl (ft. SZA)" -> "hate the other girl"
 */
export function cleanMusicString(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s*[\(\[](official\s*(music\s*)?video|lyrics?|audio|official|visualizer|hd|4k|mv|remastered|explicit)[\)\]]/gi, '')
    .replace(/\s*[\(\[](feat\.|ft\.|featuring).*?[\)\]]/gi, '')
    .replace(/\s*(feat\.|ft\.|featuring)\s+[^\-\(\[]+/gi, '')
    .trim();
}

/**
 * Parses standard LRC format strings into structured timed lines
 * Format: [mm:ss.xx] lyric text
 */
export function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const lines = lrcText.split(/\r?\n/);
  const parsedLines: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    timeRegex.lastIndex = 0;
    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    // Strip timestamp tags to get pure lyric text
    const text = trimmed.replace(timeRegex, '').trim();

    for (const match of matches) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const millisPart = match[3];
      let millis = 0;
      if (millisPart) {
        millis = millisPart.length === 2 ? parseInt(millisPart, 10) * 10 : parseInt(millisPart, 10);
      }

      const timeInSeconds = mins * 60 + secs + millis / 1000;
      parsedLines.push({
        time: parseFloat(timeInSeconds.toFixed(2)),
        text,
      });
    }
  }

  // Sort ascending by timestamp
  return parsedLines.sort((a, b) => a.time - b.time);
}

/**
 * Extracts true artist and track title from YouTube titles formatted like "Artist - Title"
 * e.g. title: "Blackbear - Do Re Mi", artist: "Lost Panda" (channel name)
 * -> returns artist: "Blackbear", title: "Do Re Mi"
 */
export function extractArtistAndTitle(rawTitle: string, rawArtist: string): { title: string; artist: string } {
  let cleanedTitle = cleanMusicString(rawTitle);
  let cleanedArtist = cleanMusicString(rawArtist);

  // Check if title has "Artist - Track"
  const hyphenMatches = cleanedTitle.split(/\s+[-–—:]\s+/);
  if (hyphenMatches.length >= 2) {
    const extractedArtist = hyphenMatches[0].trim();
    const extractedTitle = hyphenMatches.slice(1).join(' - ').trim();
    if (extractedArtist && extractedTitle) {
      return {
        artist: extractedArtist,
        title: extractedTitle,
      };
    }
  }

  return {
    artist: cleanedArtist,
    title: cleanedTitle,
  };
}

/**
 * Fetches lyrics with smart title/artist resolution and companion server proxy
 */
export async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number
): Promise<LyricsData | null> {
  const parsed = extractArtistAndTitle(title, artist);
  const cleanTitle = parsed.title;
  const cleanArtist = parsed.artist;
  const cacheKey = `${cleanArtist.toLowerCase()}:::${cleanTitle.toLowerCase()}`;

  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey) || null;
  }

  try {
    let data: any = null;

    // Strategy 1: Route through companion proxy (bypasses browser CORS & Cloudflare 503)
    try {
      const proxyPath = `/api/lyrics?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}${duration ? `&duration=${Math.round(duration)}` : ''}`;
      const proxyRes = await fetchApiWithFallback(proxyPath);
      if (proxyRes.ok) {
        data = await proxyRes.json();
      }
    } catch {
      // Quietly continue to direct LRCLIB lookup
    }

    // Strategy 2: Direct LRCLIB query if proxy did not return data
    if (!data) {
      const headers = {
        'User-Agent': 'MusicPlayerApp/1.0 (https://github.com/expo/music-player)',
        'Lrclib-Client': 'MusicPlayerApp/1.0',
      };

      try {
        let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
        if (duration && duration > 0) {
          url += `&duration=${Math.round(duration)}`;
        }

        const res = await fetch(url, { headers });
        if (res.ok) {
          data = await res.json();
        } else if (res.status === 404) {
          const query = `${cleanArtist} ${cleanTitle}`.trim();
          const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
          const searchRes = await fetch(searchUrl, { headers });
          if (searchRes.ok) {
            const searchResults = await searchRes.json();
            if (Array.isArray(searchResults) && searchResults.length > 0) {
              data = searchResults.find((item: any) => item.syncedLyrics) || searchResults[0];
            }
          }
        }
      } catch (directErr) {
        console.warn('Direct LRCLIB fetch error:', directErr);
      }
    }

    if (data) {
      const isInstrumental = Boolean(data.instrumental);
      const syncedLines = data.syncedLyrics ? parseLrc(data.syncedLyrics) : undefined;
      const plainLyrics = data.plainLyrics || undefined;

      const result: LyricsData = {
        id: data.id,
        trackName: data.trackName,
        artistName: data.artistName,
        isInstrumental,
        plainLyrics,
        syncedLines: syncedLines && syncedLines.length > 0 ? syncedLines : undefined,
      };

      lyricsCache.set(cacheKey, result);
      return result;
    }

    // Fallback for Curated Demo Tracks (if offline or royalty-free)
    const demoLyrics = getCuratedDemoLyrics(cleanTitle);
    if (demoLyrics) {
      lyricsCache.set(cacheKey, demoLyrics);
      return demoLyrics;
    }

    lyricsCache.set(cacheKey, null);
    return null;
  } catch (error) {
    console.warn('Lyrics fetch error:', error);
    const demoLyrics = getCuratedDemoLyrics(cleanTitle);
    if (demoLyrics) return demoLyrics;
    return null;
  }
}

/**
 * Built-in synchronized lyrics for curated soundscapes
 */
function getCuratedDemoLyrics(cleanTitle: string): LyricsData | null {
  const lower = cleanTitle.toLowerCase();
  if (lower.includes('midnight city') || lower.includes('lofi')) {
    const lrc = `
[00:00.00] (Rain falling outside the Tokyo window)
[00:05.20] Soft glow on the midnight avenue
[00:12.50] Lo-Fi tape hums in the quiet room
[00:20.10] City lights blur beneath the indigo sky
[00:28.40] Watching raindrops trace the neon signs
[00:36.80] Deep breath, let the frequency ease your mind
[00:45.10] Endless loop of tranquil night
[00:54.00] Where dreams and shadows intertwine
[01:04.00] (Instrumental warmth continues...)
`;
    return {
      trackName: 'Midnight City Vibes',
      artistName: 'Lofi Dreamer',
      syncedLines: parseLrc(lrc),
      plainLyrics: lrc.replace(/\[.*?\]\s*/g, '').trim(),
    };
  }

  if (lower.includes('neon odyssey') || lower.includes('synthwave')) {
    const lrc = `
[00:00.00] (Analog synthesizers ignite)
[00:08.30] Cruising 88 through the grid of night
[00:16.20] Laser horizon glowing in magenta red
[00:24.00] Retro memories rushing inside my head
[00:32.40] Neon odyssey beneath the digital sun
[00:40.50] Speed of sound, the midnight run
[00:48.00] Cyber dreams in full high definition
[00:56.00] (Electric bass overdrive crescendo)
`;
    return {
      trackName: 'Neon Odyssey',
      artistName: 'Cyberwave 84',
      syncedLines: parseLrc(lrc),
      plainLyrics: lrc.replace(/\[.*?\]\s*/g, '').trim(),
    };
  }

  if (lower.includes('acoustic') || lower.includes('sunny morning')) {
    const lrc = `
[00:00.00] (Fingerpicked acoustic guitar resonance)
[00:06.10] Golden light pours through the blinds
[00:14.20] Gentle morning peace of mind
[00:22.00] Fresh coffee steam rises slow
[00:30.30] A brand new day begins to glow
[00:38.50] Simple warmth on wooden strings
[00:46.00] Harmony that quiet brings
`;
    return {
      trackName: 'Sunny Morning Acoustic',
      artistName: 'Oak & String',
      syncedLines: parseLrc(lrc),
      plainLyrics: lrc.replace(/\[.*?\]\s*/g, '').trim(),
    };
  }

  return null;
}
