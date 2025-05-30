'use client';

import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/config';

export default function CurrencySymbol({ className = '', showText = false }) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const url = '/Saudi_Riyal_Symbol-2.svg';
  
  return (
    <span className={`inline-flex items-center ${isRtl ? 'flex-row-reverse' : 'flex-row'} ${className}`}>
      <Image 
        src={url} 
        alt="Saudi Riyal" 
        width={16} 
        height={16} 
        className={isRtl ? 'mr-1' : 'ml-1'}
      />
      {showText && <span className="text-xs">{isRtl ? 'ريال' : 'SAR'}</span>}
    </span>
  );
}
