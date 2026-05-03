import { motion } from 'framer-motion';

export function Scene4() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-ink text-white"
      initial={{ opacity: 1, scale: 1.2 }}
      animate={{ scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <div className="flex items-center gap-4 mb-12">
        <motion.div 
          className="w-[7vh] h-[7vh] bg-ink border-[3px] border-white flex items-center justify-center text-[4vh] font-mono leading-none shadow-[4px_4px_0_0_#FFFFFF]"
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
        >
          D
        </motion.div>
        <div className="flex flex-col">
          <motion.div 
            className="text-[6vh] font-mono leading-none"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            DYP
          </motion.div>
          <motion.div 
            className="text-[1.5vh] font-mono tracking-widest text-amber"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            // DO YOUR PATH
          </motion.div>
        </div>
      </div>

      <motion.div 
        className="text-[8vw] font-mono mb-8 text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
      >
        DO YOUR PATH.
      </motion.div>

      <motion.div 
        className="text-[2vw] font-sans font-bold bg-amber text-amberText px-6 py-2 border-[3px] border-ink shadow-brutalist"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.3, type: 'spring', stiffness: 400, damping: 25 }}
      >
        DOYOURPATH.APP // FREE · NO CREDIT CARD
      </motion.div>
    </motion.div>
  );
}