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
    header: { fontFamily: 'SHAdGrotesk-Regular', fontSize: 32 },
    mediumHeader: { fontFamily: 'SHAdGrotesk-Regular', fontSize: 24 },
    subheading: {
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      letterSpacing: -0.3,
      color: '#989797',
    },
    body: { fontFamily: 'Inter_400Regular', fontSize: 14 },
    label: {
      fontFamily: 'LouisGeorgeCafe-Bold',
      fontSize: 11,
      letterSpacing: 0.88,
      textTransform: 'uppercase' as const,
    },
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  layout: {
    tabScreen: {
      minTop: 20,
      extraTop: 28,
    },
  },
};

export default theme;
