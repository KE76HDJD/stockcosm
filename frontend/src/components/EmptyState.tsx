import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-16 h-16 bg-porcelaine dark:bg-white/[0.05] rounded-full flex items-center justify-center mb-4">
        <Icon size={28} className="text-text-secondary/50 dark:text-[#8B9199]/50" />
      </div>
      <h3 className="font-heading font-600 text-base text-text-primary dark:text-[#E4E6E9] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary dark:text-[#8B9199] text-center max-w-sm">{description}</p>
      )}
    </motion.div>
  );
}
