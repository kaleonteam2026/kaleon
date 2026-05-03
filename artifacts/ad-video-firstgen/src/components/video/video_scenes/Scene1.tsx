import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const text = "FIRST IN YOUR FAMILY?";
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setPhase(1), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-brand-amber"
      initial={{ y: '100%' }}
      animate={{ y: '0%' }}
      exit={{ y: '-100%' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div className="absolute inset-0 bg-brand-slate opacity-5" animate={{ scale: [1, 1.05] }} transition={{ duration: 2.5 }} />
      <h1 className="font-mono text-[7vw] font-black text-brand-amberText tracking-tighter text-center leading-none relative z-10 uppercase w-[80%] mx-auto">
        {text.split('').map((char, i) => (
          <motion.span 
            key={i} 
            className="inline-block"
            initial={{ opacity: 0, y: 50, rotateZ: -10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0, rotateZ: 0 } : { opacity: 0, y: 50, rotateZ: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </h1>
    </motion.div>
  );
}
