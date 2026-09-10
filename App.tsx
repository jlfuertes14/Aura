// Main Application Entry Point
// Connects SafeAreaProvider, PlayerProvider, Screens, Sticky Playing Banner, and Full-Screen Player
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { PlayerProvider, usePlayer } from './src/context/PlayerContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { MiniPlayerBanner } from './src/components/MiniPlayerBanner';
import { FullScreenPlayer } from './src/components/FullScreenPlayer';
import { BottomNav, TabScreen } from './src/components/BottomNav';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { colors } from './src/theme/theme';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabScreen>('home');
  const [isSplashVisible, setIsSplashVisible] = useState<boolean>(true);
  const { downloadedTracks } = usePlayer();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Screen Views - Extended beneath the floating glass menu bar */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && <HomeScreen onLogoPress={() => setIsSplashVisible(true)} />}
        {activeTab === 'search' && <SearchScreen />}
        {activeTab === 'library' && <LibraryScreen />}
      </View>

      {/* Floating Glassmorphic Bottom Navigation Cluster */}
      <View style={styles.floatingBottomCluster} pointerEvents="box-none">
        <MiniPlayerBanner />
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          downloadCount={downloadedTracks.length}
        />
      </View>

      {/* Full-Screen Immersive Player Modal */}
      <FullScreenPlayer />

      {/* Initial App Loading / Logo Launch Animation */}
      {isSplashVisible && (
        <AnimatedSplashScreen onAnimationComplete={() => setIsSplashVisible(false)} />
      )}
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayerProvider>
        <MainAppContent />
      </PlayerProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingBottomCluster: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
