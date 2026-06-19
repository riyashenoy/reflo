import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';

/** Configure iOS/Android so workout + correction clips play through the speaker. */
export async function configureWorkoutAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

export async function preloadClipSounds(
  clipMap: Record<string, number>
): Promise<Record<string, Audio.Sound>> {
  const loaded: Record<string, Audio.Sound> = {};

  await Promise.all(
    Object.entries(clipMap).map(async ([id, source]) => {
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: false,
        volume: 1.0,
      });
      loaded[id] = sound;
    })
  );

  return loaded;
}

export async function unloadClipSounds(
  clips: Record<string, Audio.Sound>
): Promise<void> {
  await Promise.all(
    Object.values(clips).map(async (sound) => {
      try {
        await sound.unloadAsync();
      } catch {
        // Ignore unload errors during cleanup.
      }
    })
  );
}
