import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { getProfileInitial } from '../lib/userProfile';
import theme, { scale } from '../theme';

type ProfileAvatarProps = {
  name?: string;
  email?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function ProfileAvatar({ name, email, style }: ProfileAvatarProps) {
  const initial = getProfileInitial(name, email);

  return (
    <View style={[styles.avatar, style]}>
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    backgroundColor: theme.colors.white,
    borderWidth: scale(1.5),
    borderColor: theme.colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontFamily: theme.fonts.header,
    fontSize: scale(36),
    color: theme.colors.red,
  },
});
