import { motion } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';

interface AssistantFabProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AssistantFab({ onClick, isOpen }: AssistantFabProps) {
  if (isOpen) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      onClick={onClick}
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent dark:bg-[#3ECF8E] text-white dark:text-[#121416] shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow"
      style={{ boxShadow: '0 4px 24px rgba(31, 77, 58, 0.35)' }}
    >
      <MessageSquare size={24} />
    </motion.button>
  );
}
