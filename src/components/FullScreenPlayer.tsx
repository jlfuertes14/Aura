// Full-Screen Immersive Player Modal
// Inspired by Spotify & Apple Music with vinyl animation, scrubber, visualizer, lyrics & queue
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Modal,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  Platform,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Download,
  CheckCircle2,
  ListMusic,
  FileText,
  Volume2,
  Volume1,
  VolumeX,
  Mic2,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  fetchLyrics,
  LyricLine,
  LyricsData,
} from '../services/lyricsService';
import { resolveArtworkSource } from '../services/musicService';
import { usePlayer } from '../context/PlayerContext';
import { useTrackArtworkPalette, isLightBackground } from '../utils/artworkColors';
import { AudioVisualizer } from './AudioVisualizer';
import { colors, spacing, typography, borderRadius, layout } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 64, 320);

export const FullScreenPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    position,
    duration,
    isShuffle,
    repeatMode,
    favorites,
    isPlayerModalVisible,
    queue,
    activeDownloads,
    volume,
    isMuted,
    setPlayerVolume,
    toggleMute,
    togglePlayPause,
    seekTo,
    seekBy,
    skipNext,
    skipPrev,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    downloadTrack,
    closePlayerModal,
    playTrack,
  } = usePlayer();

  const palette = useTrackArtworkPalette(currentTrack);
  const pureBgColor = palette?.primary || '#121620';
  const isLightBg = isLightBackground(pureBgColor);
  const highlightLyricColor = isLightBg ? '#000000' : '#FFFFFF';

  const [activeTab, setActiveTab] = useState<'player' | 'lyrics' | 'queue'>('player');

  // Synchronized Lyrics State & Auto-Fetch
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  const lyricsScrollRef = useRef<ScrollView>(null);
  const isUserScrollingLyrics = useRef(false);
  const userScrollTimeout = useRef<any>(null);
  const lineLayouts = useRef<{ [index: number]: number }>({});
  const lyricsViewportHeight = useRef<number>(500);

  useEffect(() => {
    if (!currentTrack) {
      setLyricsData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingLyrics(true);
    lineLayouts.current = {};

    // Fetch lyrics from LRCLIB / companion proxy
    fetchLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration)
      .then((data) => {
        if (isMounted) {
          setLyricsData(data);
          setIsLoadingLyrics(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load lyrics:', err);
        if (isMounted) {
          setIsLoadingLyrics(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id]);

  // Determine currently active synchronized lyric index based on audio position
  // 0.35s standard lead for smooth visual anticipation
  const syncedLines = lyricsData?.syncedLines;

  let activeLyricIndex = -1;
  if (syncedLines && syncedLines.length > 0) {
    const currentEffectiveTime = position + 0.35;
    for (let i = 0; i < syncedLines.length; i++) {
      if (currentEffectiveTime >= syncedLines[i].time) {
        activeLyricIndex = i;
      } else {
        break;
      }
    }
  }

  // Smooth auto-scroll keeping active lyric in center view
  const scrollToActiveLyric = useCallback((immediate = false) => {
    if (activeLyricIndex < 0 || !lyricsScrollRef.current || isUserScrollingLyrics.current) {
      return;
    }
    const lineY = lineLayouts.current[activeLyricIndex];
    const vHeight = lyricsViewportHeight.current || 500;
    // Position the active line comfortably at ~38% from top of viewport
    const targetY = typeof lineY === 'number'
      ? Math.max(0, lineY - vHeight * 0.38)
      : Math.max(0, activeLyricIndex * 54 - vHeight * 0.38);

    lyricsScrollRef.current.scrollTo({
      y: targetY,
      animated: !immediate,
    });
  }, [activeLyricIndex]);

  // Auto-scroll as active lyric changes while playing
  useEffect(() => {
    if (activeTab === 'lyrics' && !isUserScrollingLyrics.current) {
      scrollToActiveLyric();
    }
  }, [activeLyricIndex, activeTab, scrollToActiveLyric]);

  // Instantly align lyrics view whenever the user enters the Lyrics tab
  useEffect(() => {
    if (activeTab === 'lyrics') {
      isUserScrollingLyrics.current = false;
      const t1 = setTimeout(() => scrollToActiveLyric(true), 60);
      const t2 = setTimeout(() => scrollToActiveLyric(false), 240);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [activeTab, scrollToActiveLyric]);

  // Interactive Tap-to-Seek from lyric line
  const handleLyricLinePress = (timeSeconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    seekTo(timeSeconds);
  };

  // Vinyl rotation animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  const isSpinning = useRef(false);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isPlaying) {
      isSpinning.current = true;
      animation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 14000,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        })
      );
      animation.start();
    } else {
      isSpinning.current = false;
      spinAnim.stopAnimation();
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [isPlaying]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // --- Interactive Scrubber Slider (Playing Time) ---
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const scrubberBarRef = useRef<View>(null);
  const scrubberPageX = useRef(24);
  const scrubberWidth = useRef(SCREEN_WIDTH - 48);

  const durationRef = useRef(duration);
  durationRef.current = duration;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const seekToRef = useRef(seekTo);
  seekToRef.current = seekTo;

  const getTrackDuration = () => {
    if (typeof durationRef.current === 'number' && Number.isFinite(durationRef.current) && durationRef.current > 0) {
      return durationRef.current;
    }
    if (currentTrackRef.current?.duration && Number.isFinite(currentTrackRef.current.duration) && currentTrackRef.current.duration > 0) {
      return currentTrackRef.current.duration;
    }
    return 0;
  };

  const getBarMetrics = (
    barRef: React.RefObject<View | null>,
    fallbackPageX: number,
    fallbackWidth: number
  ) => {
    if (Platform.OS === 'web' && barRef.current) {
      const el = barRef.current as unknown as HTMLElement;
      if (el && typeof el.getBoundingClientRect === 'function') {
        const rect = el.getBoundingClientRect();
        if (rect && rect.width > 0) {
          return { pageX: rect.left, width: rect.width };
        }
      }
    }
    return { pageX: fallbackPageX, width: fallbackWidth };
  };

  const handleScrubberTouch = (evt: any, gestureState: any, isFinal: boolean) => {
    const metrics = getBarMetrics(scrubberBarRef, scrubberPageX.current, scrubberWidth.current);
    const barWidth = metrics.width > 0 ? metrics.width : (SCREEN_WIDTH - 48);
    const barLeft = metrics.pageX;

    let currentX = 0;
    if (typeof evt.nativeEvent.pageX === 'number' && evt.nativeEvent.pageX > 0) {
      currentX = evt.nativeEvent.pageX;
    } else if (typeof gestureState.moveX === 'number' && gestureState.moveX > 0) {
      currentX = gestureState.moveX;
    } else if (typeof gestureState.x0 === 'number') {
      currentX = gestureState.x0 + (gestureState.dx || 0);
    }

    const relX = currentX - barLeft;
    const ratio = Math.max(0, Math.min(1, relX / barWidth));
    const trackDur = getTrackDuration();

    if (trackDur <= 0) return;

    const targetSec = ratio * trackDur;
    const safeSec = Number.isFinite(targetSec) ? Math.max(0, Math.min(trackDur, targetSec)) : 0;

    if (isFinal) {
      setIsScrubbing(false);
      seekToRef.current(safeSec);
    } else {
      setScrubPosition(safeSec);
    }
  };

  const scrubberPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        setIsScrubbing(true);
        handleScrubberTouch(evt, gestureState, false);
      },
      onPanResponderMove: (evt, gestureState) => {
        handleScrubberTouch(evt, gestureState, false);
      },
      onPanResponderRelease: (evt, gestureState) => {
        handleScrubberTouch(evt, gestureState, true);
      },
      onPanResponderTerminate: () => {
        setIsScrubbing(false);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const handleScrubberLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) scrubberWidth.current = width;
    scrubberBarRef.current?.measure((x, y, w, h, pageX) => {
      if (typeof pageX === 'number' && Number.isFinite(pageX)) {
        scrubberPageX.current = pageX;
      }
      if (typeof w === 'number' && Number.isFinite(w) && w > 0) {
        scrubberWidth.current = w;
      }
    });
  };

  // --- Interactive Volume Slider ---
  const [isSlidingVolume, setIsSlidingVolume] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const volumeBarRef = useRef<View>(null);
  const volumePageX = useRef(60);
  const volumeWidth = useRef(SCREEN_WIDTH - 140);
  const setVolumeRef = useRef(setPlayerVolume);
  setVolumeRef.current = setPlayerVolume;

  useEffect(() => {
    if (!isSlidingVolume) {
      setLocalVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted, isSlidingVolume]);

  const handleVolumeTouch = (evt: any, gestureState: any, isFinal: boolean) => {
    const metrics = getBarMetrics(volumeBarRef, volumePageX.current, volumeWidth.current);
    const barWidth = metrics.width > 0 ? metrics.width : (SCREEN_WIDTH - 140);
    const barLeft = metrics.pageX;

    let currentX = 0;
    if (typeof evt.nativeEvent.pageX === 'number' && evt.nativeEvent.pageX > 0) {
      currentX = evt.nativeEvent.pageX;
    } else if (typeof gestureState.moveX === 'number' && gestureState.moveX > 0) {
      currentX = gestureState.moveX;
    } else if (typeof gestureState.x0 === 'number') {
      currentX = gestureState.x0 + (gestureState.dx || 0);
    }

    const relX = currentX - barLeft;
    const ratio = Math.max(0, Math.min(1, relX / barWidth));
    const safeRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;

    setLocalVolume(safeRatio);
    setVolumeRef.current(safeRatio);

    if (isFinal) {
      setIsSlidingVolume(false);
    }
  };

  const volumePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        setIsSlidingVolume(true);
        handleVolumeTouch(evt, gestureState, false);
      },
      onPanResponderMove: (evt, gestureState) => {
        handleVolumeTouch(evt, gestureState, false);
      },
      onPanResponderRelease: (evt, gestureState) => {
        handleVolumeTouch(evt, gestureState, true);
      },
      onPanResponderTerminate: () => {
        setIsSlidingVolume(false);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const handleVolumeLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) volumeWidth.current = width;
    volumeBarRef.current?.measure((x, y, w, h, pageX) => {
      if (typeof pageX === 'number' && Number.isFinite(pageX)) {
        volumePageX.current = pageX;
      }
      if (typeof w === 'number' && Number.isFinite(w) && w > 0) {
        volumeWidth.current = w;
      }
    });
  };

  if (!currentTrack) return null;

  const isFav = favorites.includes(currentTrack.id);
  const downloadState = activeDownloads[currentTrack.id];
  const isDownloading = downloadState && downloadState.status === 'downloading';
  const isDownloaded = currentTrack.isDownloaded || (currentTrack.localUri && currentTrack.localUri.length > 0);

  const formatTime = (secs: number) => {
    const safe = Number.isFinite(secs) ? Math.max(0, secs) : 0;
    const mins = Math.floor(safe / 60);
    const rem = Math.floor(safe % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const currentDisplayPosition = isScrubbing ? scrubPosition : position;
  const currentDisplayDuration = getTrackDuration();
  const progressPercent = currentDisplayDuration > 0
    ? Math.max(0, Math.min(100, (currentDisplayPosition / currentDisplayDuration) * 100))
    : 0;

  const displayVolume = isSlidingVolume ? localVolume : (isMuted ? 0 : volume);
  const volumePercent = Math.round(Math.max(0, Math.min(1, displayVolume)) * 100);

  return (
    <Modal
      visible={isPlayerModalVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closePlayerModal}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: pureBgColor }]}>
        {/* Pure Song Background Color: No gradient to black */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: pureBgColor }]} />

        {/* Top Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} hitSlop={12} onPress={closePlayerModal}>
            <ChevronDown
              size={28}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text
              style={[
                styles.headerSubtitle,
                { color: 'rgba(255, 255, 255, 0.75)' },
              ]}
            >
              {currentTrack.isDownloaded ? 'OFFLINE PLAYBACK' : 'PLAYING FROM STREAM'}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.headerTitle,
                { color: '#FFFFFF' },
              ]}
            >
              {currentTrack.album || currentTrack.artist}
            </Text>
          </View>

          {/* Download button in header */}
          <View style={styles.headerRight}>
            {isDownloading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : isDownloaded ? (
              <View
                style={[
                  styles.downloadedPill,
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                  },
                ]}
              >
                <CheckCircle2
                  size={14}
                  color="#FFFFFF"
                />
                <Text
                  style={[
                    styles.downloadedPillText,
                    { color: '#FFFFFF' },
                  ]}
                >
                  Saved
                </Text>
              </View>
            ) : (
              <Pressable
                style={[
                  styles.downloadPillBtn,
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                  },
                ]}
                hitSlop={8}
                onPress={() => downloadTrack(currentTrack)}
              >
                <Download
                  size={14}
                  color="#FFFFFF"
                />
                <Text
                  style={[
                    styles.downloadPillBtnText,
                    { color: '#FFFFFF' },
                  ]}
                >
                  Get MP3
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Tab Switcher (Player, Lyrics, Queue) */}
        <View style={styles.tabSwitcher}>
          <Pressable
            style={[
              styles.tabItem,
              activeTab === 'player' && [
                styles.activeTabItem,
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.20)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.30)',
                },
              ],
            ]}
            onPress={() => setActiveTab('player')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'player' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.60)',
                  fontWeight: activeTab === 'player' ? '700' : '500',
                },
              ]}
            >
              Now Playing
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabItem,
              activeTab === 'lyrics' && [
                styles.activeTabItem,
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.20)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.30)',
                },
              ],
            ]}
            onPress={() => setActiveTab('lyrics')}
          >
            <FileText
              size={14}
              color={activeTab === 'lyrics' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.60)'}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'lyrics' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.60)',
                  fontWeight: activeTab === 'lyrics' ? '700' : '500',
                },
              ]}
            >
              Lyrics
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabItem,
              activeTab === 'queue' && [
                styles.activeTabItem,
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.20)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.30)',
                },
              ],
            ]}
            onPress={() => setActiveTab('queue')}
          >
            <ListMusic
              size={14}
              color={activeTab === 'queue' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.60)'}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'queue' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.60)',
                  fontWeight: activeTab === 'queue' ? '700' : '500',
                },
              ]}
            >
              Queue ({queue.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab Content: Player */}
        {activeTab === 'player' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Artwork Card with Vinyl Breathing */}
            <View style={styles.artworkSection}>
              <Animated.View
                style={[
                  styles.artworkWrapper,
                  {
                    shadowColor: palette.glow,
                    transform: [{ rotate: spin }],
                  },
                ]}
              >
                <Image source={resolveArtworkSource(currentTrack.artworkUrl)} style={styles.artwork} />
                <View style={styles.vinylCenterPin} />
              </Animated.View>

              {/* Dynamic Frequency Visualizer */}
              <AudioVisualizer isPlaying={isPlaying} barCount={22} color="#FFFFFF" />
            </View>

            {/* Track Info & Like Button */}
            <View style={styles.trackDetailsRow}>
              <View style={styles.titleArtistBox}>
                <Text numberOfLines={1} style={[styles.mainTitle, { color: '#FFFFFF' }]}>
                  {currentTrack.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text numberOfLines={1} style={[styles.mainArtist, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    {currentTrack.artist}
                  </Text>
                  {currentTrack.isCleanStudio && (
                    <View
                      style={[
                        styles.studioPill,
                        {
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                          borderColor: 'rgba(255, 255, 255, 0.25)',
                        },
                      ]}
                    >
                      <Text style={[styles.studioPillText, { color: '#FFFFFF' }]}>
                        Studio Audio
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Pressable
                style={styles.heartBtn}
                hitSlop={12}
                onPress={() => toggleFavorite(currentTrack.id)}
              >
                <Heart
                  size={26}
                  color="#FFFFFF"
                  fill={isFav ? '#FFFFFF' : 'transparent'}
                />
              </Pressable>
            </View>

            {/* Scrubber Timeline with Interactive Sliding */}
            <View style={styles.scrubberSection}>
              <View
                ref={scrubberBarRef}
                style={styles.scrubberBar}
                onLayout={handleScrubberLayout}
                {...scrubberPanResponder.panHandlers}
              >
                <View style={[styles.scrubberTrack, { backgroundColor: 'rgba(255, 255, 255, 0.20)' }]} pointerEvents="none">
                  <View style={[styles.scrubberFill, { width: `${progressPercent}%`, backgroundColor: '#FFFFFF' }]} pointerEvents="none" />
                  <View
                    style={[
                      styles.scrubberThumb,
                      { left: `${progressPercent}%`, backgroundColor: '#FFFFFF' },
                      isScrubbing && styles.scrubberThumbActive,
                    ]}
                    pointerEvents="none"
                  />
                </View>
              </View>

              <View style={styles.timeRow}>
                <Text style={[styles.timeText, { color: 'rgba(255, 255, 255, 0.75)' }]}>{formatTime(currentDisplayPosition)}</Text>
                <Text style={[styles.timeText, { color: 'rgba(255, 255, 255, 0.75)' }]}>{formatTime(currentDisplayDuration)}</Text>
              </View>
            </View>

            {/* Main Hero Controls */}
            <View style={styles.controlsRow}>
              {/* Shuffle */}
              <Pressable style={styles.controlBtn} hitSlop={10} onPress={toggleShuffle}>
                <Shuffle
                  size={22}
                  color={isShuffle ? '#FFFFFF' : 'rgba(255, 255, 255, 0.60)'}
                />
                {isShuffle && <View style={[styles.activeDot, { backgroundColor: '#FFFFFF' }]} />}
              </Pressable>

              {/* 10s Rewind */}
              <Pressable style={styles.controlBtn} hitSlop={10} onPress={() => seekBy(-10)}>
                <RotateCcw size={22} color="#FFFFFF" />
              </Pressable>

              {/* Previous Track */}
              <Pressable style={styles.controlBtn} hitSlop={10} onPress={skipPrev}>
                <SkipBack size={26} color="#FFFFFF" fill="#FFFFFF" />
              </Pressable>

              {/* Giant Play/Pause Hero Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.heroPlayBtn,
                  { backgroundColor: '#FFFFFF' },
                  pressed && styles.heroPlayBtnPressed,
                ]}
                onPress={togglePlayPause}
              >
                {isBuffering ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : isPlaying ? (
                  <Pause size={30} color="#000000" fill="#000000" />
                ) : (
                  <Play size={30} color="#000000" fill="#000000" style={{ marginLeft: 3 }} />
                )}
              </Pressable>

              {/* Next Track */}
              <Pressable style={styles.controlBtn} hitSlop={10} onPress={skipNext}>
                <SkipForward size={26} color="#FFFFFF" fill="#FFFFFF" />
              </Pressable>

              {/* 10s Fast Forward */}
              <Pressable style={styles.controlBtn} hitSlop={10} onPress={() => seekBy(10)}>
                <RotateCw size={22} color="#FFFFFF" />
              </Pressable>

              {/* Repeat */}
              <Pressable style={styles.controlBtn} hitSlop={10} onPress={toggleRepeat}>
                {repeatMode === 'one' ? (
                  <Repeat1 size={22} color="#FFFFFF" />
                ) : (
                  <Repeat
                    size={22}
                    color={repeatMode === 'all' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.60)'}
                  />
                )}
                {repeatMode !== 'off' && <View style={[styles.activeDot, { backgroundColor: '#FFFFFF' }]} />}
              </Pressable>
            </View>

            {/* Interactive Volume Slider Row */}
            <View style={styles.volumeSection}>
              <Pressable
                style={styles.volumeBtn}
                hitSlop={8}
                onPress={toggleMute}
                accessibilityLabel={isMuted || displayVolume === 0 ? 'Unmute' : 'Mute'}
              >
                {isMuted || displayVolume === 0 ? (
                  <VolumeX size={20} color="rgba(255, 255, 255, 0.40)" />
                ) : displayVolume < 0.5 ? (
                  <Volume1 size={20} color="rgba(255, 255, 255, 0.75)" />
                ) : (
                  <Volume2 size={20} color="rgba(255, 255, 255, 0.75)" />
                )}
              </Pressable>

              <View
                ref={volumeBarRef}
                style={styles.volumeBarContainer}
                onLayout={handleVolumeLayout}
                {...volumePanResponder.panHandlers}
              >
                <View style={[styles.volumeTrack, { backgroundColor: 'rgba(255, 255, 255, 0.20)' }]} pointerEvents="none">
                  <View
                    style={[
                      styles.volumeFill,
                      { width: `${volumePercent}%`, backgroundColor: '#FFFFFF' },
                      isMuted && styles.volumeFillMuted,
                    ]}
                    pointerEvents="none"
                  />
                  <View
                    style={[
                      styles.volumeThumb,
                      { left: `${volumePercent}%`, backgroundColor: '#FFFFFF' },
                      isSlidingVolume && styles.volumeThumbActive,
                    ]}
                    pointerEvents="none"
                  />
                </View>
              </View>

              <Text style={[styles.volumePercentText, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                {isMuted ? 'Muted' : `${volumePercent}%`}
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Tab Content: Synchronized & Interactive Lyrics */}
        {activeTab === 'lyrics' && (
          <ScrollView
            ref={lyricsScrollRef}
            contentContainerStyle={styles.lyricsContainer}
            showsVerticalScrollIndicator={false}
            onLayout={(e) => {
              lyricsViewportHeight.current = e.nativeEvent.layout.height;
            }}
            onScrollBeginDrag={() => {
              isUserScrollingLyrics.current = true;
              if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
            }}
            onScrollEndDrag={() => {
              if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
              userScrollTimeout.current = setTimeout(() => {
                isUserScrollingLyrics.current = false;
                scrollToActiveLyric();
              }, 2200);
            }}
            onMomentumScrollEnd={() => {
              if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
              userScrollTimeout.current = setTimeout(() => {
                isUserScrollingLyrics.current = false;
                scrollToActiveLyric();
              }, 1600);
            }}
          >
            {/* Lyrics Header */}
            <View style={styles.lyricsHeaderRow}>
              <View style={styles.lyricsHeaderLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.lyricsHeader, { color: '#FFFFFF' }]}>Lyrics</Text>
                  {currentTrack.isCleanStudio && (
                    <View
                      style={[
                        styles.audioVerifiedPill,
                        {
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                          borderColor: 'rgba(255, 255, 255, 0.25)',
                        },
                      ]}
                    >
                      <CheckCircle2 size={11} color="#FFFFFF" />
                      <Text style={[styles.audioVerifiedText, { color: '#FFFFFF' }]}>
                        Studio Track
                      </Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={[styles.lyricsTrackSub, { color: 'rgba(255, 255, 255, 0.70)' }]}>
                  {currentTrack.title} • {currentTrack.artist}
                </Text>
              </View>

              {syncedLines && syncedLines.length > 0 && (
                <Pressable
                  style={[
                    styles.liveSyncBadge,
                    {
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderColor: 'rgba(255, 255, 255, 0.30)',
                    },
                  ]}
                  hitSlop={8}
                  onPress={() => {
                    isUserScrollingLyrics.current = false;
                    scrollToActiveLyric();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }}
                >
                  <Sparkles size={12} color="#FFFFFF" />
                  <Text style={[styles.liveSyncText, { color: '#FFFFFF' }]}>LIVE</Text>
                </Pressable>
              )}
            </View>

            {/* Interactive Tap-to-Seek Micro-hint */}
            {syncedLines && syncedLines.length > 0 && (
              <View style={styles.tapHintBox}>
                <Text style={[styles.tapHintText, { color: 'rgba(255, 255, 255, 0.50)' }]}>
                  Tap any lyric to jump to that moment
                </Text>
              </View>
            )}

            {/* Loading State */}
            {isLoadingLyrics ? (
              <View style={styles.lyricsLoadingBox}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.lyricsLoadingText, { color: 'rgba(255, 255, 255, 0.70)' }]}>
                  Fetching lyrics from LRCLIB...
                </Text>
              </View>
            ) : syncedLines && syncedLines.length > 0 ? (
              /* Synchronized Lyrics List */
              <View style={styles.syncedLyricsList}>
                {syncedLines.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  const isPast = idx < activeLyricIndex;
                  return (
                    <Pressable
                      key={`synced-lyric-${idx}-${line.time}`}
                      onLayout={(e) => {
                        lineLayouts.current[idx] = e.nativeEvent.layout.y;
                      }}
                      style={({ pressed }) => [
                        styles.syncedLineRow,
                        isActive && styles.activeSyncedLineRow,
                        pressed && styles.pressedSyncedLine,
                      ]}
                      onPress={() => handleLyricLinePress(line.time)}
                    >
                      <Text
                        style={[
                          styles.syncedLineText,
                          { color: 'rgba(255, 255, 255, 0.45)' },
                          isPast && [styles.pastSyncedLineText, { color: 'rgba(255, 255, 255, 0.85)' }],
                          isActive && [
                            styles.activeSyncedLineText,
                            { color: highlightLyricColor },
                          ],
                        ]}
                      >
                        {line.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : lyricsData?.plainLyrics ? (
              /* Plain Text Lyrics */
              <View style={styles.plainLyricsBox}>
                <Text style={[styles.plainLyricsText, { color: 'rgba(255, 255, 255, 0.85)' }]}>
                  {lyricsData.plainLyrics}
                </Text>
              </View>
            ) : lyricsData?.isInstrumental ? (
              /* Instrumental Track */
              <View style={styles.emptyLyrics}>
                <View
                  style={[
                    styles.instrumentalCircle,
                    {
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                    },
                  ]}
                >
                  <Mic2 size={32} color="#FFFFFF" />
                </View>
                <Text style={[styles.emptyLyricsText, { color: '#FFFFFF' }]}>Instrumental Track</Text>
                <Text style={[styles.emptyLyricsSub, { color: 'rgba(255, 255, 255, 0.70)' }]}>
                  No vocals detected for this track. Sit back and enjoy the rhythm!
                </Text>
              </View>
            ) : (
              /* No lyrics found */
              <View style={styles.emptyLyrics}>
                <Text style={[styles.emptyLyricsText, { color: '#FFFFFF' }]}>Lyrics not available</Text>
                <Text style={[styles.emptyLyricsSub, { color: 'rgba(255, 255, 255, 0.70)' }]}>
                  No synchronized lyrics found on LRCLIB for this song.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Tab Content: Up Next Queue */}
        {activeTab === 'queue' && (
          <ScrollView contentContainerStyle={styles.queueContainer}>
            <Text style={[styles.queueHeader, { color: '#FFFFFF' }]}>Up Next in Queue</Text>
            {queue.map((track, idx) => {
              const isCurrent = track.id === currentTrack.id;
              return (
                <Pressable
                  key={`${track.id}-${idx}`}
                  style={[
                    styles.queueItem,
                    isCurrent && [
                      styles.activeQueueItem,
                      { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
                    ],
                  ]}
                  onPress={() => playTrack(track, queue)}
                >
                  <Image source={{ uri: track.artworkUrl }} style={styles.queueThumb} />
                  <View style={styles.queueInfo}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.queueTitle,
                        { color: '#FFFFFF' },
                        isCurrent && { fontWeight: '700' },
                      ]}
                    >
                      {track.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.queueArtist, { color: 'rgba(255, 255, 255, 0.70)' }]}
                    >
                      {track.artist}
                    </Text>
                  </View>
                  {isCurrent && (
                    <Text style={[styles.playingTag, { color: '#FFFFFF' }]}>
                      PLAYING
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  headerBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH - 160,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  headerRight: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  downloadedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  downloadedPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  downloadPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  downloadPillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  tabSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.round,
    backgroundColor: 'transparent',
  },
  activeTabItem: {
    backgroundColor: colors.surface,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  activeTabText: {
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  artworkSection: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  artworkWrapper: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: ARTWORK_SIZE / 2, // circular vinyl
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 6,
    borderColor: '#111620',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  vinylCenterPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 32,
    height: 32,
    marginLeft: -16,
    marginTop: -16,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 4,
    borderColor: '#2A3447',
  },
  trackDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  titleArtistBox: {
    flex: 1,
    marginRight: spacing.md,
  },
  mainTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  mainArtist: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    marginTop: 4,
  },
  heartBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrubberSection: {
    width: '100%',
    marginTop: spacing.xl,
  },
  scrubberBar: {
    height: 36,
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', touchAction: 'none', userSelect: 'none' } : {}),
  } as any,
  scrubberTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    position: 'relative',
    justifyContent: 'center',
  },
  scrubberFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  scrubberThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    top: -4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  scrubberThumbActive: {
    width: 18,
    height: 18,
    marginLeft: -9,
    top: -7,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    ...typography.tabularNumbers,
  },
  volumeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  volumeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeBarContainer: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', touchAction: 'none', userSelect: 'none' } : {}),
  } as any,
  volumeTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    position: 'relative',
    justifyContent: 'center',
  },
  volumeFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
  },
  volumeFillMuted: {
    backgroundColor: colors.textMuted,
  },
  volumeThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    top: -4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  volumeThumbActive: {
    width: 18,
    height: 18,
    marginLeft: -9,
    top: -7,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  volumePercentText: {
    minWidth: 44,
    textAlign: 'right',
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    ...typography.tabularNumbers,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.lg,
  },
  controlBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  heroPlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  heroPlayBtnPressed: {
    transform: [{ scale: 0.94 }],
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  lyricsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl * 2,
  },
  lyricsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  lyricsHeaderLeft: {
    flex: 1,
  },
  lyricsHeader: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  lyricsTrackSub: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  audioVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  audioVerifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  studioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginLeft: 6,
  },
  studioPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  liveSyncText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tapHintBox: {
    marginBottom: spacing.lg,
  },
  tapHintText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  lyricsLoadingBox: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  lyricsLoadingText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  backdropImage: {
    opacity: 0.55,
    transform: [{ scale: 1.25 }],
    ...(Platform.OS === 'web' ? ({ filter: 'blur(30px)' } as any) : {}),
  },
  syncedLyricsList: {
    gap: 14,
    paddingVertical: spacing.md,
  },
  syncedLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: borderRadius.md,
  },
  activeSyncedLineRow: {
    paddingHorizontal: 6,
  },
  pressedSyncedLine: {
    opacity: 0.6,
  },
  syncedLineText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    lineHeight: 32,
  },
  activeSyncedLineText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  pastSyncedLineText: {
    fontSize: typography.sizes.md,
    lineHeight: 32,
    fontWeight: typography.weights.semibold,
  },
  plainLyricsBox: {
    paddingVertical: spacing.md,
  },
  plainLyricsText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    lineHeight: 32,
  },
  emptyLyrics: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  instrumentalCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: spacing.md,
  },
  emptyLyricsText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  emptyLyricsSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
    maxWidth: 280,
  },
  queueContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  queueHeader: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  activeQueueItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  queueThumb: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  queueInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  queueTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  activeQueueText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  queueArtist: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  playingTag: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
