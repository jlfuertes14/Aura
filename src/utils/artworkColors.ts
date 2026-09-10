// Dynamic Artwork Color Palette & Extraction Engine
// Derives vibrant accents, rich gradients, and ambient glows from album artwork
import { useState, useEffect } from 'react';
import { Track, ArtworkPalette } from '../types/music';
import { fetchApiWithFallback } from '../services/apiConfig';

export type { ArtworkPalette };

/**
 * Queries the backend to extract the authentic color palette from an album cover or YouTube thumbnail.
 */
export async function fetchRemoteArtworkPalette(target: string): Promise<ArtworkPalette | null> {
  if (!target) return null;
  try {
    const isUrl = target.startsWith('http://') || target.startsWith('https://');
    const param = isUrl ? `url=${encodeURIComponent(target)}` : `id=${encodeURIComponent(target)}`;
    const response = await fetchApiWithFallback(`/api/palette?${param}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.primary && data.gradient && Array.isArray(data.gradient)) {
        return data as ArtworkPalette;
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }
  return null;
}

// Curated handcrafted palettes tailored to our bespoke album artworks
const PRESET_PALETTES: Record<string, ArtworkPalette> = {
  lofi_city: {
    primary: '#FF9F43',
    gradient: ['rgba(44, 26, 14, 0.88)', 'rgba(18, 12, 8, 0.94)'],
    border: 'rgba(255, 159, 67, 0.35)',
    glow: '#FF9F43',
    progressBar: '#FF9F43',
  },
  synthwave_grid: {
    primary: '#E056FD',
    gradient: ['rgba(48, 14, 58, 0.88)', 'rgba(18, 6, 24, 0.94)'],
    border: 'rgba(224, 86, 253, 0.35)',
    glow: '#E056FD',
    progressBar: '#E056FD',
  },
  acoustic_morning: {
    primary: '#F0932B',
    gradient: ['rgba(48, 30, 12, 0.88)', 'rgba(19, 13, 5, 0.94)'],
    border: 'rgba(240, 147, 43, 0.35)',
    glow: '#F0932B',
    progressBar: '#F0932B',
  },
  ambient_astral: {
    primary: '#00E5FF',
    gradient: ['rgba(8, 36, 48, 0.88)', 'rgba(4, 15, 22, 0.94)'],
    border: 'rgba(0, 229, 255, 0.35)',
    glow: '#00E5FF',
    progressBar: '#00E5FF',
  },
  edm_pulse: {
    primary: '#FF2A7A',
    gradient: ['rgba(50, 10, 32, 0.88)', 'rgba(20, 4, 14, 0.94)'],
    border: 'rgba(255, 42, 122, 0.35)',
    glow: '#FF2A7A',
    progressBar: '#FF2A7A',
  },
  hiphop_street: {
    primary: '#FFA502',
    gradient: ['rgba(44, 22, 10, 0.88)', 'rgba(18, 9, 4, 0.94)'],
    border: 'rgba(255, 165, 2, 0.35)',
    glow: '#FFA502',
    progressBar: '#FFA502',
  },
  aura_logo: {
    primary: '#FFFFFF',
    gradient: ['rgba(35, 40, 50, 0.90)', 'rgba(15, 18, 25, 0.96)'],
    border: 'rgba(255, 255, 255, 0.35)',
    glow: '#FFFFFF',
    progressBar: '#FFFFFF',
  },
};

const DEFAULT_PALETTE: ArtworkPalette = {
  primary: '#1E293B',
  gradient: ['rgba(30, 41, 59, 0.90)', 'rgba(15, 23, 42, 0.96)'],
  border: 'rgba(255, 255, 255, 0.20)',
  glow: '#FFFFFF',
  progressBar: '#FFFFFF',
};

// In-memory runtime cache for analyzed artwork palettes
export const runtimePaletteCache = new Map<string, ArtworkPalette>();

function getCacheKey(track?: Track | null): string {
  if (!track) return '';
  return track.artworkUrl || track.id;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * Synchronously returns the best available palette:
 * 1. Explicitly attached track.palette (from backend extraction)
 * 2. In-memory runtime cache
 * 3. Curated preset
 * 4. Harmonic fallback based on title & artist
 */
export function getTrackArtworkPalette(track?: Track | null): ArtworkPalette {
  if (!track) return DEFAULT_PALETTE;

  // 1. Direct attached palette from backend analysis
  if (track.palette && track.palette.primary && track.palette.gradient) {
    const key = getCacheKey(track);
    if (key) runtimePaletteCache.set(key, track.palette);
    return track.palette;
  }

  // 2. Check runtime cache
  const key = getCacheKey(track);
  if (key && runtimePaletteCache.has(key)) {
    return runtimePaletteCache.get(key)!;
  }

  const artworkStr = typeof track.artworkUrl === 'string' ? track.artworkUrl.toLowerCase() : '';

  // 3. Curated preset artworks
  for (const [presetKey, palette] of Object.entries(PRESET_PALETTES)) {
    if (artworkStr.includes(presetKey)) {
      return palette;
    }
  }

  // 4. Harmonic fallback
  const seed = `${track.title}:::${track.artist}:::${track.id}`;
  const hash = hashString(seed);
  const hue = hash % 360;
  const [r, g, b] = hslToRgb(hue, 85, 60);
  const [darkR, darkG, darkB] = hslToRgb(hue, 65, 14);
  const [deepR, deepG, deepB] = hslToRgb(hue, 55, 7);

  const primaryHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

  return {
    primary: primaryHex,
    gradient: [
      `rgba(${darkR}, ${darkG}, ${darkB}, 0.88)`,
      `rgba(${deepR}, ${deepG}, ${deepB}, 0.95)`,
    ],
    border: `rgba(${r}, ${g}, ${b}, 0.38)`,
    glow: primaryHex,
    progressBar: primaryHex,
  };
}

/**
 * React Hook that provides the authentic artwork palette.
 * Automatically queries the Python PIL image analyzer for YouTube thumbnails or remote covers,
 * smoothly transitioning the player background to the genuine album colors.
 */
export function useTrackArtworkPalette(track?: Track | null): ArtworkPalette {
  const [palette, setPalette] = useState<ArtworkPalette>(() => getTrackArtworkPalette(track));

  useEffect(() => {
    if (!track) {
      setPalette(DEFAULT_PALETTE);
      return;
    }

    // If palette is already attached, use it directly
    if (track.palette && track.palette.primary && track.palette.gradient) {
      setPalette(track.palette);
      const key = getCacheKey(track);
      if (key) runtimePaletteCache.set(key, track.palette);
      return;
    }

    const key = getCacheKey(track);
    if (key && runtimePaletteCache.has(key)) {
      const cached = runtimePaletteCache.get(key)!;
      setPalette(cached);
      track.palette = cached;
      return;
    }

    // Check preset
    const artworkStr = typeof track.artworkUrl === 'string' ? track.artworkUrl.toLowerCase() : '';
    for (const [presetKey, presetPalette] of Object.entries(PRESET_PALETTES)) {
      if (artworkStr.includes(presetKey)) {
        setPalette(presetPalette);
        return;
      }
    }

    // Set interim fallback
    setPalette(getTrackArtworkPalette(track));

    // Asynchronously fetch genuine image extraction from backend
    let isCancelled = false;
    let target = '';

    if (track.artworkUrl && (track.artworkUrl.startsWith('http://') || track.artworkUrl.startsWith('https://'))) {
      target = track.artworkUrl;
    } else if (track.id.startsWith('yt-')) {
      const parts = track.id.split('-');
      if (parts.length >= 2) target = parts[1];
    } else if (track.source === 'youtube') {
      target = track.id;
    }

    if (target) {
      fetchRemoteArtworkPalette(target).then((extracted) => {
        if (!isCancelled && extracted) {
          if (key) runtimePaletteCache.set(key, extracted);
          track.palette = extracted;
          setPalette(extracted);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [track?.id, track?.artworkUrl, track?.palette]);

  return palette;
}

/**
 * Extracts [r, g, b] numbers from hex (#RRGGBB, #RGB) or rgba/rgb strings.
 */
export function parseColorToRgb(colorStr: string): [number, number, number] {
  if (!colorStr) return [0, 0, 0];
  const trimmed = colorStr.trim().toLowerCase();

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16) || 0,
        parseInt(hex[1] + hex[1], 16) || 0,
        parseInt(hex[2] + hex[2], 16) || 0,
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16) || 0,
        parseInt(hex.slice(2, 4), 16) || 0,
        parseInt(hex.slice(4, 6), 16) || 0,
      ];
    }
  }

  const rgbaMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbaMatch) {
    return [
      parseInt(rgbaMatch[1], 10) || 0,
      parseInt(rgbaMatch[2], 10) || 0,
      parseInt(rgbaMatch[3], 10) || 0,
    ];
  }

  return [0, 0, 0];
}

/**
 * Calculates standard perceived luminance (ITU-R BT.709) from 0 (black) to 255 (pure white).
 */
export function getColorLuminance(colorStr: string): number {
  const [r, g, b] = parseColorToRgb(colorStr);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Calculates WCAG 2.1 relative luminance using sRGB gamma expansion.
 * L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin.
 */
export function getRelativeLuminance(colorStr: string): number {
  const [r, g, b] = parseColorToRgb(colorStr);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Determines whether a background color is considered "light".
 * Uses WCAG 2.1 contrast crossover (L > 0.179) and perceived luminance (> 105).
 * Accurately classifies mustard, olive, khaki, tan, pastel, yellow, and mid-tones as light.
 */
export function isLightBackground(colorStr: string): boolean {
  const relLum = getRelativeLuminance(colorStr);
  const perceivedLum = getColorLuminance(colorStr);
  return relLum > 0.179 || perceivedLum > 105;
}

/**
 * Returns '#000000' for light backgrounds and '#FFFFFF' for dark backgrounds.
 */
export function getContrastingTextColor(bgColorStr: string): '#000000' | '#FFFFFF' {
  return isLightBackground(bgColorStr) ? '#000000' : '#FFFFFF';
}

export interface LyricTheme {
  isLightBg: boolean;
  highlightColor: '#000000' | '#FFFFFF';
  inverseColor: '#FFFFFF' | '#000000';
  inactiveColor: string;
  pastColor: string;
  highlightShadow: string;
  activeRowBg: string;
  headerTextColor: string;
  subtitleTextColor: string;
  badgeBg: string;
  badgeBorder: string;
  playBtnBg: '#000000' | '#FFFFFF';
  playBtnIcon: '#FFFFFF' | '#000000';
  scrubberTrack: string;
  scrubberFill: '#000000' | '#FFFFFF';
  timeTextColor: string;
  tabActiveBg: string;
  tabActiveText: '#000000' | '#FFFFFF';
  tabInactiveText: string;
}

/**
 * Dynamically derives high-contrast color tokens directly from the pure song background color.
 * Ensures sync lyrics highlight text cleanly switches to Black on light backgrounds and White on dark backgrounds.
 */
export function getLyricTheme(target?: string | ArtworkPalette | null): LyricTheme {
  let pureBgColor = '#121620';
  if (typeof target === 'string') {
    pureBgColor = target;
  } else if (target && typeof target === 'object') {
    pureBgColor = target.primary || '#121620';
  }

  const isLightBg = isLightBackground(pureBgColor);

  if (isLightBg) {
    return {
      isLightBg: true,
      highlightColor: '#000000',
      inverseColor: '#FFFFFF',
      inactiveColor: 'rgba(0, 0, 0, 0.45)',
      pastColor: 'rgba(0, 0, 0, 0.72)',
      highlightShadow: 'transparent',
      activeRowBg: 'rgba(0, 0, 0, 0.08)',
      headerTextColor: '#000000',
      subtitleTextColor: 'rgba(0, 0, 0, 0.65)',
      badgeBg: 'rgba(0, 0, 0, 0.08)',
      badgeBorder: 'rgba(0, 0, 0, 0.20)',
      playBtnBg: '#000000',
      playBtnIcon: '#FFFFFF',
      scrubberTrack: 'rgba(0, 0, 0, 0.15)',
      scrubberFill: '#000000',
      timeTextColor: 'rgba(0, 0, 0, 0.70)',
      tabActiveBg: 'rgba(0, 0, 0, 0.12)',
      tabActiveText: '#000000',
      tabInactiveText: 'rgba(0, 0, 0, 0.45)',
    };
  }

  return {
    isLightBg: false,
    highlightColor: '#FFFFFF',
    inverseColor: '#000000',
    inactiveColor: 'rgba(255, 255, 255, 0.45)',
    pastColor: 'rgba(255, 255, 255, 0.85)',
    highlightShadow: 'rgba(0, 0, 0, 0.35)',
    activeRowBg: 'rgba(255, 255, 255, 0.12)',
    headerTextColor: '#FFFFFF',
    subtitleTextColor: 'rgba(255, 255, 255, 0.70)',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeBorder: 'rgba(255, 255, 255, 0.25)',
    playBtnBg: '#FFFFFF',
    playBtnIcon: '#000000',
    scrubberTrack: 'rgba(255, 255, 255, 0.20)',
    scrubberFill: '#FFFFFF',
    timeTextColor: 'rgba(255, 255, 255, 0.75)',
    tabActiveBg: 'rgba(255, 255, 255, 0.18)',
    tabActiveText: '#FFFFFF',
    tabInactiveText: 'rgba(255, 255, 255, 0.50)',
  };
}

