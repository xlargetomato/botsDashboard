'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import CheckoutForm from '@/components/subscriptions/fixed-checkout';

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          setAuthenticated(true);
          
          // Check if a plan is selected in session storage
          const storedPlan = sessionStorage.getItem('selectedPlan');
          if (!storedPlan) {
            router.push('/dashboard/client/subscriptions');
          } else {
            setSelectedPlan(JSON.parse(storedPlan));
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!authenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <MainLayout sidebar={<DashboardSidebar />}>
      <CheckoutForm 
        subscriptionType={selectedPlan?.type || selectedPlan?.subscription_type || 'monthly'}
        preSelectedPlan={selectedPlan}
      />
    </MainLayout>
  );
}
