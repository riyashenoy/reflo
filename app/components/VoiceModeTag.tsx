import { StyleSheet, Text, View } from 'react-native';

import type { VoiceMode } from '../data/workouts';
import theme, { scale } from '../theme';

type Props = {
  voiceMode: VoiceMode;
};

/**
 * Honest quality label for coach audio source.
 * Recorded flagship: subtle teal “STUDIO AUDIO”.
 * Generated AI classes: amber “AI VOICE” with square motif.
 */
export default function VoiceModeTag({ voiceMode }: Props) {
  if (voiceMode === 'recorded') {
    return (
      <View style={styles.row}>
        <Text style={styles.studioLabel}>STUDIO AUDIO</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.aiSquare} />
      <Text style={styles.aiLabel}>AI VOICE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  studioLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.2),
    textTransform: 'uppercase',
    color: '#79CBD0',
  },
  aiSquare: {
    width: scale(4),
    height: scale(4),
    backgroundColor: '#E69639',
  },
  aiLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.2),
    textTransform: 'uppercase',
    color: '#E69639',
  },
});
