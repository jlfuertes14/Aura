// Song Action Modal / Context Menu
// Bottom sheet modal for track actions: Play Next, Add to Queue, Add to Playlist, Favorite, Download
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import {
  Play,
  ListPlus,
  ListStart,
  FolderPlus,
  Heart,
  Download,
  Trash2,
  X,
  Plus,
  Check,
  FolderMinus,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Track, Playlist } from '../types/music';
import { usePlayer } from '../context/PlayerContext';
import { resolveArtworkSource } from '../services/musicService';
import { colors, spacing, typography, borderRadius } from '../theme/theme';

interface SongActionModalProps {
  visible: boolean;
  track: Track | null;
  playlistId?: string; // If provided, shows "Remove from this Playlist"
  onClose: () => void;
}

export const SongActionModal: React.FC<SongActionModalProps> = ({
  visible,
  track,
  playlistId,
  onClose,
}) => {
  const {
    playlists,
    favorites,
    toggleFavorite,
    addToQueue,
    playNext,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    downloadTrack,
    deleteDownloadedTrack,
    createPlaylist,
    activeDownloads,
  } = usePlayer();

  const [mode, setMode] = useState<'menu' | 'select-playlist' | 'new-playlist'>('menu');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!track) return null;

  const isFav = favorites.includes(track.id);
  const isDownloaded = track.isDownloaded || !!track.localUri;
  const isDownloading = activeDownloads[track.id]?.status === 'downloading';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      handleClose();
    }, 900);
  };

  const handleClose = () => {
    setMode('menu');
    setNewPlaylistName('');
    setToastMessage(null);
    onClose();
  };

  const handlePlayNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    playNext(track);
    showToast('Playing next in queue');
  };

  const handleAddToQueue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addToQueue(track);
    showToast('Added to end of queue');
  };

  const handleToggleFav = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleFavorite(track.id);
    showToast(isFav ? 'Removed from Favorites' : 'Added to Favorites');
  };

  const handleDownloadToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (isDownloaded) {
      deleteDownloadedTrack(track.id);
      showToast('Removed from offline downloads');
    } else {
      downloadTrack(track);
      showToast('Download started');
    }
  };

  const handleAddToSpecificPlaylist = (p: Playlist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addTrackToPlaylist(p.id, track);
    showToast(`Added to "${p.name}"`);
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const name = newPlaylistName.trim();
    await createPlaylist(name);
    // Find created playlist or add to the newest one
    const pId = `pl-${Date.now()}`;
    await addTrackToPlaylist(pId, track);
    showToast(`Created & added to "${name}"`);
  };

  const handleRemoveFromThisPlaylist = () => {
    if (!playlistId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    removeTrackFromPlaylist(playlistId, track.id);
    showToast('Removed from playlist');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Top Handle Drag Pill */}
          <View style={styles.dragHandle} />

          {/* Toast Notification Banner */}
          {toastMessage && (
            <View style={styles.toastBanner}>
              <Check size={14} color="#000000" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          )}

          {/* Header Track Info */}
          <View style={styles.trackHeader}>
            <Image
              source={resolveArtworkSource(track.artworkUrl)}
              style={styles.trackArt}
            />
            <View style={styles.trackMeta}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {track.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={10}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* MODE: MAIN ACTION MENU */}
          {mode === 'menu' && (
            <View style={styles.actionsList}>
              {/* Play Next */}
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={handlePlayNext}
              >
                <View style={styles.actionIconWrapper}>
                  <ListStart size={18} color="#FFFFFF" />
                </View>
                <View style={styles.actionTextWrapper}>
                  <Text style={styles.actionLabel}>Play Next</Text>
                  <Text style={styles.actionSub}>Insert right after the current playing song</Text>
                </View>
              </Pressable>

              {/* Add to Queue */}
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={handleAddToQueue}
              >
                <View style={styles.actionIconWrapper}>
                  <ListPlus size={18} color="#FFFFFF" />
                </View>
                <View style={styles.actionTextWrapper}>
                  <Text style={styles.actionLabel}>Add to End of Queue</Text>
                  <Text style={styles.actionSub}>Enqueue at the bottom of queue</Text>
                </View>
              </Pressable>

              {/* Add to Playlist */}
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={() => setMode('select-playlist')}
              >
                <View style={styles.actionIconWrapper}>
                  <FolderPlus size={18} color="#FFFFFF" />
                </View>
                <View style={styles.actionTextWrapper}>
                  <Text style={styles.actionLabel}>Add to Playlist...</Text>
                  <Text style={styles.actionSub}>Save to an existing or new playlist</Text>
                </View>
              </Pressable>

              {/* Remove from this playlist (if in playlist context) */}
              {playlistId && (
                <Pressable
                  style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                  onPress={handleRemoveFromThisPlaylist}
                >
                  <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <FolderMinus size={18} color={colors.danger} />
                  </View>
                  <View style={styles.actionTextWrapper}>
                    <Text style={[styles.actionLabel, { color: colors.danger }]}>Remove from this Playlist</Text>
                    <Text style={styles.actionSub}>Delete song from this playlist</Text>
                  </View>
                </Pressable>
              )}

              {/* Favorite Toggle */}
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={handleToggleFav}
              >
                <View style={[styles.actionIconWrapper, isFav && { backgroundColor: 'rgba(255, 66, 103, 0.15)' }]}>
                  <Heart
                    size={18}
                    color={isFav ? '#FF4267' : '#FFFFFF'}
                    fill={isFav ? '#FF4267' : 'transparent'}
                  />
                </View>
                <View style={styles.actionTextWrapper}>
                  <Text style={styles.actionLabel}>
                    {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                  </Text>
                  <Text style={styles.actionSub}>Quick access in Your Library</Text>
                </View>
              </Pressable>

              {/* Download / Delete Offline */}
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={handleDownloadToggle}
              >
                <View style={[styles.actionIconWrapper, isDownloaded && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  {isDownloaded ? (
                    <Trash2 size={18} color={colors.danger} />
                  ) : (
                    <Download size={18} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.actionTextWrapper}>
                  <Text style={[styles.actionLabel, isDownloaded && { color: colors.danger }]}>
                    {isDownloaded ? 'Delete Offline Audio' : 'Download for Offline Listening'}
                  </Text>
                  <Text style={styles.actionSub}>
                    {isDownloaded ? 'Frees up device storage' : 'Save MP3 directly to device'}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* MODE: SELECT PLAYLIST */}
          {mode === 'select-playlist' && (
            <View style={styles.subViewContainer}>
              <View style={styles.subViewHeader}>
                <Text style={styles.subViewTitle}>Add to Playlist</Text>
                <Pressable
                  style={styles.newPlaylistTrigger}
                  onPress={() => setMode('new-playlist')}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.newPlaylistTriggerText}>New</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.playlistScrollView} showsVerticalScrollIndicator={false}>
                {playlists.length === 0 ? (
                  <View style={styles.emptyPlaylistNote}>
                    <Text style={styles.emptyPlaylistText}>No custom playlists yet.</Text>
                    <Pressable
                      style={styles.createFirstBtn}
                      onPress={() => setMode('new-playlist')}
                    >
                      <Plus size={14} color="#000" />
                      <Text style={styles.createFirstBtnText}>Create Playlist</Text>
                    </Pressable>
                  </View>
                ) : (
                  playlists.map((p) => {
                    const alreadyIn = p.tracks.some((t) => t.id === track.id);
                    return (
                      <Pressable
                        key={p.id}
                        style={({ pressed }) => [
                          styles.playlistPickItem,
                          pressed && styles.actionItemPressed,
                        ]}
                        onPress={() => handleAddToSpecificPlaylist(p)}
                      >
                        <Image
                          source={resolveArtworkSource(p.coverUrl)}
                          style={styles.playlistPickArt}
                        />
                        <View style={styles.playlistPickMeta}>
                          <Text style={styles.playlistPickName} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={styles.playlistPickCount}>
                            {p.tracks.length} tracks {alreadyIn && '• Already added'}
                          </Text>
                        </View>
                        {alreadyIn ? (
                          <Check size={16} color={colors.primary} />
                        ) : (
                          <Plus size={16} color={colors.textSecondary} />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              <Pressable style={styles.backButton} onPress={() => setMode('menu')}>
                <Text style={styles.backButtonText}>Back to Actions</Text>
              </Pressable>
            </View>
          )}

          {/* MODE: CREATE NEW PLAYLIST */}
          {mode === 'new-playlist' && (
            <View style={styles.subViewContainer}>
              <Text style={styles.subViewTitle}>Create New Playlist</Text>
              <Text style={styles.subViewSubtitle}>
                Enter a name to save "{track.title}"
              </Text>

              <TextInput
                style={styles.textInput}
                placeholder="e.g., Midnight Vibes, Favorites"
                placeholderTextColor={colors.textMuted}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
              />

              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setMode('select-playlist')}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmBtn, !newPlaylistName.trim() && styles.confirmBtnDisabled]}
                  onPress={handleCreateAndAdd}
                  disabled={!newPlaylistName.trim()}
                >
                  <Text style={styles.confirmBtnText}>Create & Add</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0E131E',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.round,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  toastText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  trackArt: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
  },
  trackMeta: {
    flex: 1,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
  trackArtist: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: spacing.md,
  },
  actionsList: {
    gap: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  actionItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextWrapper: {
    flex: 1,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  subViewContainer: {
    paddingVertical: spacing.xs,
  },
  subViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subViewTitle: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: '800',
  },
  subViewSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  newPlaylistTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  newPlaylistTriggerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  playlistScrollView: {
    maxHeight: 250,
  },
  playlistPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: borderRadius.md,
  },
  playlistPickArt: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
  playlistPickMeta: {
    flex: 1,
  },
  playlistPickName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  playlistPickCount: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyPlaylistNote: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyPlaylistText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.round,
  },
  createFirstBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  backButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: 6,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
});
