// Home Screen: Asymmetric Bento Grid, Curated Feeds & Double-Bezel Hardware Design
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Play, Flame, Disc3, Radio, Headphones } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePlayer } from '../context/PlayerContext';
import { CURATED_TRACKS, resolveArtworkSource } from '../services/musicService';
import { TrackListItem } from '../components/TrackListItem';
import { AuraLogo } from '../components/AuraLogo';
import { colors, spacing, typography, borderRadius } from '../theme/theme';

interface HomeScreenProps {
  onLogoPress?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogoPress }) => {
  const insets = useSafeAreaInsets();
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  const statusBarHeight = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 0;
  const safeTopPadding = Math.max(insets.top, statusBarHeight, 40) + spacing.md;

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const heroTrack = CURATED_TRACKS[0];
  const secondaryPicks = CURATED_TRACKS.slice(1, 5);
  const isHeroPlaying = currentTrack?.id === heroTrack?.id && isPlaying;

  const genreCards = [
    {
      name: 'Alt R&B Spotlight',
      desc: 'Chase Atlantic • PARADISE',
      image: CURATED_TRACKS[0].artworkUrl,
      track: CURATED_TRACKS[0],
    },
    {
      name: 'Synthwave & Retropop',
      desc: 'The Weeknd • Blinding Lights',
      image: CURATED_TRACKS[1].artworkUrl,
      track: CURATED_TRACKS[1],
    },
    {
      name: 'Alt Pop Essentials',
      desc: 'Billie Eilish • BIRDS OF A FEATHER',
      image: CURATED_TRACKS[2].artworkUrl,
      track: CURATED_TRACKS[2],
    },
    {
      name: 'Rage & Trap',
      desc: 'Travis Scott • FE!N',
      image: CURATED_TRACKS[3].artworkUrl,
      track: CURATED_TRACKS[3],
    },
    {
      name: 'Indie Rock Anthems',
      desc: 'Arctic Monkeys • 505',
      image: CURATED_TRACKS[4].artworkUrl,
      track: CURATED_TRACKS[4],
    },
    {
      name: 'Modern R&B & Soul',
      desc: 'SZA • Snooze',
      image: CURATED_TRACKS[5].artworkUrl,
      track: CURATED_TRACKS[5],
    },
    {
      name: 'Pop Rock Euphoria',
      desc: 'Post Malone • Chemical',
      image: CURATED_TRACKS[6].artworkUrl,
      track: CURATED_TRACKS[6],
    },
    {
      name: 'Nu-Disco & Dance',
      desc: 'Dua Lipa • Levitating',
      image: CURATED_TRACKS[7].artworkUrl,
      track: CURATED_TRACKS[7],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: safeTopPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {/* AURA Brand Header & Audio Fidelity Badge */}
      <View style={styles.header}>
        <View style={styles.headerBrandRow}>
          <AuraLogo size="md" withGlow onPress={onLogoPress} />
          <View style={styles.headerBrandText}>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle}>AURA</Text>
            </View>
            <Text style={styles.subGreeting}>{getGreeting()}</Text>
          </View>
        </View>
        <Pressable
          style={styles.badgeWrapper}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            if (onLogoPress) onLogoPress();
          }}
        >
          <Sparkles size={13} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.badgeText}>320 KBPS</Text>
        </Pressable>
      </View>

      {/* ASYMMETRIC BENTO GRID */}
      <View style={styles.bentoContainer}>
        {/* Bento Hero Card: Full-Width Cinematic Spotlight */}
        {heroTrack && (
          <Pressable
            style={({ pressed }) => [
              styles.bentoHeroCard,
              pressed && styles.cardPressed,
              isHeroPlaying && styles.bentoHeroPlaying,
            ]}
            onPress={() => playTrack(heroTrack, CURATED_TRACKS)}
          >
            <Image source={resolveArtworkSource(heroTrack.artworkUrl)} style={styles.bentoHeroImage} />
            <View style={styles.bentoHeroGradient} />

            <View style={styles.bentoHeroTopRow}>
              <View style={styles.trendingBadge}>
                <Flame size={12} color="#000" />
                <Text style={styles.trendingBadgeText}>FEATURED PICK</Text>
              </View>
              <View style={styles.audioFormatPill}>
                <Headphones size={12} color="#FFFFFF" />
                <Text style={styles.audioFormatText}>Lossless</Text>
              </View>
            </View>

            <View style={styles.bentoHeroBottomRow}>
              <View style={styles.bentoHeroInfo}>
                <Text numberOfLines={1} style={styles.bentoHeroTitle}>
                  {heroTrack.title}
                </Text>
                <Text numberOfLines={1} style={styles.bentoHeroArtist}>
                  {heroTrack.artist} • {heroTrack.genre}
                </Text>
              </View>

              <View style={[styles.heroPlayButton, isHeroPlaying && styles.heroPlayButtonActive]}>
                <Play
                  size={16}
                  color={isHeroPlaying ? '#000000' : '#FFFFFF'}
                  fill={isHeroPlaying ? '#000000' : '#FFFFFF'}
                  style={{ marginLeft: 2 }}
                />
              </View>
            </View>
          </Pressable>
        )}

        {/* Bento Secondary Grid: 2-Column Staggered Cards */}
        <View style={styles.bentoSubGrid}>
          {secondaryPicks.map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <Pressable
                key={track.id}
                style={({ pressed }) => [
                  styles.bentoSubCard,
                  pressed && styles.cardPressed,
                  isThisPlaying && styles.bentoSubCardActive,
                ]}
                onPress={() => playTrack(track, CURATED_TRACKS)}
              >
                <View style={styles.subCardArtworkWrapper}>
                  <Image source={resolveArtworkSource(track.artworkUrl)} style={styles.subCardArtwork} />
                </View>
                <View style={styles.subCardInfo}>
                  <Text numberOfLines={1} style={[styles.subCardTitle, isThisPlaying && styles.activeText]}>
                    {track.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.subCardArtist}>
                    {track.artist}
                  </Text>
                </View>
                <View style={[styles.subCardPlayBtn, isThisPlaying && styles.subCardPlayBtnActive]}>
                  <Play
                    size={11}
                    color={isThisPlaying ? '#000000' : '#FFFFFF'}
                    fill={isThisPlaying ? '#000000' : '#FFFFFF'}
                    style={{ marginLeft: 1 }}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Section: Trending Worldwide Track List */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Radio size={18} color="#FFFFFF" />
          <Text style={styles.sectionTitle}>Curated Playlist</Text>
        </View>
        <Text style={styles.sectionSubtitle}>High-fidelity audio ready for one-tap offline saving</Text>
      </View>

      {CURATED_TRACKS.map((track) => (
        <TrackListItem
          key={track.id}
          track={track}
          queueContext={CURATED_TRACKS}
        />
      ))}

      {/* Section: Genre Spotlight Horizontal Showcase */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <View style={styles.sectionTitleRow}>
          <Disc3 size={18} color={colors.accentCyan} />
          <Text style={styles.sectionTitle}>Soundscapes & Genres</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Swipe through curated sonic environments</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {genreCards.map((genre, idx) => (
          <Pressable
            key={`genre-${idx}`}
            style={({ pressed }) => [
              styles.genreCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => playTrack(genre.track, CURATED_TRACKS)}
          >
            <Image source={resolveArtworkSource(genre.image)} style={styles.genreImage} />
            <View style={styles.genreGlassOverlay}>
              <Text style={styles.genreName}>{genre.name}</Text>
              <Text style={styles.genreCount}>{genre.desc}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: 175,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBrandText: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: typography.sizes.lg,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  subGreeting: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  // Bento Grid Layout
  bentoContainer: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  bentoHeroCard: {
    width: '100%',
    height: 170,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  bentoHeroPlaying: {
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  bentoHeroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bentoHeroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 11, 0.65)',
  },
  bentoHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  trendingBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  audioFormatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  audioFormatText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  bentoHeroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  bentoHeroInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  bentoHeroTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  bentoHeroArtist: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  heroPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlayButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  bentoSubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bentoSubCard: {
    width: '48.5%',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bentoSubCardActive: {
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  subCardArtworkWrapper: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
  },
  subCardArtwork: {
    width: '100%',
    height: '100%',
  },
  subCardInfo: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  subCardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  activeText: {
    color: '#FFFFFF',
  },
  subCardArtist: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  subCardPlayBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  subCardPlayBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  horizontalScroll: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  genreCard: {
    width: 160,
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  genreImage: {
    width: '100%',
    height: '100%',
  },
  genreGlassOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 12, 17, 0.88)',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  genreName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  genreCount: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
});
