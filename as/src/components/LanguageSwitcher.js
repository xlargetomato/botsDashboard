'use client';

import { useTranslation } from '@/lib/i18n/config';
import { useState, useEffect } from 'react';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-24 rounded-md bg-gray-200 dark:bg-gray-700"></div>;
  }

  return (
    <div className="flex items-center space-x-2 rtl:space-x-reverse">
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={`px-3 py-1 rounded-md transition-all duration-200 font-cairo text-sm ${
          i18n.language === 'en'
            ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white font-medium shadow-sm'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
        aria-label={t('common.language.en')}
      >
        EN
      </button>
      <button
        onClick={() => i18n.changeLanguage('ar')}
        className={`px-3 py-1 rounded-md transition-all duration-200 font-cairo text-sm ${
          i18n.language === 'ar'
            ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white font-medium shadow-sm'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
        aria-label={t('common.language.ar')}
      >
        عربي
      </button>
    </div>
  );
}