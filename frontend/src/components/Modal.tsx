import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative bg-white dark:bg-[#1C1F22] sm:rounded-card border-0 sm:border border-border dark:border-white/[0.08] w-full ${maxWidth} max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-t-2xl`}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border dark:border-white/[0.08] sticky top-0 bg-white dark:bg-[#1C1F22] z-10">
              <h2 className="text-base sm:text-lg font-heading font-600 truncate pr-4 text-text-primary dark:text-[#E4E6E9]">{title}</h2>
              <button onClick={onClose} className="p-1.5 sm:p-1 rounded-button hover:bg-porcelaine dark:hover:bg-white/[0.05] transition-colors shrink-0">
                <X size={20} className="text-text-secondary dark:text-[#8B9199]" />
              </button>
            </div>
            <div className="p-4 sm:p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
