// Library Screen: Offline Downloaded MP3s Manager, Playlists & Spotify Playlist Importer
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
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  ArrowLeft,
  Link,
  Music,
  Download,
  Disc3,
  Trash2,
  Camera,
  Image as ImageIcon,
  Check,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { usePlayer } from '../context/PlayerContext';
import { TrackListItem } from '../components/TrackListItem';
import {
  CURATED_TRACKS,
  EMPTY_LIBRARY_ARTWORK,
  resolveArtworkSource,
  fetchSpotifyPlaylist,
} from '../services/musicService';
import { Playlist, Track, SpotifyPlaylistResult } from '../types/music';
import { colors, spacing, typography, borderRadius, layout } from '../theme/theme';

const CURATED_COVERS = [
  { id: 'synthwave_grid', name: 'Synthwave' },
  { id: 'lofi_city', name: 'Lofi City' },
  { id: 'ambient_astral', name: 'Ambient' },
  { id: 'edm_pulse', name: 'EDM Pulse' },
  { id: 'acoustic_morning', name: 'Acoustic' },
  { id: 'hiphop_street', name: 'Hip Hop' },
];

export const LibraryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    downloadedTracks,
    favorites,
    playlists,
    playTrack,
    importLocalAudio,
    createPlaylist,
    deletePlaylist,
    updatePlaylistCover,
    importSpotifyPlaylist,
  } = usePlayer();

  const statusBarHeight = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 0;
  const safeTopPadding = Math.max(insets.top, statusBarHeight, 40) + spacing.md;

  const [activeTab, setActiveTab] = useState<'downloads' | 'favorites' | 'playlists'>('downloads');
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Spotify Importer states
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyPreview, setSpotifyPreview] = useState<SpotifyPlaylistResult | null>(null);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  // Cover Picker states
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState('');

  // Selected Playlist drill-in view
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const selectedPlaylist = selectedPlaylistId
    ? playlists.find((p) => p.id === selectedPlaylistId) || null
    : null;

  const handleDeletePlaylist = (playlist: Playlist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlaylist(playlist.id);
            if (selectedPlaylistId === playlist.id) {
              setSelectedPlaylistId(null);
            }
          },
        },
      ]
    );
  };

  const handleSelectCuratedCover = async (coverId: string) => {
    if (!selectedPlaylist) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await updatePlaylistCover(selectedPlaylist.id, coverId);
    setShowCoverPicker(false);
  };

  const handlePickDeviceImage = async () => {
    if (!selectedPlaylist) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await updatePlaylistCover(selectedPlaylist.id, imageUri);
        setShowCoverPicker(false);
      }
    } catch (err) {
      console.error('Failed to pick device photo:', err);
    }
  };

  const handleApplyCustomUrl = async () => {
    if (!selectedPlaylist || !customCoverUrl.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await updatePlaylistCover(selectedPlaylist.id, customCoverUrl.trim());
    setCustomCoverUrl('');
    setShowCoverPicker(false);
  };

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

  const handleInspectSpotify = async (urlToInspect?: string) => {
    const targetUrl = (urlToInspect || spotifyUrl).trim();
    if (!targetUrl) {
      setSpotifyError('Please enter a Spotify playlist URL');
      return;
    }

    setSpotifyLoading(true);
    setSpotifyError(null);
    setSpotifyPreview(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      const data = await fetchSpotifyPlaylist(targetUrl);
      setSpotifyPreview(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setSpotifyError(err.message || 'Failed to inspect Spotify playlist. Ensure the link is public.');
    } finally {
      setSpotifyLoading(false);
    }
  };

  const handleConfirmSpotifyImport = async () => {
    if (!spotifyUrl.trim() && !spotifyPreview) return;
    const url = spotifyUrl.trim() || (spotifyPreview ? `https://open.spotify.com/playlist/${spotifyPreview.id}` : '');

    setSpotifyLoading(true);
    try {
      const newPlaylist = await importSpotifyPlaylist(url);
      setShowSpotifyModal(false);
      setSpotifyUrl('');
      setSpotifyPreview(null);
      setSpotifyError(null);
      setSelectedPlaylistId(newPlaylist.id);
      setActiveTab('playlists');
    } catch (err: any) {
      setSpotifyError(err.message || 'Failed to save Spotify playlist to library.');
    } finally {
      setSpotifyLoading(false);
    }
  };

  // ----------------------------------------------------
  // VIEW: PLAYLIST DETAIL DRILL-IN SCREEN
  // ----------------------------------------------------
  if (selectedPlaylist) {
    const isSpotify = !!selectedPlaylist.spotifyUrl || selectedPlaylist.id.startsWith('pl-spotify');

    const handlePlayAllPlaylist = () => {
      if (selectedPlaylist.tracks.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks);
      }
    };

    const handleShufflePlaylist = () => {
      if (selectedPlaylist.tracks.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        const shuffled = [...selectedPlaylist.tracks].sort(() => Math.random() - 0.5);
        playTrack(shuffled[0], shuffled);
      }
    };

    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.contentContainer, { paddingTop: safeTopPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Navigation & Playlist Actions Bar */}
          <View style={styles.topNavRow}>
            <Pressable
              style={({ pressed }) => [styles.backNavBtn, pressed && styles.btnPressed]}
              onPress={() => setSelectedPlaylistId(null)}
            >
              <ArrowLeft size={18} color="#FFFFFF" />
              <Text style={styles.backNavText}>Back to Library</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.deletePlaylistNavBtn, pressed && styles.btnPressed]}
              onPress={() => handleDeletePlaylist(selectedPlaylist)}
            >
              <Trash2 size={16} color={colors.danger} />
              <Text style={styles.deletePlaylistNavText}>Delete</Text>
            </Pressable>
          </View>

          {/* Playlist Hero Spotlight with Cover Change Tap */}
          <View style={styles.playlistHeroCard}>
            <Pressable
              style={styles.playlistHeroCoverWrapper}
              onPress={() => setShowCoverPicker(true)}
            >
              <Image
                source={resolveArtworkSource(selectedPlaylist.coverUrl)}
                style={styles.playlistHeroCover}
              />
              <View style={styles.changeCoverBadge}>
                <Camera size={12} color="#FFFFFF" />
                <Text style={styles.changeCoverText}>Edit</Text>
              </View>
            </Pressable>
            <View style={styles.playlistHeroMeta}>
              <View style={styles.playlistHeroBadgeRow}>
                {isSpotify ? (
                  <View style={styles.spotifyTag}>
                    <Text style={styles.spotifyTagText}>SPOTIFY IMPORT</Text>
                  </View>
                ) : (
                  <View style={styles.localTag}>
                    <Text style={styles.localTagText}>PLAYLIST</Text>
                  </View>
                )}
                <Text style={styles.playlistHeroCount}>
                  {selectedPlaylist.tracks.length} {selectedPlaylist.tracks.length === 1 ? 'track' : 'tracks'}
                </Text>
              </View>

              <Text style={styles.playlistHeroTitle} numberOfLines={2}>
                {selectedPlaylist.name}
              </Text>
              {selectedPlaylist.description ? (
                <Text style={styles.playlistHeroDesc} numberOfLines={2}>
                  {selectedPlaylist.description}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Action Row */}
          {selectedPlaylist.tracks.length > 0 && (
            <View style={styles.quickActionsRow}>
              <Pressable
                style={({ pressed }) => [styles.quickActionPlayBtn, pressed && styles.btnPressed]}
                onPress={handlePlayAllPlaylist}
              >
                <Play size={14} color="#000000" fill="#000000" style={{ marginLeft: 1 }} />
                <Text style={styles.quickActionPlayText}>Play All</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.quickActionShuffleBtn, pressed && styles.btnPressed]}
                onPress={handleShufflePlaylist}
              >
                <Shuffle size={14} color="#FFFFFF" />
                <Text style={styles.quickActionShuffleText}>Shuffle</Text>
              </Pressable>
            </View>
          )}

          {/* Tracks List */}
          <View style={styles.playlistTracksSection}>
            {selectedPlaylist.tracks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Disc3 size={44} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No tracks in this playlist yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add songs from the Search screen or tap the 3-dots on any song to add it here.
                </Text>
              </View>
            ) : (
              selectedPlaylist.tracks.map((track) => (
                <TrackListItem
                  key={track.id}
                  track={track}
                  playlistId={selectedPlaylist.id}
                  queueContext={selectedPlaylist.tracks}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* MODAL: CHOOSE PLAYLIST COVER */}
        <Modal
          visible={showCoverPicker}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowCoverPicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowCoverPicker(false)}>
            <Pressable style={styles.coverPickerCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Playlist Cover</Text>
                <Pressable onPress={() => setShowCoverPicker(false)} hitSlop={8}>
                  <X size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.coverPickerSectionTitle}>AURA SOUNDSCAPE ART</Text>
              <View style={styles.curatedCoversGrid}>
                {CURATED_COVERS.map((cov) => (
                  <Pressable
                    key={cov.id}
                    style={({ pressed }) => [
                      styles.curatedCoverItem,
                      selectedPlaylist?.coverUrl === cov.id && styles.curatedCoverItemActive,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => handleSelectCuratedCover(cov.id)}
                  >
                    <Image source={resolveArtworkSource(cov.id)} style={styles.curatedCoverImage} />
                    <Text style={styles.curatedCoverName} numberOfLines={1}>
                      {cov.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.coverDivider} />

              <Text style={styles.coverPickerSectionTitle}>DEVICE OR CUSTOM URL</Text>

              {/* Pick from device file button */}
              <Pressable
                style={({ pressed }) => [styles.pickDeviceBtn, pressed && styles.btnPressed]}
                onPress={handlePickDeviceImage}
              >
                <ImageIcon size={16} color="#FFFFFF" />
                <Text style={styles.pickDeviceBtnText}>Choose Photo from Device</Text>
              </Pressable>

              {/* Custom URL Input */}
              <View style={styles.coverUrlInputRow}>
                <TextInput
                  style={styles.coverUrlInput}
                  placeholder="Or paste image URL (https://...)"
                  placeholderTextColor={colors.textMuted}
                  value={customCoverUrl}
                  onChangeText={setCustomCoverUrl}
                />
                <Pressable
                  style={[styles.applyUrlBtn, !customCoverUrl.trim() && styles.applyUrlBtnDisabled]}
                  disabled={!customCoverUrl.trim()}
                  onPress={handleApplyCustomUrl}
                >
                  <Text style={styles.applyUrlBtnText}>Apply</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // ----------------------------------------------------
  // VIEW: MAIN LIBRARY TABS
  // ----------------------------------------------------
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingTop: safeTopPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Library</Text>
          <Pressable
            style={({ pressed }) => [styles.importBtn, pressed && styles.btnPressed]}
            onPress={importLocalAudio}
          >
            <FolderDown size={16} color="#FFFFFF" />
            <Text style={styles.importBtnText}>Import Audio</Text>
          </Pressable>
        </View>

        {/* Tab Filters - Slidable Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollWrapper}
          contentContainerStyle={styles.tabScrollContent}
        >
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
        </ScrollView>

        {/* TAB 1: DOWNLOADED (OFFLINE) */}
        {activeTab === 'downloads' && (
          <View>
            {downloadedTracks.length > 0 && (
              <View style={styles.quickActionsRow}>
                <Pressable
                  style={({ pressed }) => [styles.quickActionPlayBtn, pressed && styles.btnPressed]}
                  onPress={handlePlayAllDownloads}
                >
                  <Play size={14} color="#000000" fill="#000000" style={{ marginLeft: 1 }} />
                  <Text style={styles.quickActionPlayText}>Play All</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.quickActionShuffleBtn, pressed && styles.btnPressed]}
                  onPress={handleShuffleAllDownloads}
                >
                  <Shuffle size={14} color="#FFFFFF" />
                  <Text style={styles.quickActionShuffleText}>Shuffle</Text>
                </Pressable>
              </View>
            )}

            {downloadedTracks.length > 0 ? (
              downloadedTracks.map((track) => (
                <TrackListItem
                  key={track.id}
                  track={track}
                  queueContext={downloadedTracks}
                  showDelete
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyArtworkContainer}>
                  <Image source={resolveArtworkSource(EMPTY_LIBRARY_ARTWORK)} style={styles.emptyArtwork} />
                  <View style={styles.emptyArtworkGloss} />
                </View>
                <Text style={styles.emptyTitle}>No offline tracks downloaded</Text>
                <Text style={styles.emptySubtitle}>
                  Save any song from Search, Home or imported Spotify playlists for seamless offline listening with synced lyrics.
                </Text>
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
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Heart size={32} color="#FF4267" fill="#FF4267" />
                </View>
                <Text style={styles.emptyTitle}>No liked songs yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap the heart icon on any song or playing banner to build your personalized favorites collection.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: PLAYLISTS & SPOTIFY IMPORTER */}
        {activeTab === 'playlists' && (
          <View>
            {/* Action Buttons Row */}
            <View style={styles.playlistActionsRow}>
              <Pressable
                style={({ pressed }) => [styles.createPlaylistBtn, pressed && styles.btnPressed]}
                onPress={() => setShowNewPlaylistModal(true)}
              >
                <Plus size={16} color="#000000" />
                <Text style={styles.createPlaylistText}>New Playlist</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.importSpotifyBtn, pressed && styles.btnPressed]}
                onPress={() => {
                  setSpotifyError(null);
                  setShowSpotifyModal(true);
                }}
              >
                <View style={styles.spotifyDot} />
                <Text style={styles.importSpotifyText}>Import Spotify</Text>
              </Pressable>
            </View>

            {/* Spotify Importer Banner Card */}
            <Pressable
              style={({ pressed }) => [styles.spotifyBannerCard, pressed && styles.btnPressed]}
              onPress={() => {
                setSpotifyError(null);
                setShowSpotifyModal(true);
              }}
            >
              <View style={styles.spotifyBannerIconBox}>
                <Disc3 size={24} color="#1DB954" />
              </View>
              <View style={styles.spotifyBannerText}>
                <View style={styles.spotifyBannerTopRow}>
                  <Text style={styles.spotifyBannerTitle}>Spotify Playlist Sync</Text>
                  <View style={styles.spotifyBannerTag}>
                    <Text style={styles.spotifyBannerTagText}>AUTO-STREAM</Text>
                  </View>
                </View>
                <Text style={styles.spotifyBannerSub}>
                  Paste any public Spotify link to extract tracks & stream with synced lyrics.
                </Text>
              </View>
            </Pressable>

            {/* Playlists List */}
            {playlists.map((pl) => {
              const isPlSpotify = !!pl.spotifyUrl || pl.id.startsWith('pl-spotify');
              return (
                <Pressable
                  key={pl.id}
                  style={({ pressed }) => [styles.playlistRow, pressed && styles.cardPressed]}
                  onPress={() => setSelectedPlaylistId(pl.id)}
                >
                  <Image
                    source={resolveArtworkSource(pl.coverUrl)}
                    style={styles.playlistCoverThumb}
                  />
                  <View style={styles.playlistInfo}>
                    <View style={styles.playlistTitleRow}>
                      <Text style={styles.playlistName} numberOfLines={1}>
                        {pl.name}
                      </Text>
                      {isPlSpotify && (
                        <View style={styles.spotifyMiniPill}>
                          <Text style={styles.spotifyMiniPillText}>SPOTIFY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.playlistCount} numberOfLines={1}>
                      {pl.tracks.length} {pl.tracks.length === 1 ? 'song' : 'songs'} • {pl.description}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.playlistCardDeleteBtn}
                    hitSlop={12}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(pl);
                    }}
                  >
                    <Trash2 size={16} color="rgba(255, 68, 68, 0.75)" />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MODAL: CREATE MANUAL PLAYLIST */}
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

      {/* MODAL: IMPORT SPOTIFY PLAYLIST */}
      <Modal visible={showSpotifyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={styles.spotifyDot} />
                <Text style={styles.modalTitle}>Import Spotify Playlist</Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowSpotifyModal(false);
                  setSpotifyPreview(null);
                  setSpotifyError(null);
                }}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.spotifyModalSubtitle}>
              Paste any public Spotify playlist URL. Aura extracts all tracks and matches YouTube audio streams on demand.
            </Text>

            <View style={styles.urlInputRow}>
              <TextInput
                style={styles.spotifyInput}
                placeholder="https://open.spotify.com/playlist/..."
                placeholderTextColor={colors.textMuted}
                value={spotifyUrl}
                onChangeText={(text) => {
                  setSpotifyUrl(text);
                  setSpotifyError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {spotifyUrl.length > 0 && (
                <Pressable
                  style={styles.clearInputBtn}
                  onPress={() => {
                    setSpotifyUrl('');
                    setSpotifyPreview(null);
                    setSpotifyError(null);
                  }}
                >
                  <X size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Quick Demo Paste Pill */}
            <View style={styles.demoLinkRow}>
              <Text style={styles.demoLinkHint}>Quick test:</Text>
              <Pressable
                style={({ pressed }) => [styles.demoLinkPill, pressed && styles.btnPressed]}
                onPress={() => {
                  const demoUrl = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
                  setSpotifyUrl(demoUrl);
                  handleInspectSpotify(demoUrl);
                }}
              >
                <Sparkles size={11} color="#1DB954" />
                <Text style={styles.demoLinkText}>Today's Top Hits</Text>
              </Pressable>
            </View>

            {/* Error Message */}
            {spotifyError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{spotifyError}</Text>
              </View>
            ) : null}

            {/* Preview Card */}
            {spotifyLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#1DB954" />
                <Text style={styles.loadingText}>Fetching playlist metadata from Spotify...</Text>
              </View>
            ) : spotifyPreview ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: spotifyPreview.coverUrl }} style={styles.previewImage} />
                <View style={styles.previewMeta}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {spotifyPreview.name}
                  </Text>
                  <Text style={styles.previewCount}>
                    {spotifyPreview.trackCount} tracks found
                  </Text>
                  {spotifyPreview.tracks.length > 0 && (
                    <Text style={styles.previewSample} numberOfLines={1}>
                      Includes: {spotifyPreview.tracks.slice(0, 3).map((t) => t.title).join(', ')}...
                    </Text>
                  )}
                </View>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              {!spotifyPreview ? (
                <Pressable
                  style={[styles.modalPrimaryBtn, spotifyLoading && styles.btnDisabled]}
                  onPress={() => handleInspectSpotify()}
                  disabled={spotifyLoading}
                >
                  {spotifyLoading ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Inspect Playlist</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.modalSaveSpotifyBtn, spotifyLoading && styles.btnDisabled]}
                  onPress={handleConfirmSpotifyImport}
                  disabled={spotifyLoading}
                >
                  {spotifyLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveSpotifyBtnText}>
                      Save {spotifyPreview.trackCount} Tracks to Library
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
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
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  tabScrollWrapper: {
    marginHorizontal: -spacing.base,
    marginBottom: spacing.lg,
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeTabBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBtnPressed: {
    opacity: 0.8,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  quickActionPlayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    height: 40,
    borderRadius: borderRadius.round,
  },
  quickActionPlayText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: '800',
  },
  quickActionShuffleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: 40,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  quickActionShuffleText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: spacing.xl,
  },
  emptyArtworkContainer: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  emptyArtwork: {
    width: '100%',
    height: '100%',
  },
  emptyArtworkGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 66, 103, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  playlistActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.base,
  },
  createPlaylistBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    height: 44,
    borderRadius: borderRadius.md,
  },
  createPlaylistText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: '800',
  },
  importSpotifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.35)',
  },
  spotifyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1DB954',
  },
  importSpotifyText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: '800',
  },
  spotifyBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(29, 185, 84, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.22)',
    marginBottom: spacing.lg,
  },
  spotifyBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  spotifyBannerText: {
    flex: 1,
  },
  spotifyBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  spotifyBannerTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  spotifyBannerTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(29, 185, 84, 0.25)',
  },
  spotifyBannerTagText: {
    color: '#1DB954',
    fontSize: 9,
    fontWeight: '800',
  },
  spotifyBannerSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
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
  playlistCoverThumb: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playlistName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  spotifyMiniPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(29, 185, 84, 0.2)',
  },
  spotifyMiniPillText: {
    color: '#1DB954',
    fontSize: 8,
    fontWeight: '800',
  },
  playlistCount: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
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
    marginBottom: spacing.sm,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  spotifyModalSubtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  urlInputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  spotifyInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingRight: 36,
    height: 44,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: typography.sizes.xs,
  },
  clearInputBtn: {
    position: 'absolute',
    right: 10,
    top: 14,
    padding: 2,
  },
  demoLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: spacing.md,
  },
  demoLinkHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  demoLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.25)',
  },
  demoLinkText: {
    color: '#1DB954',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 66, 103, 0.12)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 66, 103, 0.3)',
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#FF6B8B',
    fontSize: typography.sizes.xs,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(29, 185, 84, 0.08)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
    marginBottom: spacing.md,
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
  },
  previewMeta: {
    flex: 1,
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  previewCount: {
    color: '#1DB954',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  previewSample: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  modalActionRow: {
    marginTop: 4,
  },
  modalPrimaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: '800',
  },
  modalSaveSpotifyBtn: {
    backgroundColor: '#1DB954',
    borderRadius: borderRadius.sm,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveSpotifyBtnText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: '800',
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
  // Drill-in Playlist Detail Styles
  backNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  backNavText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  playlistHeroCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  playlistHeroCover: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  playlistHeroMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  spotifyTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(29, 185, 84, 0.25)',
  },
  spotifyTagText: {
    color: '#1DB954',
    fontSize: 9,
    fontWeight: '800',
  },
  localTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  localTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  playlistHeroCount: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  playlistHeroTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  playlistHeroDesc: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 3,
    lineHeight: 16,
  },
  playlistTracksSection: {
    marginTop: spacing.xs,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  deletePlaylistNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  deletePlaylistNavText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  playlistHeroCoverWrapper: {
    position: 'relative',
  },
  changeCoverBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  changeCoverText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  coverPickerCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  coverPickerSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  curatedCoversGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  curatedCoverItem: {
    width: '31%',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  curatedCoverItemActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  curatedCoverImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  curatedCoverName: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  coverDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.md,
  },
  pickDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  pickDeviceBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  coverUrlInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  coverUrlInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
  },
  applyUrlBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyUrlBtnDisabled: {
    opacity: 0.4,
  },
  applyUrlBtnText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  playlistCardDeleteBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
