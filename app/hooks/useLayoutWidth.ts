import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

import { getLayoutWidth } from '../lib/layout';

export function useLayoutWidth(): number {
  const [width, setWidth] = useState(() => getLayoutWidth());

  useEffect(() => {
    const update = ({ window }: { window: { width: number } }) => {
      setWidth(getLayoutWidth(window.width));
    };

    update({ window: Dimensions.get('window') });
    const subscription = Dimensions.addEventListener('change', update);
    return () => subscription.remove();
  }, []);

  return width;
}
