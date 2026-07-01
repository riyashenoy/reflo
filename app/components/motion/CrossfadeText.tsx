import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motion } from '../../lib/motion';

type CrossfadeTextProps = {
  text: string;
  style?: StyleProp<TextStyle>;
};

export function CrossfadeText({ text, style }: CrossfadeTextProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [displayText, setDisplayText] = useState(text);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayText(text);
      return;
    }

    if (text === displayText) {
      return;
    }

    if (reduceMotion) {
      setDisplayText(text);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.duration.fast,
        easing: motion.easing.out,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -6,
        duration: motion.duration.fast,
        easing: motion.easing.out,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDisplayText(text);
      translateY.setValue(8);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.duration.normal,
          easing: motion.easing.out,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: motion.duration.normal,
          easing: motion.easing.out,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [displayText, opacity, reduceMotion, text, translateY]);

  return (
    <Animated.Text
      style={[style, { opacity, transform: [{ translateY }] }]}
    >
      {displayText}
    </Animated.Text>
  );
}
