'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import CheckoutForm from '@/components/subscriptions/fixed-checkout';

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
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
          
          // Get subscription type and amount from URL parameters
          const subscriptionType = searchParams.get('subscriptionType');
          const amount = searchParams.get('amount');
          const planId = searchParams.get('planId');
          const planName = searchParams.get('planName');
          
          console.log('CHECKOUT PAGE URL PARAMETERS:', {
            subscriptionType,
            amount,
            planId,
            planName
          });
          
          // Check if a plan is selected in session storage
          const storedPlan = sessionStorage.getItem('selectedPlan');
          if (!storedPlan && !planId) {
            router.push('/dashboard/client/subscriptions');
          } else {
            let plan;
            
            if (planId) {
              // Create a plan object from URL parameters
              plan = {
                id: planId,
                name: planName || 'Selected Plan',
                subscription_type: subscriptionType || 'monthly',
                amount: amount ? parseFloat(amount) : 0
              };
              console.log('Using plan from URL parameters:', plan);
            } else {
              plan = JSON.parse(storedPlan);
              console.log('Using plan from session storage:', plan);
            }
            
            // Ensure subscription type is set correctly
            if (subscriptionType) {
              plan.subscription_type = subscriptionType;
              plan.type = subscriptionType;
              console.log('Overriding subscription type to:', subscriptionType);
            }
            
            // Ensure amount is set correctly
            if (amount) {
              plan.amount = parseFloat(amount);
              console.log('Overriding amount to:', amount);
            }
            
            setSelectedPlan(plan);
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
  }, [router, searchParams]);

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

  // Determine the subscription type to use with detailed logging
  const subscriptionTypeFromUrl = searchParams.get('subscriptionType');
  const subscriptionTypeFromPlan = selectedPlan?.type || selectedPlan?.subscription_type;
  const finalSubscriptionType = subscriptionTypeFromUrl || subscriptionTypeFromPlan || 'monthly';
  
  console.log('Checkout page subscription type determination:', {
    fromUrl: subscriptionTypeFromUrl,
    fromPlan: subscriptionTypeFromPlan,
    final: finalSubscriptionType
  });

  return (
    <MainLayout sidebar={<DashboardSidebar />}>
      <CheckoutForm 
        subscriptionType={finalSubscriptionType}
        preSelectedPlan={selectedPlan}
        amount={selectedPlan?.amount || 0}
      />
    </MainLayout>
  );
}
