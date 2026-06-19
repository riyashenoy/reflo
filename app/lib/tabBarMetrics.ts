import { scale } from '../theme';

/** Icon row + indicator + top padding inside the tab bar. */
export const TAB_BAR_CONTENT_HEIGHT = scale(8) + scale(56) + scale(8) + scale(3);

/** Fade zone above the tab icons where scroll content softens out. */
export const TAB_BAR_FADE_HEIGHT = scale(60);

export function getTabBarFadeHeight(bottomPadding: number): number {
  return TAB_BAR_FADE_HEIGHT + TAB_BAR_CONTENT_HEIGHT + bottomPadding;
}
