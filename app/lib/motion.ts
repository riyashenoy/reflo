import { Easing } from 'react-native';

export const motion = {
  duration: {
    fast: 160,
    normal: 240,
    slow: 360,
    screen: 300,
  },
  easing: {
    out: Easing.out(Easing.cubic),
    inOut: Easing.inOut(Easing.cubic),
  },
  spring: {
    press: { friction: 7, tension: 200, useNativeDriver: true as const },
    release: { friction: 7, tension: 160, useNativeDriver: true as const },
    gentle: { friction: 8, tension: 120, useNativeDriver: true as const },
  },
  distance: {
    entrance: 12,
    modal: 20,
  },
  pressScale: 0.97,
} as const;
