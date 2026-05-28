import { useState } from 'react';

export function useAudioCues() {
  const [isPlaying, setIsPlaying] = useState(false);

  return {
    isPlaying,
    playCue: () => setIsPlaying(true),
    stopCue: () => setIsPlaying(false),
  };
}
