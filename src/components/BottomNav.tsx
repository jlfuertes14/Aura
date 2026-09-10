// Edge-to-Edge Pure Glassmorphism Bottom Navigation Bar
// True glassmorphism with BlurView, specular top edge reflection, and clean white active states (no rounded menu, no green borders, no green underlines)
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Library } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { spacing, layout } from '../theme/theme';

export type TabScreen = 'home' | 'search' | 'library';

interface Props {
  activeTab: TabScreen;
  onTabChange: (tab: TabScreen) => void;
  downloadCount: number;
}

export const BottomNav: React.FC<Props> = ({ activeTab, onTabChange, downloadCount }) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  const handlePress = (tab: TabScreen) => {
    if (tab !== activeTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onTabChange(tab);
    }
  };

  return (
    <View style={[styles.navBarContainer, { paddingBottom: bottomPadding }]}>
      {/* Layer 1: Hardware-accelerated frosted glass blur */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 85 : 95}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 2: Translucent dark tone gradient overlay with web backdrop blur */}
      <LinearGradient
        colors={['rgba(16, 22, 34, 0.65)', 'rgba(8, 12, 20, 0.82)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(30px) saturate(190%)',
                WebkitBackdropFilter: 'blur(30px) saturate(190%)',
              } as any)
            : null,
        ]}
      />

      {/* Layer 3: Specular glass top lip reflection */}
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.40)',
          'rgba(255, 255, 255, 0.15)',
          'rgba(255, 255, 255, 0.03)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.specularTopEdge}
      />

      {/* Layer 4: Ambient diagonal light sheen */}
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.06)',
          'rgba(255, 255, 255, 0.01)',
          'rgba(255, 255, 255, 0.00)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Navigation Tabs Content */}
      <View style={styles.navBarContent}>
        {/* Home Tab */}
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
          onPress={() => handlePress('home')}
        >
          <Home
            size={22}
            color={activeTab === 'home' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)'}
            strokeWidth={activeTab === 'home' ? 2.4 : 1.8}
          />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeTabLabel]}>
            Home
          </Text>
        </Pressable>

        {/* Search & Downloader Tab */}
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
          onPress={() => handlePress('search')}
        >
          <Search
            size={22}
            color={activeTab === 'search' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)'}
            strokeWidth={activeTab === 'search' ? 2.4 : 1.8}
          />
          <Text style={[styles.tabLabel, activeTab === 'search' && styles.activeTabLabel]}>
            Downloader
          </Text>
        </Pressable>

        {/* Library Tab with Offline badge */}
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
          onPress={() => handlePress('library')}
        >
          <View style={styles.iconBadgeWrapper}>
            <Library
              size={22}
              color={activeTab === 'library' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)'}
              strokeWidth={activeTab === 'library' ? 2.4 : 1.8}
            />
            {downloadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{downloadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'library' && styles.activeTabLabel]}>
            Your Library
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navBarContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 16,
    backgroundColor: Platform.OS === 'android' ? 'rgba(12, 16, 26, 0.80)' : 'transparent',
  },
  specularTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
  },
  navBarContent: {
    height: layout.bottomBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    zIndex: 3,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabItemPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.80,
  },
  tabLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(255, 255, 255, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  iconBadgeWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
  },
});
