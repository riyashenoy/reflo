import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

import { isMobileWebViewport } from '../lib/layout';

export function useIsMobileWeb(): boolean {
  const [isMobileWeb, setIsMobileWeb] = useState(() => isMobileWebViewport());

  useEffect(() => {
    const update = ({ window }: { window: { width: number } }) => {
      setIsMobileWeb(isMobileWebViewport(window.width));
    };

    update({ window: Dimensions.get('window') });
    const subscription = Dimensions.addEventListener('change', update);
    return () => subscription.remove();
  }, []);

  return isMobileWeb;
}
