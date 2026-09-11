// Search & YouTube Downloader Screen
// Automated YouTube-to-MP3 converter, direct MP3 URL downloader, and online catalogue search
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search as SearchIcon,
  Download,
  Link,
  FolderDown,
  Sparkles,
  X,
  Radio,
  Play,
  Disc3,
} from 'lucide-react-native';
import { AntDesign } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePlayer } from '../context/PlayerContext';
import { CURATED_TRACKS, getYouTubeMetadata, resolveYouTubeAudioStream, resolveArtworkSource, YouTubeInfo } from '../services/musicService';
import { extractArtistAndTitle } from '../services/lyricsService';
import { Track } from '../types/music';
import { TrackListItem } from '../components/TrackListItem';
import { colors, spacing, typography, borderRadius, layout } from '../theme/theme';

export const SearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { downloadTrack, importLocalAudio, playTrack } = usePlayer();

  const statusBarHeight = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 0;
  const safeTopPadding = Math.max(insets.top, statusBarHeight, 40) + spacing.md;

  // Search filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  // YouTube Downloader states
  const [ytUrl, setYtUrl] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [ytPreview, setYtPreview] = useState<YouTubeInfo | null>(null);
  const [ytDownloadProgress, setYtDownloadProgress] = useState<number | null>(null);
  const [ytStatusMessage, setYtStatusMessage] = useState<string>('');

  // Direct MP3 URL Downloader state
  const [showDirectUrlInput, setShowDirectUrlInput] = useState(false);
  const [directMp3Url, setDirectMp3Url] = useState('');
  const [directTitle, setDirectTitle] = useState('');

  const genres = ['All', 'Lofi', 'Synthwave', 'Acoustic', 'Ambient', 'EDM', 'Hip Hop'];

  // Handle YouTube URL change and auto-fetch metadata
  const handleYtUrlChange = async (text: string) => {
    setYtUrl(text);
    if (text.includes('youtube.com') || text.includes('youtu.be')) {
      setYtLoading(true);
      setYtStatusMessage('Detecting YouTube video...');
      try {
        const meta = await getYouTubeMetadata(text);
        if (meta) {
          const cleaned = extractArtistAndTitle(meta.title, meta.author);
          setYtPreview({
            ...meta,
            title: cleaned.title || meta.title,
            author: cleaned.artist || meta.author,
          });
          setYtStatusMessage('Ready to download');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      } catch (err) {
        setYtStatusMessage('Failed to inspect YouTube URL');
      } finally {
        setYtLoading(false);
      }
    } else {
      setYtPreview(null);
      setYtStatusMessage('');
    }
  };

  // Automated YouTube-to-MP3 Conversion & Download
  const handleDownloadYouTube = async () => {
    if (!ytPreview) {
      Alert.alert('Please enter a valid YouTube link');
      return;
    }

    try {
      setYtLoading(true);
      setYtDownloadProgress(0.1);
      setYtStatusMessage('Converting YouTube audio stream...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // 1. Resolve real audio stream & genuine image color palette
      const streamData = await resolveYouTubeAudioStream(ytPreview.videoId, ytPreview.title);
      setYtDownloadProgress(0.35);
      if (streamData.isCleanStudio) {
        setYtStatusMessage('Using clean Studio Audio (no MV skits)...');
      } else {
        setYtStatusMessage('Downloading MP3 to device storage...');
      }

      // 2. Build Track object with extracted cover palette and studio audio metadata
      const cleanMeta = extractArtistAndTitle(ytPreview.title, ytPreview.author);
      const track: Track = {
        id: `yt-${ytPreview.videoId}-${Date.now()}`,
        title: cleanMeta.title || ytPreview.title,
        artist: cleanMeta.artist || ytPreview.author,
        album: 'YouTube Downloads',
        duration: streamData.studioDuration || 210,
        artworkUrl: ytPreview.thumbnailUrl,
        audioUrl: streamData.downloadUrl || streamData.audioUrl,
        isDownloaded: false,
        source: 'youtube',
        videoId: streamData.studioVideoId || ytPreview.videoId,
        palette: streamData.palette,
        isCleanStudio: streamData.isCleanStudio,
        studioTitle: streamData.studioTitle,
      };

      // 3. Trigger native download into phone file system
      await downloadTrack(track);

      setYtDownloadProgress(1.0);
      setYtStatusMessage('Saved to Offline Library!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Auto-clear after completion
      setTimeout(() => {
        setYtUrl('');
        setYtPreview(null);
        setYtDownloadProgress(null);
        setYtStatusMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('YouTube download failed:', error);
      Alert.alert('Download Error', error.message || 'Unable to download track');
      setYtStatusMessage('Download failed. Try another link.');
    } finally {
      setYtLoading(false);
    }
  };

  // Instant Stream Playback for YouTube Preview
  const handleStreamYouTube = async () => {
    if (!ytPreview) return;

    try {
      setYtLoading(true);
      setYtStatusMessage('Connecting to YouTube audio stream...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const streamData = await resolveYouTubeAudioStream(ytPreview.videoId, ytPreview.title);
      const track: Track = {
        id: `yt-${ytPreview.videoId}-${Date.now()}`,
        title: ytPreview.title,
        artist: ytPreview.author,
        album: 'YouTube Stream',
        duration: streamData.studioDuration || 210,
        artworkUrl: ytPreview.thumbnailUrl,
        audioUrl: streamData.audioUrl || streamData.downloadUrl,
        isDownloaded: false,
        source: 'youtube',
        videoId: streamData.studioVideoId || ytPreview.videoId,
        palette: streamData.palette,
        isCleanStudio: streamData.isCleanStudio,
        studioTitle: streamData.studioTitle,
      };

      playTrack(track);
      if (streamData.isCleanStudio) {
        setYtStatusMessage('Playing Pure Studio Audio (MV skits filtered out)');
      } else {
        setYtStatusMessage('Playing audio stream...');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error: any) {
      console.error('YouTube stream failed:', error);
      Alert.alert('Stream Error', error.message || 'Unable to play stream');
      setYtStatusMessage('Stream playback failed.');
    } finally {
      setYtLoading(false);
    }
  };

  // Handle Direct MP3 Download
  const handleDownloadDirectUrl = async () => {
    if (!directMp3Url.trim()) return;

    try {
      const track: Track = {
        id: `url-${Date.now()}`,
        title: directTitle.trim() || 'Online MP3 Track',
        artist: 'Web Stream',
        album: 'Web Downloads',
        duration: 180,
        artworkUrl: 'lofi_city',
        audioUrl: directMp3Url.trim(),
        isDownloaded: false,
        source: 'url',
      };

      await downloadTrack(track);
      setShowDirectUrlInput(false);
      setDirectMp3Url('');
      setDirectTitle('');
      Alert.alert('Success', 'MP3 is downloading to your Offline Library!');
    } catch (error: any) {
      Alert.alert('Download Error', error.message || 'Could not download from URL');
    }
  };

  // Filter curated tracks
  const filteredTracks = CURATED_TRACKS.filter((track) => {
    const matchesSearch =
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: safeTopPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Search & Download</Text>
          <Text style={styles.pageSubtitle}>
            Paste YouTube links, direct MP3s, or browse the music catalogue
          </Text>
        </View>
      </View>

      {/* HERO: Double-Bezel Automated YouTube Downloader Card */}
      <View style={styles.ytCard}>
        <View style={styles.ytCardHeader}>
          <View style={styles.ytIconBox}>
            <AntDesign name="youtube" size={22} color="#FF2A2A" />
          </View>
          <View style={styles.ytHeaderText}>
            <Text style={styles.ytTitle}>Automated YouTube to MP3</Text>
            <Text style={styles.ytSubtitle}>Paste any YouTube link to convert & download instantly</Text>
          </View>
        </View>

        {/* URL Input Box with Recessed Chamber */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Paste YouTube link (https://youtu.be/...)"
            placeholderTextColor={colors.textMuted}
            value={ytUrl}
            onChangeText={handleYtUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {ytUrl.length > 0 && (
            <Pressable
              style={styles.clearBtn}
              onPress={() => {
                setYtUrl('');
                setYtPreview(null);
                setYtStatusMessage('');
              }}
            >
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Live Detected Preview Card with Concentric Double-Bezel */}
        {ytPreview && (
          <View style={styles.previewBox}>
            <View style={styles.previewThumbBezel}>
              <Image source={resolveArtworkSource(ytPreview.thumbnailUrl)} style={styles.previewThumb} />
            </View>
            <View style={styles.previewInfo}>
              <Text numberOfLines={2} style={styles.previewTitle}>
                {ytPreview.title}
              </Text>
              <Text numberOfLines={1} style={styles.previewAuthor}>
                {ytPreview.author}
              </Text>
              <View style={styles.pureStudioBadge}>
                <Disc3 size={11} color="#FFFFFF" />
                <Text style={styles.pureStudioBadgeText}>Pure Studio Audio Engine Active</Text>
              </View>
            </View>
          </View>
        )}

        {/* Status / Progress Indicator */}
        {ytStatusMessage.length > 0 && (
          <View style={styles.statusRow}>
            {ytLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text style={styles.statusText}>{ytStatusMessage}</Text>
          </View>
        )}

        {ytDownloadProgress !== null && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${ytDownloadProgress * 100}%` }]} />
          </View>
        )}

        {/* Actions: Stream Now or Download MP3 */}
        {ytPreview && (
          <View style={styles.ytActionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.streamYtBtn,
                pressed && styles.streamYtBtnPressed,
                ytLoading && styles.btnDisabled,
              ]}
              disabled={ytLoading}
              onPress={handleStreamYouTube}
            >
              <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.streamYtBtnText}>Play Stream</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.downloadYtBtn,
                pressed && styles.downloadYtBtnPressed,
                ytLoading && styles.btnDisabled,
              ]}
              disabled={ytLoading}
              onPress={handleDownloadYouTube}
            >
              <Download size={16} color="#000000" />
              <Text style={styles.downloadYtBtnText}>
                {ytLoading ? 'Processing...' : 'Save MP3'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Secondary Actions: Direct MP3 URL & Phone Import */}
      <View style={styles.secondaryActionsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.secondaryBtnPressed,
          ]}
          onPress={() => setShowDirectUrlInput(!showDirectUrlInput)}
        >
          <Link size={16} color={colors.accentCyan} />
          <Text style={styles.secondaryBtnText}>Direct MP3 URL</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.secondaryBtnPressed,
          ]}
          onPress={importLocalAudio}
        >
          <FolderDown size={16} color={colors.primary} />
          <Text style={styles.secondaryBtnText}>Import from Phone</Text>
        </Pressable>
      </View>

      {/* Optional Direct URL Expandable Card */}
      {showDirectUrlInput && (
        <View style={styles.directUrlCard}>
          <Text style={styles.directUrlTitle}>Download from MP3 Link</Text>
          <TextInput
            style={[styles.textInputInCard, { marginBottom: 8 }]}
            placeholder="Track Title (Optional)"
            placeholderTextColor={colors.textMuted}
            value={directTitle}
            onChangeText={setDirectTitle}
          />
          <TextInput
            style={styles.textInputInCard}
            placeholder="Direct audio link (e.g. https://.../song.mp3)"
            placeholderTextColor={colors.textMuted}
            value={directMp3Url}
            onChangeText={setDirectMp3Url}
            autoCapitalize="none"
          />
          <Pressable style={styles.directUrlBtn} onPress={handleDownloadDirectUrl}>
            <Text style={styles.directUrlBtnText}>Start Download</Text>
          </Pressable>
        </View>
      )}

      {/* In-App Music Search Bar */}
      <View style={styles.searchBar}>
        <SearchIcon size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by song, artist, or vibe..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Genre Filter Chips with Tactile Feedback */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreChipsScroll}
      >
        {genres.map((genre) => {
          const isSelected = selectedGenre === genre;
          return (
            <Pressable
              key={genre}
              style={({ pressed }) => [
                styles.genreChip,
                isSelected && styles.activeGenreChip,
                pressed && styles.genreChipPressed,
              ]}
              onPress={() => setSelectedGenre(genre)}
            >
              <Text style={[styles.genreChipText, isSelected && styles.activeGenreChipText]}>
                {genre}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Search Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {searchQuery ? `Results for "${searchQuery}"` : 'Curated Library'}
        </Text>
        <Text style={[styles.resultsCount, typography.tabularNumbers]}>{filteredTracks.length} tracks</Text>
      </View>

      {filteredTracks.map((track) => (
        <TrackListItem
          key={track.id}
          track={track}
          queueContext={filteredTracks}
        />
      ))}
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
    marginBottom: spacing.base,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  ytCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.22)',
    marginBottom: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  ytCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ytIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 60, 60, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ytHeaderText: {
    flex: 1,
  },
  ytTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  ytSubtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.md,
    height: 48,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
  },
  clearBtn: {
    padding: 4,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  previewThumbBezel: {
    width: 68,
    height: 52,
    borderRadius: borderRadius.sm,
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewThumb: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
  previewInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  previewAuthor: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  ytActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  streamYtBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    height: 46,
  },
  streamYtBtnPressed: {
    backgroundColor: '#334155',
    transform: [{ scale: 0.985 }],
  },
  streamYtBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  downloadYtBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    height: 46,
  },
  downloadYtBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    transform: [{ scale: 0.985 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },
  downloadYtBtnText: {
    color: '#000000',
    fontSize: typography.sizes.sm,
    fontWeight: '800',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryBtnPressed: {
    backgroundColor: colors.surfaceLight,
    transform: [{ scale: 0.98 }],
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  directUrlCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  directUrlTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  textInputInCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.md,
    height: 44,
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
  },
  directUrlBtn: {
    backgroundColor: colors.accentCyan,
    borderRadius: borderRadius.sm,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  directUrlBtnText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    height: 48,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
  },
  genreChipsScroll: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  genreChipPressed: {
    transform: [{ scale: 0.96 }],
  },
  activeGenreChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  genreChipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  activeGenreChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  resultsTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  resultsCount: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  pureStudioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    marginTop: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  pureStudioBadgeText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
