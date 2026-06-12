import { useSafeAreaInsets } from 'react-native-safe-area-context';

import theme from '../theme';

export function useTabScreenTopPadding() {
  const insets = useSafeAreaInsets();
  const { minTop, extraTop } = theme.layout.tabScreen;
  return Math.max(insets.top, minTop) + extraTop;
}
