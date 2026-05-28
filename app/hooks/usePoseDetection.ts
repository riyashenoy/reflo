import { useState } from 'react';

export function usePoseDetection() {
  const [isDetecting, setIsDetecting] = useState(false);

  return {
    isDetecting,
    startDetection: () => setIsDetecting(true),
    stopDetection: () => setIsDetecting(false),
  };
}
