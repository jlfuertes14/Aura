// AURA Brand Logo & Geometric Identity Mark
// Features double-bezel titanium rim, acoustic soundwave grooves, and glowing neon emerald monogram
import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius } from '../theme/theme';

export interface AuraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  withGlow?: boolean;
  interactive?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const SIZE_CONFIG = {
  sm: {
    dimension: 32,
    borderWidth: 1.5,
    fontSize: 14,
    subtitleSize: 8,
    spacing: 8,
  },
  md: {
    dimension: 44,
    borderWidth: 2,
    fontSize: 18,
    subtitleSize: 9,
    spacing: 10,
  },
  lg: {
    dimension: 72,
    borderWidth: 2.5,
    fontSize: 26,
    subtitleSize: 11,
    spacing: 14,
  },
  xl: {
    dimension: 116,
    borderWidth: 3.5,
    fontSize: 34,
    subtitleSize: 12,
    spacing: 18,
  },
};

export const AuraLogo: React.FC<AuraLogoProps> = ({
  size = 'md',
  showText = false,
  withGlow = true,
  interactive = true,
  onPress,
  style,
}) => {
  const config = SIZE_CONFIG[size];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!interactive) return;
    Animated.timing(scaleAnim, {
      toValue: 0.94,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (!interactive) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onPress) onPress();
  };

  const content = (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {/* Outer Titanium Bezel Frame */}
      <View
        style={[
          styles.outerBezel,
          {
            width: config.dimension,
            height: config.dimension,
            borderRadius: config.dimension / 2,
            borderWidth: config.borderWidth,
          },
          withGlow && styles.glowActive,
        ]}
      >
        <Image
          source={require('../../assets/images/aura_logo.jpg')}
          style={[
            styles.logoImage,
            {
              width: config.dimension - config.borderWidth * 2,
              height: config.dimension - config.borderWidth * 2,
              borderRadius: (config.dimension - config.borderWidth * 2) / 2,
            },
          ]}
          resizeMode="cover"
        />
      </View>

      {/* Optional Brand Typography */}
      {showText && (
        <View style={[styles.textWrapper, { marginLeft: config.spacing }]}>
          <Text style={[styles.brandTitle, { fontSize: config.fontSize }]}>
            AURA
          </Text>
          <Text style={[styles.brandSubtitle, { fontSize: config.subtitleSize }]}>
            LOSSLESS AUDIO
          </Text>
        </View>
      )}
    </Animated.View>
  );

  if (!interactive) {
    return content;
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={8}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outerBezel: {
    backgroundColor: '#0A0B0E',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  glowActive: {
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  logoImage: {
    backgroundColor: '#08080A',
  },
  textWrapper: {
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 3,
  },
  brandSubtitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: -1,
  },
});
