// Audio Visualizer Component
// Real-time animated frequency equalizer bars reacting to music playback
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/theme';

interface Props {
  isPlaying: boolean;
  barCount?: number;
  color?: string;
}

export const AudioVisualizer: React.FC<Props> = ({ isPlaying, barCount = 18, color }) => {
  const animatedHeights = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(6))
  ).current;

  useEffect(() => {
    let isMounted = true;

    const animateBars = () => {
      if (!isMounted) return;

      const animations = animatedHeights.map((anim, index) => {
        // Staggered frequency simulation
        const targetHeight = isPlaying ? Math.floor(Math.random() * 26) + 8 : 6;
        const duration = 180 + (index % 5) * 40;

        return Animated.timing(anim, {
          toValue: targetHeight,
          duration,
          useNativeDriver: false,
        });
      });

      Animated.parallel(animations).start(() => {
        if (isPlaying && isMounted) {
          animateBars();
        }
      });
    };

    if (isPlaying) {
      animateBars();
    } else {
      animatedHeights.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 6,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      {animatedHeights.map((anim, index) => {
        const barColor = color || (index % 2 === 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)');
        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: anim,
                backgroundColor: barColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    gap: 4,
    marginVertical: 8,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
    opacity: 0.9,
  },
});
