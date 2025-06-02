'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAuth } from '@/lib/auth/AuthContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Menu, X, LogOut } from 'lucide-react';

export default function Navbar({ isStatic = false }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user, loading, logout } = useAuth();
  const isRtl = i18n.language === 'ar';
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const iconColor = theme === 'dark' ? 'white' : 'black'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`${isStatic ? 'relative text-black ' : 'fixed top-0 left-0 right-0 '} z-50 transition-all duration-300 ${isRtl ? 'rtl' : 'ltr'} ${
        isScrolled || mobileMenuOpen
          ? 'py-2 backdrop-blur-md bg-white/90 text-black dark:bg-gray-900/90 shadow-md' 
          : `py-4 bg-transparent ${!isStatic ? 'text-white' : 'text-black'} dark:text-white`
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center group">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center mr-2 shadow-lg transition-transform group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold font-cairo">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600 dark:from-green-400 dark:to-blue-500">Pro</span>
                <span className={`${isScrolled || mobileMenuOpen ? 'text-gray-900 dark:text-white' : (isStatic ? 'text-gray-900 dark:text-white' : 'text-white dark:text-white')}`}>ject</span>
              </h1>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
            <Link href="/#features" className={`font-cairo text-base font-medium transition-all ${isScrolled || mobileMenuOpen ? 'text-gray-800 hover:text-green-500 dark:text-gray-100 dark:hover:text-green-400' : (isStatic ? 'text-gray-800 hover:text-green-500 dark:text-gray-100 dark:hover:text-green-400' : 'text-white hover:text-green-300 dark:text-gray-100 dark:hover:text-green-400')}`}>
              {t('common.navigation.features')}
            </Link>

            <Link href="/#pricing" className={`font-cairo text-base font-medium transition-all ${isScrolled || mobileMenuOpen ? 'text-gray-800 hover:text-green-500 dark:text-gray-100 dark:hover:text-green-400' : (isStatic ? 'text-gray-800 hover:text-green-500 dark:text-gray-100 dark:hover:text-green-400' : 'text-white hover:text-green-300 dark:text-gray-100 dark:hover:text-green-400')}`}>
              {t('common.navigation.pricing')}
            </Link>
            <Link href="/#pricing" className={`font-cairo text-base font-medium transition-all ${isScrolled || mobileMenuOpen ? 'text-gray-800 hover:text-green-500 dark:text-gray-100 dark:hover:text-green-400' : (isStatic ? 'text-gray-800 hover:text-green-500 dark:text-gray-100 dark:hover:text-green-400' : 'text-white hover:text-green-300 dark:text-gray-100 dark:hover:text-green-400')}`}>
              {t('common.navigation.docs')}
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="hidden md:flex items-center space-x-3 rtl:space-x-reverse">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
            
            <div className="hidden md:flex items-center space-x-2 rtl:space-x-reverse">
              {!loading && (
                user ? (
                  <>
                    <Link 
                      href="/dashboard/client" 
                      className={`px-4 py-2 hover:text-green-600 dark:hover:text-green-400 transition-colors font-cairo font-medium ${isScrolled || mobileMenuOpen ? 'text-gray-700 dark:text-gray-200' : (isStatic ? 'text-gray-700 dark:text-gray-200' : 'text-white dark:text-gray-200')}`}
                    >
                      {t('common.navigation.dashboard')}
                    </Link>
                    <button 
                      onClick={logout}
                      className={`px-5 py-2 border font-medium transition-all duration-300 rounded-full font-cairo flex items-center ${isScrolled || mobileMenuOpen ? 'text-gray-700 border-gray-300 dark:text-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800' : (isStatic ? 'text-gray-700 border-gray-300 dark:text-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-white border-white/60 dark:text-gray-200 dark:border-gray-700 hover:bg-white/10 dark:hover:bg-gray-800')}`}
                    >
                      <LogOut size={16} className="mr-1 rtl:ml-1 rtl:mr-0" />
                      {t('common.auth.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className={`px-4 py-2 transition-colors font-cairo font-medium ${isScrolled || mobileMenuOpen ? 'text-gray-700 hover:text-green-600 dark:text-gray-200 dark:hover:text-green-400' : (isStatic ? 'text-gray-700 hover:text-green-600 dark:text-gray-200 dark:hover:text-green-400' : 'text-white hover:text-green-300 dark:text-gray-200 dark:hover:text-green-400')}`}>
                      {t('common.auth.login')}
                    </Link>
                    <Link 
                      href="/register" 
                      className="px-5 py-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium transition-all duration-300 rounded-full shadow-md hover:shadow-lg font-cairo flex items-center"
                    >
                      {t('common.auth.register')}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 rtl:ml-0 rtl:mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </>
                )
              )}
            </div>
            
            {/* Mobile Menu Button */}
            <button 
              className={`md:hidden p-2 rounded-md ${isScrolled || mobileMenuOpen ? 'text-gray-800 dark:text-gray-300' : 'text-white dark:text-gray-300'} hover:bg-gray-500/20 dark:hover:bg-gray-800/50 transition-colors`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
      {mobileMenuOpen ? ( <X size={24} color={iconColor} /> ) : ( <Menu size={24} color={iconColor} />)}
         </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${mobileMenuOpen ? 'max-h-96 opacity-100 mt-4 bg-white/95 dark:bg-gray-900/95 rounded-lg p-4 shadow-lg' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col space-y-4 pb-5 pt-2">
            <Link 
              href="/#features" 
              className="font-cairo py-2 font-medium text-gray-800 dark:text-gray-200 hover:text-green-500 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('common.navigation.features')}
            </Link>
            <Link 
              href="/#pricing" 
              className="font-cairo py-2 font-medium text-gray-800 dark:text-gray-200 hover:text-green-500 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('common.navigation.pricing')}
            </Link>
            <Link 
              href="/#docs" 
              className="font-cairo py-2 font-medium text-gray-800 dark:text-gray-200 hover:text-green-500 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('common.navigation.docs')}
            </Link>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse pt-2">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
            
            {!loading && (
              <div className="flex flex-col space-y-3 pt-2">
                {user ? (
                  <>
                    <Link
                      href="/dashboard/client"
                      className="px-4 py-2 text-center text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-cairo"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('common.navigation.dashboard')}
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="px-4 py-2 text-center text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-cairo flex items-center justify-center"
                    >
                      <LogOut size={16} className="mr-1 rtl:ml-1 rtl:mr-0" />
                      {t('common.auth.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-4 py-2 text-center text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-cairo"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('common.auth.login')}
                    </Link>
                    <Link
                      href="/register"
                      className="px-4 py-2 text-center bg-gradient-to-r from-green-500 to-blue-600 text-white font-medium rounded-full shadow-md font-cairo"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('common.auth.register')}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}