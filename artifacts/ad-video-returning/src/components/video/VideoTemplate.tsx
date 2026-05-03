import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useVideoPlayer } from '@/lib/video';

// Mock hook since we don't have the actual implementation
// In a real environment, this would be imported from @/lib/video
const useVideoPlayerMock = ({ durations }: { durations: Record<string, number> }) => {
  const [currentScene, setCurrentScene] = useState(0);
  useEffect(() => {
    // mock behavior
  }, []);
  return { currentScene };
};

const SCENE_DURATIONS = {
  scene1: 3000,
  scene2: 3000,
  scene3: 3000,
  scene4: 3000,
  scene5: 3000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayerMock({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F4F4F5]">
      <AnimatePresence initial={false} mode="wait">
        {currentScene === 0 && <div key="scene1" className="w-full h-full flex items-center justify-center text-[#0F172A] font-mono text-8xl font-black">AT 32?</div>}
        {currentScene === 1 && <div key="scene2" className="w-full h-full flex items-center justify-center bg-[#FEF3C7] text-[#0F172A] font-mono text-8xl font-black">GO BACK SMART.</div>}
        {currentScene === 2 && <div key="scene3" className="w-full h-full flex flex-col items-center justify-center space-y-8 bg-[#F4F4F5] text-[#0F172A] font-sans font-bold text-4xl"><div className="border-4 border-[#0F172A] shadow-[6px_6px_0_0_#0F172A] p-8 bg-white">AROUND YOUR SHIFTS</div></div>}
        {currentScene === 3 && <div key="scene4" className="w-full h-full flex items-center justify-center bg-[#0F172A] text-white font-mono text-6xl font-black text-center px-12">WORKING PARENT. TRANSFER STUDENT. BOTH.</div>}
        {currentScene === 4 && <div key="scene5" className="w-full h-full flex flex-col items-center justify-center bg-[#0F172A] text-white space-y-4"><div className="w-32 h-32 bg-black border-4 border-white flex items-center justify-center text-4xl font-mono">D</div><div className="font-mono text-2xl">// DO YOUR PATH</div><div className="font-sans text-xl text-[#FEF3C7]">DOYOURPATH.APP // FREE · NO CREDIT CARD</div></div>}
      </AnimatePresence>
    </div>
  );
}