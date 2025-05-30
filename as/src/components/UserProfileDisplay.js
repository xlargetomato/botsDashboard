'use client';

import { useTranslation } from '@/lib/i18n/config';

export default function UserProfileDisplay({ user }) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  if (!user) return null;
  
  return (
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.name || 'User'} 
              className="h-10 w-10 rounded-full" 
            />
          ) : (
            <span className="text-purple-600 dark:text-purple-400 text-lg font-medium">
              {(user.name?.charAt(0) || 'U').toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <div className={`${isRtl ? 'mr-3 text-right' : 'ml-3 text-left'}`}>
        <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
          {user.name || 'User'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
          {user.email || ''}
        </p>
      </div>
    </div>
  );
}
