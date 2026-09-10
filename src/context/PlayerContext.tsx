import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Track, Playlist, RepeatMode, ActiveDownload } from '../types/music';
import { audioEngine } from '../services/audioEngine';
import {
  initStorage,
  getDownloadedTracks,
  downloadTrackToDevice,
  deleteDownloadedTrack as storageDeleteTrack,
  getFavorites,
  toggleFavoriteId,
  getPlaylists,
  savePlaylists,
} from '../services/storageService';
import { CURATED_TRACKS } from '../services/musicService';

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  queue: Track[];
  queueIndex: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  downloadedTracks: Track[];
  favorites: string[];
  playlists: Playlist[];
  activeDownloads: Record<string, ActiveDownload>;
  isPlayerModalVisible: boolean;
  volume: number;
  isMuted: boolean;
  
  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  seekBy: (deltaSeconds: number) => Promise<void>;
  setPlayerVolume: (volume: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrev: () => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleFavorite: (trackId: string) => Promise<void>;
  downloadTrack: (track: Track) => Promise<void>;
  deleteDownloadedTrack: (trackId: string) => Promise<void>;
  openPlayerModal: () => void;
  closePlayerModal: () => void;
  importLocalAudio: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [position, setPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [queue, setQueue] = useState<Track[]>(CURATED_TRACKS);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveDownload>>({});
  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const previousVolumeRef = useRef<number>(1.0);

  // Ref to hold original queue for shuffle toggle
  const originalQueueRef = useRef<Track[]>(CURATED_TRACKS);
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  const queueRef = useRef<Track[]>(queue);
  const queueIndexRef = useRef<number>(queueIndex);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  // Initial load of storage data
  useEffect(() => {
    const loadInitialData = async () => {
      await initStorage();
      const downloaded = await getDownloadedTracks();
      setDownloadedTracks(downloaded);

      const favs = await getFavorites();
      setFavorites(favs);

      const plists = await getPlaylists();
      setPlaylists(plists);
    };
    loadInitialData();
  }, []);

  const handlePlaybackUpdate = useCallback(
    (status: {
      isPlaying: boolean;
      position: number;
      duration: number;
      isBuffering: boolean;
      didJustFinish: boolean;
    }) => {
      setIsPlaying(status.isPlaying);
      setPosition(status.position);
      if (status.duration > 0) {
        setDuration(status.duration);
      }
      setIsBuffering(status.isBuffering);

      // Handle song finish auto-advance
      if (status.didJustFinish) {
        if (repeatModeRef.current === 'one') {
          audioEngine.seek(0);
          audioEngine.play();
        } else {
          handleAutoNext();
        }
      }
    },
    []
  );

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      
      // Update queue if provided
      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
        originalQueueRef.current = newQueue;
        const index = newQueue.findIndex((t) => t.id === track.id);
        setQueueIndex(index >= 0 ? index : 0);
      } else {
        const index = queueRef.current.findIndex((t) => t.id === track.id);
        if (index >= 0) {
          setQueueIndex(index);
        } else {
          const updated = [...queueRef.current, track];
          setQueue(updated);
          setQueueIndex(updated.length - 1);
        }
      }

      setCurrentTrack(track);
      setPosition(0);
      setDuration(track.duration || 0);

      // Check if track is downloaded locally on device
      const audioUri = track.localUri || track.audioUrl;
      await audioEngine.loadAndPlay(audioUri, handlePlaybackUpdate, true);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const togglePlayPause = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (!currentTrack && queue.length > 0) {
        await playTrack(queue[0]);
        return;
      }
      const newPlaying = await audioEngine.togglePlay();
      setIsPlaying(newPlaying);
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const seekTo = async (seconds: number) => {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || isNaN(seconds)) return;
    const maxDur = (typeof duration === 'number' && Number.isFinite(duration) && duration > 0)
      ? duration
      : (currentTrack?.duration || 3600);
    const safeSecs = Math.max(0, Math.min(maxDur, seconds));
    setPosition(safeSecs);
    await audioEngine.seek(safeSecs);
  };

  const seekBy = async (deltaSeconds: number) => {
    if (typeof deltaSeconds !== 'number' || !Number.isFinite(deltaSeconds)) return;
    const maxDur = (typeof duration === 'number' && Number.isFinite(duration) && duration > 0)
      ? duration
      : (currentTrack?.duration || 3600);
    const currentPos = (typeof position === 'number' && Number.isFinite(position)) ? position : 0;
    const newPos = Math.max(0, Math.min(maxDur, currentPos + deltaSeconds));
    await seekTo(newPos);
  };

  const setPlayerVolume = async (newVol: number) => {
    if (!Number.isFinite(newVol) || isNaN(newVol)) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
    await audioEngine.setVolume(clamped);
  };

  const toggleMute = async () => {
    if (isMuted) {
      const restore = previousVolumeRef.current > 0 ? previousVolumeRef.current : 0.8;
      setIsMuted(false);
      setVolumeState(restore);
      await audioEngine.setVolume(restore);
    } else {
      previousVolumeRef.current = volume;
      setIsMuted(true);
      setVolumeState(0);
      await audioEngine.setVolume(0);
    }
  };

  const handleAutoNext = async () => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (idx < q.length - 1) {
      const nextTrack = q[idx + 1];
      setQueueIndex(idx + 1);
      await playTrack(nextTrack);
    } else if (repeatModeRef.current === 'all' && q.length > 0) {
      setQueueIndex(0);
      await playTrack(q[0]);
    } else {
      setIsPlaying(false);
    }
  };

  const skipNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (idx < q.length - 1) {
      setQueueIndex(idx + 1);
      await playTrack(q[idx + 1]);
    } else if (q.length > 0) {
      setQueueIndex(0);
      await playTrack(q[0]);
    }
  };

  const skipPrev = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // If more than 3 seconds into the song, restart current song
    if (position > 3) {
      await seekTo(0);
      return;
    }
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (idx > 0) {
      setQueueIndex(idx - 1);
      await playTrack(q[idx - 1]);
    } else if (q.length > 0) {
      setQueueIndex(q.length - 1);
      await playTrack(q[q.length - 1]);
    }
  };

  const toggleShuffle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);

    if (nextShuffle) {
      // Smart shuffle: keep current track at front, shuffle remainder
      const current = currentTrack;
      const rest = queue.filter((t) => !current || t.id !== current.id);
      const shuffled = [...rest].sort(() => Math.random() - 0.5);
      const newQueue = current ? [current, ...shuffled] : shuffled;
      setQueue(newQueue);
      setQueueIndex(0);
    } else {
      setQueue(originalQueueRef.current);
      if (currentTrack) {
        const originalIndex = originalQueueRef.current.findIndex((t) => t.id === currentTrack.id);
        setQueueIndex(originalIndex >= 0 ? originalIndex : 0);
      }
    }
  };

  const toggleRepeat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const toggleFavorite = async (trackId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const updated = await toggleFavoriteId(trackId);
    setFavorites(updated);
  };

  const downloadTrack = async (track: Track) => {
    if (track.isDownloaded) return;

    // Track active download progress
    setActiveDownloads((prev) => ({
      ...prev,
      [track.id]: {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        artworkUrl: track.artworkUrl,
        progress: 0.05,
        status: 'downloading',
      },
    }));

    try {
      const savedTrack = await downloadTrackToDevice(track, (progress) => {
        setActiveDownloads((prev) => ({
          ...prev,
          [track.id]: {
            ...prev[track.id],
            progress,
            status: progress >= 1.0 ? 'completed' : 'downloading',
          },
        }));
      });

      // Update state
      setDownloadedTracks((prev) => [savedTrack, ...prev.filter((t) => t.id !== track.id)]);
      
      // If the currently playing track was just downloaded, update its localUri
      if (currentTrack && currentTrack.id === track.id) {
        setCurrentTrack(savedTrack);
      }

      // Clear download status after brief delay
      setTimeout(() => {
        setActiveDownloads((prev) => {
          const copy = { ...prev };
          delete copy[track.id];
          return copy;
        });
      }, 2500);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error: any) {
      console.error('Download error:', error);
      setActiveDownloads((prev) => ({
        ...prev,
        [track.id]: {
          ...prev[track.id],
          status: 'error',
          errorMessage: error.message || 'Download failed',
        },
      }));
    }
  };

  const deleteDownloadedTrack = async (trackId: string) => {
    try {
      await storageDeleteTrack(trackId);
      setDownloadedTracks((prev) => prev.filter((t) => t.id !== trackId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (error) {
      console.error('Failed to delete track:', error);
    }
  };

  const importLocalAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        if (Platform.OS === 'web') {
          const newTrack: Track = {
            id: `local-${Date.now()}`,
            title: file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Imported Track',
            artist: 'Local Device Audio',
            album: 'Device Files',
            duration: 180,
            artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
            audioUrl: file.uri,
            localUri: file.uri,
            isDownloaded: true,
            source: 'local',
            fileSize: file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '4.0 MB',
            downloadDate: new Date().toISOString(),
          };
          await downloadTrackToDevice(newTrack);
          setDownloadedTracks((prev) => [newTrack, ...prev]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return;
        }

        const musicDir = `${FileSystem.documentDirectory}music/`;
        const safeName = (file.name || 'imported_audio').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const targetUri = `${musicDir}${Date.now()}_${safeName}`;

        await FileSystem.copyAsync({ from: file.uri, to: targetUri });
        const fileInfo = await FileSystem.getInfoAsync(targetUri);
        const mb = fileInfo.exists && (fileInfo as any).size ? ((fileInfo as any).size / (1024 * 1024)).toFixed(1) + ' MB' : '4.0 MB';

        const newTrack: Track = {
          id: `local-${Date.now()}`,
          title: file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Imported Track',
          artist: 'Local Device Audio',
          album: 'Device Files',
          duration: 180,
          artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
          audioUrl: targetUri,
          localUri: targetUri,
          isDownloaded: true,
          source: 'local',
          fileSize: mb,
          downloadDate: new Date().toISOString(),
        };

        await downloadTrackToDevice(newTrack);
        setDownloadedTracks((prev) => [newTrack, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to import audio:', error);
    }
  };

  const createPlaylist = async (name: string, description: string = '') => {
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
      tracks: [],
      isCustom: true,
    };
    const updated = [...playlists, newPlaylist];
    setPlaylists(updated);
    await savePlaylists(updated);
  };

  const addTrackToPlaylist = async (playlistId: string, track: Track) => {
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        const exists = p.tracks.some((t) => t.id === track.id);
        if (exists) return p;
        return { ...p, tracks: [...p.tracks, track] };
      }
      return p;
    });
    setPlaylists(updated);
    await savePlaylists(updated);
  };

  const openPlayerModal = () => setIsPlayerModalVisible(true);
  const closePlayerModal = () => setIsPlayerModalVisible(false);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isBuffering,
        position,
        duration,
        queue,
        queueIndex,
        repeatMode,
        isShuffle,
        downloadedTracks,
        favorites,
        playlists,
        activeDownloads,
        isPlayerModalVisible,
        volume,
        isMuted,
        playTrack,
        togglePlayPause,
        seekTo,
        seekBy,
        setPlayerVolume,
        toggleMute,
        skipNext,
        skipPrev,
        toggleShuffle,
        toggleRepeat,
        toggleFavorite,
        downloadTrack,
        deleteDownloadedTrack,
        openPlayerModal,
        closePlayerModal,
        importLocalAudio,
        createPlaylist,
        addTrackToPlaylist,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
