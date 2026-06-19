import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'reflo.savedWorkouts';

export async function readSavedWorkoutIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((id): id is string => typeof id === 'string');
  } catch (error) {
    console.warn('[savedWorkoutsStorage] read failed:', error);
    return [];
  }
}

export async function writeSavedWorkoutIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
