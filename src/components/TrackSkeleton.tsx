// Bespoke Shimmer Loading Skeleton for Track Rows
// Follows Emil Kowalski design polish & Anti-AI-Slop guidelines (No generic spinners)
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '../theme/theme';

export const TrackSkeleton: React.FC = () => {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.7,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [shimmerAnim]);

  return (
    <View style={styles.container}>
      {/* Artwork Box Skeleton */}
      <View style={styles.artworkOuter}>
        <Animated.View style={[styles.artworkInner, { opacity: shimmerAnim }]} />
      </View>

      {/* Info Stack Skeleton */}
      <View style={styles.infoContainer}>
        <Animated.View style={[styles.titleBar, { opacity: shimmerAnim }]} />
        <View style={styles.metaRow}>
          <Animated.View style={[styles.artistBar, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.durationBar, { opacity: shimmerAnim }]} />
        </View>
      </View>

      {/* Action Button Skeleton */}
      <Animated.View style={[styles.actionCircle, { opacity: shimmerAnim }]} />
    </View>
  );
};

export const TrackSkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <TrackSkeleton key={`skeleton-${index}`} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    marginVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
  artworkOuter: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  artworkInner: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
    gap: 8,
  },
  titleBar: {
    width: '65%',
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  artistBar: {
    width: '35%',
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  durationBar: {
    width: '15%',
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
