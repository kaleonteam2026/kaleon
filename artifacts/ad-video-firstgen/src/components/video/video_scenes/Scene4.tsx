import React from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-brand-amber overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div 
        className="w-full px-[10vw] flex flex-col items-center relative z-10"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h1 className="font-mono text-[6vw] font-black text-brand-amberText text-center leading-tight uppercase tracking-tighter">
          FROM CC <br/>
          <motion.span 
            className="inline-block text-brand-slate"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.6 }}
          >→</motion.span> UCLA. <br/>
          IN 24 MONTHS.
        </h1>
      </motion.div>

      {/* Decorative arrow drawing across */}
      <svg className="absolute w-full h-[30vh] top-[35vh] pointer-events-none opacity-20" viewBox="0 0 1000 200" preserveAspectRatio="none">
        <motion.path 
          d="M0 100 Q 250 50 500 100 T 1000 100" 
          fill="none" 
          stroke="#0F172A" 
          strokeWidth="15"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
        />
      </svg>
    </motion.div>
  );
}
