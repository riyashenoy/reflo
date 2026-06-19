import { StyleSheet, Text, View } from 'react-native';

import { getProfileInitial } from '../lib/userProfile';
import theme, { scale } from '../theme';

type ProfileAvatarProps = {
  name?: string;
  email?: string | null;
};

export function ProfileAvatar({ name, email }: ProfileAvatarProps) {
  const initial = getProfileInitial(name, email);

  return (
    <View style={styles.avatar}>
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: theme.colors.white,
    borderWidth: scale(2),
    borderColor: theme.colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  initial: {
    fontFamily: theme.fonts.headerMedium,
    fontSize: scale(36),
    color: theme.colors.red,
  },
});
