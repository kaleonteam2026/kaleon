import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const cards = [
    { title: "AI TRANSFER PLAN", tag: "// SMART ROUTING", rotate: -4, x: "-15vw", y: "-15vh" },
    { title: "40+ SCHOLARSHIPS", tag: "// GET PAID TO LEARN", rotate: 6, x: "15vw", y: "0vh" },
    { title: "REAL CC PROGRAMS", tag: "// ACTUAL PATHWAYS", rotate: -2, x: "-5vw", y: "15vh" }
  ];

  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-brand-white"
      initial={{ x: '100%' }}
      animate={{ x: '0%' }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.5, ease: "circOut" }}
    >
      <div className="relative w-full h-full">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 bg-brand-amber border-[4px] border-brand-slate p-6 w-[28vw] shadow-brutal flex flex-col gap-4"
            initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-50%', rotate: 0 }}
            animate={phase > i ? { opacity: 1, scale: 1, x: `calc(-50% + ${card.x})`, y: `calc(-50% + ${card.y})`, rotate: card.rotate } : { opacity: 0, scale: 0.5, x: '-50%', y: '-50%', rotate: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 15 }}
            style={{ zIndex: i }}
          >
            <h2 className="font-mono font-black text-[2vw] text-brand-slate tracking-tight leading-tight uppercase">{card.title}</h2>
            <div className="font-mono text-[1vw] text-brand-slate opacity-70 tracking-widest">{card.tag}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
