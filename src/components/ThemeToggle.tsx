import React from 'react';
import { useTheme } from '../utils/theme';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-1.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-warm-100/80 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:text-ink-950 dark:hover:text-white transition-all cursor-pointer ${className}`}
      aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-ink-600" />
      )}
    </button>
  );
};
