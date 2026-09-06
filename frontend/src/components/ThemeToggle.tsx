import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-button text-text-secondary dark:text-[#8B9199] hover:bg-porcelaine dark:hover:bg-white/[0.05] transition-colors"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
      </motion.div>
      <span className="text-sm">
        {isDark ? 'Mode sombre' : 'Mode clair'}
      </span>
    </button>
  );
}
