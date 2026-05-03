import React from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-brand-slate"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.1, opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div 
        className="bg-brand-offwhite border-[4px] border-brand-slate px-12 py-6 text-brand-slate"
        style={{ boxShadow: '12px 12px 0 0 #FEF3C7' }}
        initial={{ scale: 4, rotate: -15, opacity: 0 }}
        animate={{ scale: 1, rotate: -5, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <h1 className="font-mono text-[12vw] font-black tracking-tight leading-none">
          SAME.
        </h1>
      </motion.div>
    </motion.div>
  );
}
