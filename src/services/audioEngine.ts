// Modern Native Audio Engine using expo-audio (Expo SDK 57 compatible)
// Fully replaces legacy expo-av (ExponentAV) with universal Android, iOS, Expo Go & Web support
import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioStatus } from 'expo-audio';

export type PlaybackCallback = (status: {
  isPlaying: boolean;
  position: number; // in seconds
  duration: number; // in seconds
  isBuffering: boolean;
  didJustFinish: boolean;
}) => void;

class AudioEngine {
  private player: AudioPlayer | null = null;
  private isConfigured: boolean = false;
  private statusCallback: PlaybackCallback | null = null;
  private lastUri: string | null = null;
  private statusSubscription: { remove: () => void } | null = null;
  private volumeLevel: number = 1.0;
  private highResInterval: any = null;
  private lastKnownPosition: number = 0;
  private lastKnownDuration: number = 0;
  private lastReportTime: number = 0;
  private isAudioPlaying: boolean = false;

  /**
   * Configures native audio session for background playback and lock-screen continuation.
   */
  public async configureAudioMode(): Promise<void> {
    if (this.isConfigured) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      this.isConfigured = true;
    } catch (error) {
      console.warn('Audio mode configuration warning:', error);
    }
  }

  /**
   * Unloads any currently playing sound to free hardware audio decoders and memory.
   */
  public async unload(): Promise<void> {
    this.stopHighResTicker();
    this.isAudioPlaying = false;
    this.lastReportTime = 0;
    this.lastKnownPosition = 0;

    if (this.statusSubscription) {
      try {
        this.statusSubscription.remove();
      } catch {}
      this.statusSubscription = null;
    }

    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
      } catch (err) {
        console.warn('AudioEngine unload warning:', err);
      }
      this.player = null;
      this.lastUri = null;
    }
  }

  /**
   * Loads a track URI (remote stream or local file://) and begins playback.
   */
  public async loadAndPlay(
    uri: string,
    onStatusUpdate: PlaybackCallback,
    shouldPlay: boolean = true
  ): Promise<void> {
    await this.configureAudioMode();
    this.statusCallback = onStatusUpdate;

    // If same URI is loaded, toggle or resume
    if (this.player && this.lastUri === uri) {
      if (shouldPlay) {
        this.play();
      }
      return;
    }

    // Clean up previous sound instance
    await this.unload();

    try {
      const player = createAudioPlayer(
        { uri },
        { updateInterval: 100 }
      );

      player.volume = this.volumeLevel;

      this.statusSubscription = player.addListener(
        'playbackStatusUpdate',
        this.handlePlaybackStatusUpdate
      );

      this.player = player;
      this.lastUri = uri;

      if (shouldPlay) {
        this.play();
      }
    } catch (error) {
      console.error('Failed to load audio stream with expo-audio:', error);
      throw error;
    }
  }

  private startHighResTicker(): void {
    if (this.highResInterval) return;
    this.highResInterval = setInterval(() => {
      if (!this.player || !this.statusCallback || !this.isAudioPlaying) return;

      let pos = this.lastKnownPosition;
      const direct = (this.player as any).currentTime;
      if (typeof direct === 'number' && Number.isFinite(direct) && direct >= 0) {
        pos = direct;
      } else if (this.lastReportTime > 0) {
        const delta = (Date.now() - this.lastReportTime) / 1000;
        pos = this.lastKnownPosition + delta;
      }

      this.statusCallback({
        isPlaying: true,
        position: Math.max(0, pos),
        duration: Math.max(0, this.lastKnownDuration),
        isBuffering: false,
        didJustFinish: false,
      });
    }, 50);
  }

  private stopHighResTicker(): void {
    if (this.highResInterval) {
      clearInterval(this.highResInterval);
      this.highResInterval = null;
    }
  }

  private handlePlaybackStatusUpdate = (status: AudioStatus) => {
    const isPlaying = Boolean(status.playing);
    const rawPos = status.currentTime;
    const rawDur = status.duration;

    // Preserve sub-second floating-point accuracy for flawless real-time lyrics synchronization
    const position = typeof rawPos === 'number' && Number.isFinite(rawPos)
      ? rawPos
      : 0;
    const duration = typeof rawDur === 'number' && Number.isFinite(rawDur)
      ? rawDur
      : 0;
    const isBuffering = Boolean(status.isBuffering);
    const didJustFinish = Boolean(status.didJustFinish);

    this.isAudioPlaying = isPlaying;
    this.lastKnownPosition = position;
    this.lastKnownDuration = duration;
    this.lastReportTime = Date.now();

    if (isPlaying) {
      this.startHighResTicker();
    } else {
      this.stopHighResTicker();
    }

    if (this.statusCallback) {
      this.statusCallback({
        isPlaying,
        position: Math.max(0, position),
        duration: Math.max(0, duration),
        isBuffering,
        didJustFinish,
      });
    }
  };

  public async play(): Promise<void> {
    if (this.player) {
      this.isAudioPlaying = true;
      this.startHighResTicker();
      this.player.play();
    }
  }

  public async pause(): Promise<void> {
    this.stopHighResTicker();
    this.isAudioPlaying = false;
    if (this.player) {
      this.player.pause();
    }
  }

  public async togglePlay(): Promise<boolean> {
    if (!this.player) return false;
    if (this.player.playing) {
      this.pause();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  public async seek(positionSeconds: number): Promise<void> {
    if (this.player) {
      if (typeof positionSeconds !== 'number' || !Number.isFinite(positionSeconds) || isNaN(positionSeconds)) {
        return;
      }
      const safeSeconds = Math.max(0, positionSeconds);
      try {
        await this.player.seekTo(safeSeconds);
      } catch (err) {
        console.warn('AudioEngine seek warning:', err);
      }
    }
  }

  public async setVolume(volume: number): Promise<void> {
    if (!Number.isFinite(volume) || isNaN(volume)) {
      return;
    }
    const clamped = Math.max(0, Math.min(1, volume));
    this.volumeLevel = clamped;
    if (this.player) {
      try {
        this.player.volume = clamped;
      } catch (err) {
        console.warn('AudioEngine setVolume warning:', err);
      }
    }
  }
}

export const audioEngine = new AudioEngine();
