import { motion } from 'framer-motion';

export function Scene3() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-amber"
      initial={{ opacity: 1, y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-100%' }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <motion.div 
        className="text-ink text-[6vw] font-mono mb-12 shadow-brutalist border-[4px] border-ink bg-white p-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
      >
        OPEN TO YOU.
      </motion.div>

      <div className="flex flex-wrap gap-6 justify-center w-[80vw]">
        {['UC IRVINE', 'UCLA', 'UC DAVIS', 'CSULB'].map((text, i) => (
          <motion.div 
            key={text}
            className="bg-white border-[4px] border-ink p-4 shadow-brutalist"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="text-ink text-[3vw] font-mono leading-none">{text}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}