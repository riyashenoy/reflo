import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Alert } from 'react-native';

import { auth, storage } from './firebase';
import { saveUserProfile } from './userProfile';

async function requestLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission needed',
      'Allow photo library access to choose a profile picture.'
    );
    return false;
  }
  return true;
}

export async function pickProfileImageUri(): Promise<string | null> {
  const hasPermission = await requestLibraryPermission();
  if (!hasPermission) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}

export async function uploadProfilePhoto(
  uid: string,
  uri: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `users/${uid}/profile.jpg`);

  await uploadBytes(storageRef, blob, {
    contentType: blob.type || 'image/jpeg',
  });

  return getDownloadURL(storageRef);
}

export async function updateUserProfilePhoto(uri: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to update your profile photo.');
  }

  const photoURL = await uploadProfilePhoto(user.uid, uri);
  await saveUserProfile(user.uid, { photoURL });
  await updateProfile(user, { photoURL });

  return photoURL;
}
