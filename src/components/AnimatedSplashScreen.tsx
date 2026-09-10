// Initial App Launch Splash Screen with Acoustic Ripple & Logo Motion
// Implements Emil Kowalski animation principles: ease-out bezier, non-zero initial scale, and staggered soundwaves
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AuraLogo } from './AuraLogo';
import { colors } from '../theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  onAnimationComplete: () => void;
}

// Strong custom ease-out curve (cubic-bezier(0.23, 1, 0.32, 1))
const customEaseOut = Easing.bezier(0.23, 1, 0.32, 1);

export const AnimatedSplashScreen: React.FC<Props> = ({ onAnimationComplete }) => {
  // Container & Logo animations
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Staggered acoustic wave ripple rings
  const ring1Scale = useRef(new Animated.Value(0.95)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.95)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0.95)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  // 5-bar live equalizer frequencies
  const eq1 = useRef(new Animated.Value(4)).current;
  const eq2 = useRef(new Animated.Value(10)).current;
  const eq3 = useRef(new Animated.Value(16)).current;
  const eq4 = useRef(new Animated.Value(8)).current;
  const eq5 = useRef(new Animated.Value(5)).current;

  // Typography animations
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  const isExiting = useRef(false);

  const exitAnimation = () => {
    if (isExiting.current) return;
    isExiting.current = true;

    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1.05,
        duration: 280,
        easing: customEaseOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete();
    });
  };

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // 1. Sonic Ignition: Logo Materialization (0 - 450ms)
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        easing: customEaseOut,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 480,
        easing: customEaseOut,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Acoustic Ripple Wave Expansion (staggered 60ms)
    const createRipple = (scaleVal: Animated.Value, opacVal: Animated.Value, delay: number, targetScale: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacVal, {
            toValue: 0.7,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleVal, {
            toValue: targetScale,
            duration: 800,
            easing: customEaseOut,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacVal, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]);
    };

    Animated.parallel([
      createRipple(ring1Scale, ring1Opacity, 180, 1.6),
      createRipple(ring2Scale, ring2Opacity, 260, 2.1),
      createRipple(ring3Scale, ring3Opacity, 340, 2.6),
    ]).start();

    // 3. Dynamic Equalizer Looping
    const loopBar = (barVal: Animated.Value, minH: number, maxH: number, dur: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(barVal, { toValue: maxH, duration: dur, useNativeDriver: false }),
          Animated.timing(barVal, { toValue: minH, duration: dur * 0.9, useNativeDriver: false }),
        ])
      );
    };

    const animEq1 = loopBar(eq1, 4, 18, 280);
    const animEq2 = loopBar(eq2, 6, 24, 340);
    const animEq3 = loopBar(eq3, 8, 28, 260);
    const animEq4 = loopBar(eq4, 5, 20, 310);
    const animEq5 = loopBar(eq5, 3, 16, 290);

    animEq1.start();
    animEq2.start();
    animEq3.start();
    animEq4.start();
    animEq5.start();

    // 4. Staggered Typography Reveal (350ms - 800ms)
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 350,
          easing: customEaseOut,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 350,
          easing: customEaseOut,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 300,
        easing: customEaseOut,
        useNativeDriver: true,
      }),
    ]).start();

    // 5. Automatic Smooth Exit Handoff to App (1500ms total duration)
    const exitTimer = setTimeout(() => {
      exitAnimation();
    }, 1600);

    return () => {
      clearTimeout(exitTimer);
      animEq1.stop();
      animEq2.stop();
      animEq3.stop();
      animEq4.stop();
      animEq5.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <Pressable style={styles.pressableContainer} onPress={exitAnimation}>
        {/* Background Ambient Radial Glow */}
        <View style={styles.ambientGlow} />

        {/* Centerpiece Arena */}
        <View style={styles.centerArena}>
          {/* Concentric Sonic Ripple Rings */}
          <Animated.View
            style={[
              styles.rippleRing,
              {
                opacity: ring1Opacity,
                transform: [{ scale: ring1Scale }],
                borderColor: 'rgba(255, 255, 255, 0.35)',
              },
            ]}
          />
          <Animated.View
            style={[
              styles.rippleRing,
              {
                opacity: ring2Opacity,
                transform: [{ scale: ring2Scale }],
                borderColor: 'rgba(255, 255, 255, 0.22)',
              },
            ]}
          />
          <Animated.View
            style={[
              styles.rippleRing,
              {
                opacity: ring3Opacity,
                transform: [{ scale: ring3Scale }],
                borderColor: 'rgba(255, 255, 255, 0.12)',
              },
            ]}
          />

          {/* Central AURA Logo Emblem */}
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          >
            <AuraLogo size="xl" withGlow interactive={false} />
          </Animated.View>
        </View>

        {/* 5-Bar Tactile Equalizer */}
        <View style={styles.equalizerRow}>
          <Animated.View style={[styles.eqBar, { height: eq1 }]} />
          <Animated.View style={[styles.eqBar, { height: eq2 }]} />
          <Animated.View style={[styles.eqBar, { height: eq3, backgroundColor: '#00E5FF' }]} />
          <Animated.View style={[styles.eqBar, { height: eq4 }]} />
          <Animated.View style={[styles.eqBar, { height: eq5 }]} />
        </View>

        {/* Brand Typography Reveal */}
        <Animated.View
          style={[
            styles.brandTextContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>A U R A</Text>
          <Animated.Text style={[styles.brandSubtitle, { opacity: subtitleOpacity }]}>
            AUDIOPHILE SOUND & OFFLINE VAULT
          </Animated.Text>
        </Animated.View>

        {/* Skip micro-hint */}
        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>TAP ANYWHERE TO SKIP</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#07080A',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressableContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: (SCREEN_WIDTH * 0.85) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  centerArena: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 32,
    marginTop: 28,
  },
  eqBar: {
    width: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 2,
  },
  brandTextContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 10,
  },
  brandSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
  },
  bottomHint: {
    position: 'absolute',
    bottom: 40,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.22)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
