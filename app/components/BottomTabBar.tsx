import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { useBottomTabPadding } from '../hooks/useBottomTabPadding';
import { getTabBarFadeHeight } from '../lib/tabBarMetrics';
import theme, { scale } from '../theme';
import TabBarFade from './TabBarFade';

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Calendar: 'calendar-outline',
  Progress: 'stats-chart',
  Profile: 'person-outline',
};

function TabButton({
  isFocused,
  iconName,
  onPress,
}: {
  isFocused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const iconScale = useRef(new Animated.Value(1)).current;
  const indicatorScale = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const indicatorOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: isFocused ? 1.05 : 1,
        friction: 7,
        tension: 140,
        useNativeDriver: true,
      }),
      Animated.timing(indicatorOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(indicatorScale, {
        toValue: isFocused ? 1 : 0,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused, indicatorOpacity, indicatorScale, iconScale]);

  const handlePressIn = () => {
    Animated.spring(iconScale, {
      toValue: 0.9,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(iconScale, {
      toValue: isFocused ? 1.05 : 1,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View
        style={[styles.iconCircle, { transform: [{ scale: iconScale }] }]}
      >
        <Ionicons name={iconName} size={22} color={theme.colors.white} />
      </Animated.View>
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            opacity: indicatorOpacity,
            transform: [{ scaleX: indicatorScale }],
          },
        ]}
      />
    </Pressable>
  );
}

export default function BottomTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const bottomPadding = useBottomTabPadding();
  const fadeHeight = getTabBarFadeHeight(bottomPadding);

  return (
    <View
      style={[styles.container, { paddingBottom: bottomPadding }]}
      pointerEvents="box-none"
    >
      <TabBarFade height={fadeHeight} />
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = TAB_ICONS[route.name] ?? 'ellipse';

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              iconName={iconName}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(20),
    paddingHorizontal: scale(24),
    paddingTop: scale(8),
    zIndex: 1,
  },
  tab: {
    alignItems: 'center',
  },
  iconCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: theme.colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicator: {
    width: scale(24),
    height: scale(3),
    borderRadius: scale(2),
    backgroundColor: theme.colors.red,
    marginTop: scale(8),
  },
});
