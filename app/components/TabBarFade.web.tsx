import { StyleSheet, View } from 'react-native';

type TabBarFadeProps = {
  height: number;
};

export default function TabBarFade({ height }: TabBarFadeProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.fade,
        {
          height,
          backgroundImage:
            'linear-gradient(to bottom, transparent, rgba(243,243,243,0.7), rgba(243,243,243,0.95))',
        } as object,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});
