// Data contracts for Music Player App

export interface ArtworkPalette {
  primary: string;
  gradient: [string, string];
  border: string;
  glow: string;
  progressBar: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  artworkUrl: string;
  audioUrl: string; // remote stream URL or local file:// URI
  isDownloaded: boolean;
  localUri?: string; // local file path on device storage if downloaded
  fileSize?: string; // e.g. "4.2 MB"
  downloadDate?: string; // ISO date string
  source: 'youtube' | 'curated' | 'local' | 'url';
  genre?: string;
  lyrics?: string[];
  palette?: ArtworkPalette;
  videoId?: string;
  lyricsOffset?: number;
  isCleanStudio?: boolean;
  studioTitle?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  tracks: Track[];
  isCustom?: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface ActiveDownload {
  trackId: string;
  title: string;
  artist: string;
  artworkUrl: string;
  progress: number; // 0 to 1
  status: 'pending' | 'converting' | 'downloading' | 'completed' | 'error';
  errorMessage?: string;
}

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0 to 1
  isShuffle: boolean;
  repeatMode: RepeatMode;
  queue: Track[];
  queueIndex: number;
}
