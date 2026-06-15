import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getAuthErrorMessage } from '../lib/authErrors';
import { pickProfileImageUri, updateUserProfilePhoto } from '../lib/profilePhoto';
import { getProfileInitial } from '../lib/userProfile';
import theme, { scale } from '../theme';

type Variant = 'profile' | 'setup';

type ProfilePhotoPickerProps = {
  photoURL?: string | null;
  localUri?: string | null;
  name?: string;
  email?: string | null;
  variant?: Variant;
  /** When true, only updates localUri — upload happens later (onboarding). */
  deferUpload?: boolean;
  onPhotoUpdated?: (photoURL: string) => void;
  onLocalUriChange?: (uri: string) => void;
};

export function ProfilePhotoPicker({
  photoURL,
  localUri,
  name,
  email,
  variant = 'setup',
  deferUpload = false,
  onPhotoUpdated,
  onLocalUriChange,
}: ProfilePhotoPickerProps) {
  const [uploading, setUploading] = useState(false);
  const isProfile = variant === 'profile';
  const displayUri = deferUpload ? localUri : photoURL;
  const initial = getProfileInitial(name, email);

  const handlePress = async () => {
    if (uploading) {
      return;
    }

    const uri = await pickProfileImageUri();
    if (!uri) {
      return;
    }

    if (deferUpload) {
      onLocalUriChange?.(uri);
      return;
    }

    setUploading(true);
    try {
      const uploadedUrl = await updateUserProfilePhoto(uri);
      onPhotoUpdated?.(uploadedUrl);
    } catch (err) {
      Alert.alert('Upload failed', getAuthErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  if (isProfile) {
    return (
      <Pressable
        style={styles.profileWrapper}
        onPress={handlePress}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
      >
        <View style={styles.profileAvatar}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={styles.profileImage} />
          ) : (
            <Text style={styles.profileInitial}>{initial}</Text>
          )}
          {uploading ? (
            <View style={styles.profileUploadOverlay}>
              <ActivityIndicator color={theme.colors.white} />
            </View>
          ) : null}
        </View>
        <View style={styles.profileEditBadge}>
          <Text style={styles.profileEditIcon}>✎</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.setupRow}
      onPress={handlePress}
      disabled={uploading}
      accessibilityRole="button"
      accessibilityLabel="Add profile photo"
    >
      <View style={styles.setupCircle}>
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={styles.setupImage} />
        ) : (
          <Text style={styles.setupIcon}>👤</Text>
        )}
        <View style={styles.setupAddBadge}>
          {uploading ? (
            <ActivityIndicator color={theme.colors.white} size="small" />
          ) : (
            <Text style={styles.setupAddText}>+</Text>
          )}
        </View>
      </View>
      <View>
        <Text style={styles.setupTitle}>
          {displayUri ? 'Change photo' : 'Add a photo'}
        </Text>
        <Text style={styles.setupSubtitle}>Optional, shows on your profile.</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileWrapper: {
    position: 'relative',
    marginRight: scale(14),
  },
  profileAvatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: theme.colors.white,
    borderWidth: scale(2),
    borderColor: theme.colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInitial: {
    fontFamily: theme.fonts.headerMedium,
    fontSize: scale(36),
    color: theme.colors.red,
  },
  profileUploadOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEditBadge: {
    position: 'absolute',
    right: scale(-2),
    bottom: scale(-2),
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: theme.colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scale(2),
    borderColor: theme.colors.background,
  },
  profileEditIcon: {
    color: theme.colors.white,
    fontSize: scale(12),
  },
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  setupCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    borderWidth: scale(2),
    borderStyle: 'dashed',
    borderColor: theme.colors.grey400,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
  },
  setupImage: {
    width: '100%',
    height: '100%',
  },
  setupIcon: {
    fontSize: scale(28),
  },
  setupAddBadge: {
    position: 'absolute',
    right: scale(-2),
    bottom: scale(-2),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: theme.colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupAddText: {
    color: theme.colors.white,
    fontSize: scale(16),
    fontWeight: '700',
  },
  setupTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: scale(2),
  },
  setupSubtitle: {
    fontSize: scale(12),
    color: theme.colors.textSecondary,
  },
});
