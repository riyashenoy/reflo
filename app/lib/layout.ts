import { Dimensions, Platform } from 'react-native';

export const MOBILE_WEB_BREAKPOINT = 768;
export const DESIGN_WIDTH = 390;

export function isMobileWebViewport(width = Dimensions.get('window').width): boolean {
  return Platform.OS === 'web' && width < MOBILE_WEB_BREAKPOINT;
}

export function getLayoutWidth(width = Dimensions.get('window').width): number {
  if (Platform.OS === 'web') {
    return isMobileWebViewport(width) ? width : Math.min(width, DESIGN_WIDTH);
  }
  return width;
}

export function getLayoutScale(width = Dimensions.get('window').width): number {
  if (Platform.OS !== 'web') {
    return 1;
  }
  return getLayoutWidth(width) / DESIGN_WIDTH;
}
