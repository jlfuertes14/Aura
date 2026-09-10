// Spotify-Style Sticky Playing Banner (Mini-Player)
// Features dynamic album cover blurred backdrop, adaptive harmonic gradient, and double-bezel glassmorphism
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Heart } from 'lucide-react-native';
import { usePlayer } from '../context/PlayerContext';
import { resolveArtworkSource } from '../services/musicService';
import { useTrackArtworkPalette } from '../utils/artworkColors';
import { colors, spacing, typography, borderRadius, layout } from '../theme/theme';

export const MiniPlayerBanner: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    togglePlayPause,
    skipNext,
    favorites,
    toggleFavorite,
    openPlayerModal,
  } = usePlayer();

  const palette = useTrackArtworkPalette(currentTrack);

  if (!currentTrack) return null;

  const isFav = favorites.includes(currentTrack.id);
  const progressRatio = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View style={styles.outerContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.banner,
          {
            borderColor: isPlaying ? palette.border : 'rgba(255, 255, 255, 0.12)',
            shadowColor: isPlaying ? palette.glow : '#000',
          },
          pressed && styles.bannerPressed,
        ]}
        onPress={openPlayerModal}
      >
        {/* Layer 1: Blurred Real Album Artwork Pixels */}
        <Image
          source={resolveArtworkSource(currentTrack.artworkUrl)}
          style={[StyleSheet.absoluteFill, styles.backdropImage]}
          blurRadius={Platform.OS === 'android' ? 24 : 36}
          resizeMode="cover"
        />

        {/* Layer 2: Dynamic Harmonic Color Gradient Overlay */}
        <LinearGradient
          colors={palette.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Layer 3: Specular Frosted Glass Top Edge Highlight */}
        <View style={styles.glassHighlight} />

        {/* Dynamic Scrubber Progress Line on top edge */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressRatio * 100}%`,
                backgroundColor: palette.progressBar,
              },
            ]}
          >
            <View style={[styles.scrubberHeadGlow, { shadowColor: palette.primary }]} />
          </View>
        </View>

        {/* Content Row with Double-Bezel Architecture */}
        <View style={styles.contentRow}>
          {/* Double-Bezel Artwork Thumbnail */}
          <View
            style={[
              styles.artworkOuterBezel,
              isPlaying && { borderColor: palette.border, shadowColor: palette.glow },
            ]}
          >
            <View style={styles.artworkInnerFrame}>
              <Image source={resolveArtworkSource(currentTrack.artworkUrl)} style={styles.artwork} />
            </View>
          </View>

          {/* Track Info */}
          <View style={styles.infoContainer}>
            <Text numberOfLines={1} style={styles.title}>
              {currentTrack.title}
            </Text>
            <View style={styles.artistRow}>
              <Text numberOfLines={1} style={styles.artist}>
                {currentTrack.artist}
              </Text>
            </View>
          </View>

          {/* Actions: Button-in-Button Nested Architecture */}
          <View style={styles.actions}>
            {/* Heart Favorite */}
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.actionBtnPressed,
              ]}
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(currentTrack.id);
              }}
            >
              <Heart
                size={18}
                color={isFav ? palette.primary : 'rgba(255, 255, 255, 0.7)'}
                fill={isFav ? palette.primary : 'transparent'}
              />
            </Pressable>

            {/* Play/Pause Button (Concentric Nested Core with Dynamic Accent) */}
            <Pressable
              style={({ pressed }) => [
                styles.playPauseBtn,
                isPlaying && {
                  backgroundColor: palette.primary,
                  borderColor: palette.primary,
                },
                pressed && styles.btnPressed,
              ]}
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
            >
              {isPlaying ? (
                <Pause size={18} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
              )}
            </Pressable>

            {/* Skip Next */}
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.actionBtnPressed,
              ]}
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                skipNext();
              }}
            >
              <SkipForward size={18} color="rgba(255, 255, 255, 0.75)" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  banner: {
    height: layout.miniPlayerHeight,
    backgroundColor: '#0E1015',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  backdropImage: {
    opacity: 0.55,
    transform: [{ scale: 1.25 }],
    ...(Platform.OS === 'web' ? ({ filter: 'blur(28px)' } as any) : {}),
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    zIndex: 1,
  },
  bannerPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  progressBarContainer: {
    width: '100%',
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 2,
  },
  progressBarFill: {
    height: '100%',
    position: 'relative',
  },
  scrubberHeadGlow: {
    position: 'absolute',
    right: 0,
    top: -1,
    width: 5,
    height: 4.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    zIndex: 2,
  },
  artworkOuterBezel: {
    position: 'relative',
    width: 46,
    height: 46,
    borderRadius: borderRadius.sm,
    padding: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  artworkInnerFrame: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.2,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  artist: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.8,
  },
  playPauseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  btnPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
});
