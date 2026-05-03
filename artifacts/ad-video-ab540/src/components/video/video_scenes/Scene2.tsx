import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-white gap-8"
      initial={{ opacity: 1, x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {['AB540', 'DREAM ACT', 'CAL GRANT'].map((text, i) => (
        <motion.div 
          key={text}
          className="bg-offwhite border-[4px] border-ink p-4 shadow-brutalist flex flex-col w-[40vw]"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 + i * 0.2, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="text-ink text-[4vw] font-mono leading-none">{text}</div>
          <div className="text-ink/60 text-[1.5vw] font-mono mt-2">// ELIGIBLE</div>
        </motion.div>
      ))}
    </motion.div>
  );
}