import React from 'react';
import VideoTemplate from './components/video/VideoTemplate';

export default function App() {
  return (
    <div className="w-full h-screen bg-brand-slate flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full aspect-video max-h-screen">
        <VideoTemplate />
      </div>
    </div>
  );
}
