// Reusable Track Row Component with Double-Bezel Framing & Animated Equalizer
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Animated } from 'react-native';
import { Heart, Download, CheckCircle2, Play, Trash2 } from 'lucide-react-native';
import { Track } from '../types/music';
import { usePlayer } from '../context/PlayerContext';
import { resolveArtworkSource } from '../services/musicService';
import { colors, spacing, typography, borderRadius, layout } from '../theme/theme';

interface Props {
  track: Track;
  queueContext?: Track[];
  showDelete?: boolean;
}

// 3-Bar Tactile Animated Equalizer
const MiniEqualizer: React.FC = () => {
  const bar1 = useRef(new Animated.Value(4)).current;
  const bar2 = useRef(new Animated.Value(12)).current;
  const bar3 = useRef(new Animated.Value(7)).current;

  useEffect(() => {
    const createAnim = (val: Animated.Value, min: number, max: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: max, duration, useNativeDriver: false }),
          Animated.timing(val, { toValue: min, duration, useNativeDriver: false }),
        ])
      );
    };

    const anim1 = createAnim(bar1, 4, 14, 420);
    const anim2 = createAnim(bar2, 5, 15, 620);
    const anim3 = createAnim(bar3, 3, 13, 510);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [bar1, bar2, bar3]);

  return (
    <View style={equalizerStyles.container}>
      <Animated.View style={[equalizerStyles.bar, { height: bar1 }]} />
      <Animated.View style={[equalizerStyles.bar, { height: bar2 }]} />
      <Animated.View style={[equalizerStyles.bar, { height: bar3 }]} />
    </View>
  );
};

const equalizerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2.5,
    height: 16,
    width: 14,
    justifyContent: 'center',
  },
  bar: {
    width: 2.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});

export const TrackListItem: React.FC<Props> = ({ track, queueContext, showDelete = false }) => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    favorites,
    toggleFavorite,
    downloadTrack,
    deleteDownloadedTrack,
    activeDownloads,
  } = usePlayer();

  const isCurrentTrack = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);
  const downloadState = activeDownloads[track.id];
  const isDownloading = downloadState && downloadState.status === 'downloading';
  const isDownloaded = track.isDownloaded || (track.localUri && track.localUri.length > 0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePress = () => {
    playTrack(track, queueContext);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        isCurrentTrack && styles.activeContainer,
        pressed && styles.pressedContainer,
      ]}
      onPress={handlePress}
    >
      {/* Double-Bezel Hardware Artwork Frame */}
      <View style={[styles.artworkOuterBezel, isCurrentTrack && styles.artworkActiveGlow]}>
        <View style={styles.artworkInnerFrame}>
          <Image source={resolveArtworkSource(track.artworkUrl)} style={styles.artwork} />
          {isCurrentTrack && (
            <View style={styles.activeOverlay}>
              {isPlaying ? (
                <MiniEqualizer />
              ) : (
                <Play size={14} color="#FFF" fill="#FFF" />
              )}
            </View>
          )}
        </View>
      </View>

      {/* Track Details */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[styles.title, isCurrentTrack && styles.activeTitle]}
          >
            {track.title}
          </Text>
        </View>
        <View style={styles.metadataRow}>
          {track.isDownloaded && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>OFFLINE</Text>
            </View>
          )}
          <Text numberOfLines={1} style={styles.artist}>
            {track.artist}
          </Text>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.duration, typography.tabularNumbers]}>
            {track.fileSize ? track.fileSize : formatDuration(track.duration)}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Favorite Toggle Button */}
        <Pressable
          style={styles.iconButton}
          hitSlop={8}
          onPress={() => toggleFavorite(track.id)}
        >
          <Heart
            size={18}
            color={isFav ? '#FF4267' : colors.textMuted}
            fill={isFav ? '#FF4267' : 'transparent'}
          />
        </Pressable>

        {/* Download or Delete Button */}
        {showDelete && isDownloaded ? (
          <Pressable
            style={styles.iconButton}
            hitSlop={8}
            onPress={() => deleteDownloadedTrack(track.id)}
          >
            <Trash2 size={18} color={colors.danger} />
          </Pressable>
        ) : isDownloading ? (
          <View style={styles.iconButton}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : isDownloaded ? (
          <View style={styles.iconButton}>
            <CheckCircle2 size={18} color="rgba(255, 255, 255, 0.85)" />
          </View>
        ) : (
          <Pressable
            style={styles.iconButton}
            hitSlop={8}
            onPress={() => downloadTrack(track)}
          >
            <Download size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pressedContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    transform: [{ scale: 0.985 }],
  },
  artworkOuterBezel: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  artworkActiveGlow: {
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  artworkInnerFrame: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  activeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginBottom: 3,
  },
  activeTitle: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginRight: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  offlineBadgeText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    maxWidth: 130,
  },
  bullet: {
    color: colors.textMuted,
    marginHorizontal: 4,
    fontSize: typography.sizes.xs,
  },
  duration: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
