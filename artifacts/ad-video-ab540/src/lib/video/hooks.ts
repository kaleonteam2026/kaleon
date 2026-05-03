import { useEffect, useState } from "react";

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);
  const keys = Object.keys(durations);

  useEffect(() => {
    let currentTimeout: number;
    
    // Attempt to start recording. It will only start once.
    if (typeof (window as any).startRecording === 'function') {
      (window as any).startRecording();
    }

    const sceneDuration = durations[keys[currentScene]];
    
    currentTimeout = window.setTimeout(() => {
      setCurrentScene((prev) => {
        const nextScene = prev + 1;
        if (nextScene >= keys.length) {
          if (typeof (window as any).stopRecording === 'function') {
            (window as any).stopRecording();
          }
          return 0; // Loop back
        }
        return nextScene;
      });
    }, sceneDuration);

    return () => clearTimeout(currentTimeout);
  }, [currentScene, durations, keys]);

  return { currentScene };
}