export const colors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  primary: '#2D6A4F',
  primaryLight: '#40916C',
  accent: '#E76F51',
  border: '#E0E0E0',
  success: '#2D6A4F',
  warning: '#F4A261',
  error: '#E63946',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
};

export const theme = {
  colors,
  spacing,
  typography,
};

export default theme;
