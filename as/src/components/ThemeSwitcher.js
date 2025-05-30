'use client';

import { useTheme } from '@/lib/theme/ThemeContext';
import { useTranslation } from '@/lib/i18n/config';
import { useState, useEffect } from 'react';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation('common');
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>;
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full overflow-hidden group"
      aria-label={theme === 'dark' ? t('common.theme.light') : t('common.theme.dark')}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-300 dark:from-indigo-400 dark:to-purple-600 opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute inset-0 flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110">
        {theme === 'dark' ? (
          // Sun icon for light mode
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          // Moon icon for dark mode
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </div>
    </button>
  );
}