import { getLayoutScale, getLayoutWidth } from '../lib/layout';

export const scale = (size: number) => size * getLayoutScale();

export const contentWidth = getLayoutWidth();

export { getLayoutWidth, getLayoutScale };

export const theme = {
  colors: {
    red: '#CC1D1D',
    teal: '#79CBD0',
    dark: '#242121',
    white: '#FFFFFF',
    background: '#F3F3F3',
    grey200: '#D9D9D9',
    grey400: '#BABABA',
    grey600: '#989797',
    amber: '#E69639',
    textPrimary: '#242121',
    textSecondary: '#989797',
    textTertiary: '#D9D9D9',
    border: '#D9D9D9',
    workoutBg: '#0E0E0E',
    surfaceMuted: '#333333',
    mindfulBg: '#FFF8E7',
  },
  fonts: {
    header: 'SHAdGrotesk-Regular',
    headerMedium: 'SHAdGrotesk-Medium',
    headerLight: 'SHAdGrotesk-Light',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    label: 'LouisGeorgeCafe-Bold',
  },
  typography: {
    header: { fontFamily: 'SHAdGrotesk-Regular', fontSize: scale(24) },
    mediumHeader: { fontFamily: 'SHAdGrotesk-Regular', fontSize: scale(18) },
    subheading: {
      fontFamily: 'Inter_400Regular',
      fontSize: scale(16),
      letterSpacing: scale(-0.3),
      color: '#989797',
    },
    body: { fontFamily: 'Inter_400Regular', fontSize: scale(13) },
    label: {
      fontFamily: 'LouisGeorgeCafe-Bold',
      fontSize: scale(10),
      letterSpacing: scale(0.88),
      textTransform: 'uppercase' as const,
    },
  },
  radius: {
    sm: scale(8),
    md: scale(12),
    lg: scale(16),
    xl: scale(20),
    full: 999,
  },
  layout: {
    tabScreen: {
      minTop: scale(20),
      extraTop: scale(28),
    },
  },
};

export default theme;
