import { Pressable, View } from 'react-native';

import theme, { scale } from '../theme';

type ThemeToggleProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function ThemeToggle({
  value,
  onValueChange,
  disabled = false,
}: ThemeToggleProps) {
  const trackWidth = theme.component.toggleTrackWidth;
  const trackHeight = theme.component.toggleTrackHeight;
  const thumbSize = theme.component.toggleThumbSize;
  const thumbInset = scale(3);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={6}
      style={{
        width: trackWidth,
        height: trackHeight,
        borderRadius: trackHeight / 2,
        justifyContent: 'center',
        backgroundColor: value ? theme.colors.teal : theme.colors.grey200,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: theme.colors.white,
          alignSelf: value ? 'flex-end' : 'flex-start',
          marginRight: value ? thumbInset : 0,
          marginLeft: value ? 0 : thumbInset,
        }}
      />
    </Pressable>
  );
}
