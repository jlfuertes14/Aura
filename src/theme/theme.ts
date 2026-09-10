// Design Tokens for Mobile Music Player App
// Adheres to: design-taste-frontend, high-end-visual-design, emil-design-eng, ui-ux-pro-max

export const colors = {
  // 60% Base (OLED Deepest blacks & machined graphite)
  background: '#05070B',
  backgroundSecondary: '#0B0F17',
  surface: '#111622',
  surfaceLight: '#182030',
  surfaceElevated: '#1F293D',
  surfaceGlass: 'rgba(17, 22, 34, 0.82)',
  surfaceGlassBorder: 'rgba(255, 255, 255, 0.08)',
  
  // Double-Bezel Hardware Tokens (Doppelrand architecture)
  bezelOuter: 'rgba(255, 255, 255, 0.06)',
  bezelInner: 'rgba(255, 255, 255, 0.03)',
  innerHighlight: 'rgba(255, 255, 255, 0.12)',
  haloGlow: 'rgba(29, 185, 84, 0.22)',
  
  // 30% Structural Elements & Grays
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  divider: 'rgba(255, 255, 255, 0.06)',
  cardBorder: 'rgba(255, 255, 255, 0.07)',
  
  // 10% Accents & Branding (Spotify Emerald & Dynamic Neon Highlights)
  primary: '#1DB954', // Spotify Emerald
  primaryGlow: 'rgba(29, 185, 84, 0.35)',
  primaryLight: '#22D05F',
  accentElectric: '#00E5FF',
  accentCyan: '#00E5FF',
  accentAmber: '#F59E0B',
  accentRose: '#F43F5E',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  
  // Player Controls & Sliders
  scrubberTrack: 'rgba(255, 255, 255, 0.14)',
  scrubberFilled: '#1DB954',
  scrubberThumb: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
    hero: 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
  tabularNumbers: {
    fontVariant: ['tabular-nums' as const],
  },
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24, // Outer bezel card radius
  inner: 18, // Concentric inner radius (R_inner = R_outer - 6px padding)
  round: 9999,
};

export const layout = {
  minTouchTarget: 44,
  miniPlayerHeight: 68,
  bottomBarHeight: 62,
};

export const motion = {
  pressScale: 0.97,
  springDamping: 20,
  springStiffness: 140,
  durationFast: 150,
  durationNormal: 260,
  durationSlow: 400,
};
