import { useState, useEffect } from 'react';

declare global {
  interface Window {
    startRecording?: () => void;
    stopRecording?: () => void;
  }
}

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);
  const sceneKeys = Object.keys(durations);

  useEffect(() => {
    window.startRecording?.();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentScene === sceneKeys.length - 1) {
        window.stopRecording?.();
      }
      setCurrentScene((prev) => (prev + 1) % sceneKeys.length);
    }, durations[sceneKeys[currentScene]]);

    return () => clearTimeout(timer);
  }, [currentScene, durations, sceneKeys]);

  return { currentScene, sceneKeys };
}
