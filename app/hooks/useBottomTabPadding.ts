import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { scale } from '../theme';

function getVisualViewportBottomInset(): number {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return 0;
  }

  const viewport = window.visualViewport;
  if (!viewport) {
    return 0;
  }

  const obscuredBottom =
    window.innerHeight - viewport.height - viewport.offsetTop;

  return Math.max(obscuredBottom, 0);
}

export function useBottomTabPadding(): number {
  const insets = useSafeAreaInsets();
  const [viewportInset, setViewportInset] = useState(getVisualViewportBottomInset);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const update = () => {
      setViewportInset(getVisualViewportBottomInset());
    };

    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return Math.max(insets.bottom, viewportInset, scale(12));
}
