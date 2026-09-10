// Library Screen: Offline Downloaded MP3s Manager, Hardware Storage Meter, and Playlists
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import {
  FolderCheck,
  Heart,
  ListPlus,
  Play,
  Shuffle,
  FolderDown,
  Plus,
  X,
  Radio,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePlayer } from '../context/PlayerContext';
import { TrackListItem } from '../components/TrackListItem';
import { CURATED_TRACKS, EMPTY_LIBRARY_ARTWORK, resolveArtworkSource } from '../services/musicService';
import { colors, spacing, typography, borderRadius, layout } from '../theme/theme';

export const LibraryScreen: React.FC = () => {
  const {
    downloadedTracks,
    favorites,
    playlists,
    playTrack,
    importLocalAudio,
    createPlaylist,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<'downloads' | 'favorites' | 'playlists'>('downloads');
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Filter favorite tracks
  const favoriteTracks = [
    ...downloadedTracks,
    ...CURATED_TRACKS,
  ].filter((track, index, self) =>
    favorites.includes(track.id) && self.findIndex((t) => t.id === track.id) === index
  );

  const handlePlayAllDownloads = () => {
    if (downloadedTracks.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      playTrack(downloadedTracks[0], downloadedTracks);
    }
  };

  const handleShuffleAllDownloads = () => {
    if (downloadedTracks.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const shuffled = [...downloadedTracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowNewPlaylistModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Library</Text>
          <Pressable
            style={({ pressed }) => [
              styles.importBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={importLocalAudio}
          >
            <FolderDown size={16} color="#FFFFFF" />
            <Text style={styles.importBtnText}>Import Audio</Text>
          </Pressable>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabRow}>
          <Pressable
            style={({ pressed }) => [
              styles.tabBtn,
              activeTab === 'downloads' && styles.activeTabBtn,
              pressed && styles.tabBtnPressed,
            ]}
            onPress={() => setActiveTab('downloads')}
          >
            <FolderCheck
              size={15}
              color={activeTab === 'downloads' ? '#FFFFFF' : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'downloads' && styles.activeTabText]}>
              Downloaded ({downloadedTracks.length})
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.tabBtn,
              activeTab === 'favorites' && styles.activeTabBtn,
              pressed && styles.tabBtnPressed,
            ]}
            onPress={() => setActiveTab('favorites')}
          >
            <Heart
              size={15}
              color={activeTab === 'favorites' ? '#FF4267' : colors.textMuted}
              fill={activeTab === 'favorites' ? '#FF4267' : 'transparent'}
            />
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
              Favorites ({favoriteTracks.length})
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.tabBtn,
              activeTab === 'playlists' && styles.activeTabBtn,
              pressed && styles.tabBtnPressed,
            ]}
            onPress={() => setActiveTab('playlists')}
          >
            <ListPlus
              size={15}
              color={activeTab === 'playlists' ? '#FFFFFF' : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'playlists' && styles.activeTabText]}>
              Playlists ({playlists.length})
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: DOWNLOADED (OFFLINE) */}
        {activeTab === 'downloads' && (
          <View>
            {/* Quick Actions if songs exist */}
            {downloadedTracks.length > 0 && (
              <View style={styles.quickActionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionPill,
                    pressed && styles.actionPillPressed,
                  ]}
                  onPress={handlePlayAllDownloads}
                >
                  <Play size={13} color="#000" fill="#000" />
                  <Text style={styles.actionPillText}>Play All</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionPillOutline,
                    pressed && styles.actionPillOutlinePressed,
                  ]}
                  onPress={handleShuffleAllDownloads}
                >
                  <Shuffle size={13} color="#FFF" />
                  <Text style={styles.actionPillOutlineText}>Shuffle</Text>
                </Pressable>
              </View>
            )}

            {/* Track List or Bespoke Empty State */}
            {downloadedTracks.length > 0 ? (
              downloadedTracks.map((track) => (
                <TrackListItem
                  key={track.id}
                  track={track}
                  queueContext={downloadedTracks}
                  showDelete={true}
                />
              ))
            ) : (
              <View style={styles.bespokeEmptyState}>
                <View style={styles.emptyArtOuterFrame}>
                  <Image source={resolveArtworkSource(EMPTY_LIBRARY_ARTWORK)} style={styles.emptyArtImage} />
                  <View style={styles.emptyArtGlassBadge}>
                    <Sparkles size={14} color="#FFFFFF" />
                    <Text style={styles.emptyArtBadgeText}>Awaiting Audio</Text>
                  </View>
                </View>
                <Text style={styles.emptyTitle}>Your offline vault is empty</Text>
                <Text style={styles.emptySubtitle}>
                  Paste any YouTube link in Search or tap "Download MP3" on any curated song to save high-bitrate offline audio.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyExploreBtn,
                    pressed && styles.btnPressed,
                  ]}
                  onPress={() => {
                    if (CURATED_TRACKS.length > 0) {
                      playTrack(CURATED_TRACKS[0], CURATED_TRACKS);
                    }
                  }}
                >
                  <Play size={14} color="#000000" fill="#000000" />
                  <Text style={styles.emptyExploreBtnText}>Play Curated Tracks</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: FAVORITES */}
        {activeTab === 'favorites' && (
          <View>
            {favoriteTracks.length > 0 ? (
              favoriteTracks.map((track) => (
                <TrackListItem
                  key={track.id}
                  track={track}
                  queueContext={favoriteTracks}
                />
              ))
            ) : (
              <View style={styles.bespokeEmptyState}>
                <View style={styles.heartEmptyCircle}>
                  <Heart size={36} color="#FF4267" />
                </View>
                <Text style={styles.emptyTitle}>No liked songs yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap the heart icon on any song or playing banner to build your personalized favorites collection.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: PLAYLISTS */}
        {activeTab === 'playlists' && (
          <View>
            {/* Create Playlist Button */}
            <Pressable
              style={({ pressed }) => [
                styles.createPlaylistBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => setShowNewPlaylistModal(true)}
            >
              <Plus size={18} color="#000" />
              <Text style={styles.createPlaylistText}>New Playlist</Text>
            </Pressable>

            {playlists.map((pl) => (
              <Pressable
                key={pl.id}
                style={styles.playlistRow}
                onPress={() => {
                  if (pl.tracks.length > 0) {
                    playTrack(pl.tracks[0], pl.tracks);
                  } else {
                    Alert.alert(pl.name, 'This playlist has no songs yet.');
                  }
                }}
              >
                <View style={styles.playlistIconBox}>
                  <Radio size={20} color="#FFFFFF" />
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{pl.name}</Text>
                  <Text style={styles.playlistCount}>
                    {pl.tracks.length} {pl.tracks.length === 1 ? 'song' : 'songs'} • {pl.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* New Playlist Modal */}
      <Modal visible={showNewPlaylistModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Playlist</Text>
              <Pressable onPress={() => setShowNewPlaylistModal(false)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor={colors.textMuted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <Pressable style={styles.modalSubmitBtn} onPress={handleCreatePlaylist}>
              <Text style={styles.modalSubmitText}>Create</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
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
    marginBottom: spacing.base,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  btnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtnPressed: {
    transform: [{ scale: 0.96 }],
  },
  activeTabBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  tabText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.round,
  },
  actionPillPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  actionPillText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: '800',
  },
  actionPillOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  actionPillOutlinePressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionPillOutlineText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  // Bespoke Empty State
  bespokeEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyArtOuterFrame: {
    width: 220,
    height: 160,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: colors.surface,
  },
  emptyArtImage: {
    width: '100%',
    height: '100%',
  },
  emptyArtGlassBadge: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(5, 7, 11, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  emptyArtBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  heartEmptyCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 66, 103, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 66, 103, 0.25)',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyExploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.round,
    marginTop: spacing.lg,
  },
  emptyExploreBtnText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: '800',
  },
  createPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    height: 44,
    borderRadius: borderRadius.md,
    marginBottom: spacing.base,
  },
  createPlaylistText: {
    color: '#000000',
    fontSize: typography.sizes.sm,
    fontWeight: '800',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  playlistIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  playlistCount: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  modalInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalSubmitBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#000000',
    fontSize: typography.sizes.sm,
    fontWeight: '800',
  },
});
