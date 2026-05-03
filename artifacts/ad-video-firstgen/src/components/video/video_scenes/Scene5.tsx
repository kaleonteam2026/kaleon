import React from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-brand-slate text-brand-white"
      initial={{ y: '-100%' }}
      animate={{ y: '0%' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div 
        className="flex flex-col items-center gap-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4, type: 'spring' }}
      >
        {/* Logo Lockup */}
        <div className="flex flex-col items-center border-[4px] border-brand-white p-6 bg-[#000]">
          <div className="w-[7vh] h-[7vh] bg-brand-slate border-2 border-brand-white flex items-center justify-center font-mono font-black text-[4vh] text-brand-white mb-4">
            D
          </div>
          <h2 className="font-mono text-[3vw] font-black tracking-tight leading-none uppercase">DYP</h2>
          <p className="font-mono text-[0.8vw] mt-2 opacity-80 uppercase tracking-widest">// DO YOUR PATH</p>
        </div>

        {/* Tagline */}
        <h1 className="font-mono text-[5vw] font-black text-brand-amber mt-4 uppercase">
          DO YOUR PATH.
        </h1>

        {/* CTA */}
        <div className="mt-8 bg-brand-amber text-brand-slate px-8 py-4 font-mono font-bold text-[1.2vw] tracking-wider border-[3px] border-brand-slate shadow-[6px_6px_0_0_#FEF3C7] uppercase">
          DOYOURPATH.APP // FREE · NO CREDIT CARD
        </div>
      </motion.div>
    </motion.div>
  );
}
