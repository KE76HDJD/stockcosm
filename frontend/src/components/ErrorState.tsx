import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Une erreur est survenue', onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-16 h-16 bg-stock-rupture/10 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle size={28} className="text-stock-rupture" />
      </div>
      <h3 className="font-heading font-600 text-base text-text-primary dark:text-[#E4E6E9] mb-1">Erreur</h3>
      <p className="text-sm text-text-secondary dark:text-[#8B9199] text-center max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw size={14} />
          Réessayer
        </Button>
      )}
    </motion.div>
  );
}
