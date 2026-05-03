import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // cut to amber bg
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className={`absolute inset-0 flex items-center justify-center ${phase >= 1 ? 'bg-amber' : 'bg-ink'}`}
      initial={{ opacity: 1 }}
      exit={{ opacity: 1 }} // handled by mode="wait" short exit if needed, but let's keep it clean
    >
      {phase === 0 && (
        <motion.div 
          className="text-white text-[8vw] font-mono whitespace-nowrap"
        >
          {"UNDOCUMENTED?".split('').map((char, i) => (
            <motion.span 
              key={i} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: i * 0.05, duration: 0.1 }}
            >
              {char}
            </motion.span>
          ))}
        </motion.div>
      )}

      {phase >= 1 && (
        <motion.div 
          className="bg-white border-[4px] border-ink p-8 shadow-brutalist"
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="text-ink text-[6vw] font-mono leading-none">
            YOU CAN STILL<br/>TRANSFER.
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}