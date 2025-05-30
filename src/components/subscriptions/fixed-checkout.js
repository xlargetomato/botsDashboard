import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import EnhancedCheckoutForm from './EnhancedCheckoutForm';
import { FaSpinner, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';

/**
 * Fixed checkout component that ensures proper integration with Paylink.sa
 * This wrapper handles loading plans from the API and fixes Paylink integration issues
 */
const FixedCheckout = (props) => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isRtl = i18n.language === 'ar';
  
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  // Initialize subscription type from props or use monthly as default
  const [subscriptionType, setSubscriptionType] = useState(props.subscriptionType || 'monthly'); // 'weekly', 'monthly', 'yearly'
  const [preSelectedPlan, setPreSelectedPlan] = useState(props.preSelectedPlan || null);
  const [showAllPlans, setShowAllPlans] = useState(true); // Show all plans by default

  // Get the full URL including ngrok domain if available
  const getOrigin = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };
  
  // Update subscription type and adjust prices accordingly
  const updateSubscriptionType = (newType) => {
    setSubscriptionType(newType);
    
    // Update prices for all plans based on new subscription type
    const updatedPlans = plans.map(plan => {
      let price;
      switch(newType) {
        case 'weekly':
          price = parseFloat(plan.price_weekly || plan.price_monthly / 4 || 0);
          break;
        case 'yearly':
          price = parseFloat(plan.price_yearly || 0);
          break;
        case 'monthly':
        default:
          price = parseFloat(plan.price_monthly || 0);
          break;
      }
      
      return {
        ...plan,
        price
      };
    });
    
    setPlans(updatedPlans);
  };
  
  // Toggle language between English and Arabic
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  // Check the status of a transaction with the server - memoized with useCallback
  const checkTransactionStatus = useCallback(async (transactionData) => {
    if (!transactionData) return null;
    
    const { transaction_id, payment_intent_id, invoice_id } = transactionData;
    
    if (!transaction_id && !payment_intent_id && !invoice_id) {
      console.error('No transaction identifiers provided');
      return 'error';
    }
    
    try {
      console.log('Checking transaction status with data:', transactionData);
      
      // Use the current origin for API calls when using ngrok or similar tunnels
      const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Helper function to safely fetch from an endpoint
      const tryFetchStatus = async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`API call to ${url} failed with status: ${response.status}`);
            return { ok: false, status: response.status, data: null };
          }
          
          const data = await response.json();
          return { ok: true, data };
        } catch (err) {
          console.error(`Error fetching from ${url}:`, err);
          return { ok: false, error: err.message, data: null };
        }
      };
      
      // Build the query parameters for the API call
      const queryParams = new URLSearchParams();
      if (transaction_id) queryParams.append('txn_id', transaction_id);
      if (payment_intent_id) queryParams.append('payment_intent_id', payment_intent_id);
      if (invoice_id) queryParams.append('invoice_id', invoice_id);
      
      // Make the API call to check transaction status
      const apiUrl = `${apiBase}/api/subscriptions/transaction-status?${queryParams.toString()}`;
      const result = await tryFetchStatus(apiUrl);
      
      // If 404 error (transaction not found), try an alternative approach
      if (!result.ok && result.status === 404 && subscriptionId) {
        // Try checking subscription status directly
        const fallbackUrl = `${apiBase}/api/subscriptions/user?id=${encodeURIComponent(subscriptionId)}`;
        const fallbackResult = await tryFetchStatus(fallbackUrl);
        
        if (fallbackResult.ok && fallbackResult.data) {
          // Check if the subscription exists and is active
          const subscription = fallbackResult.data.subscriptions?.find(s => s.id === subscriptionId);
          if (subscription) {
            console.log('Found subscription directly:', subscription.status);
            if (subscription.status === 'active') {
              sessionStorage.removeItem('paylink_transaction');
              return 'completed';
            } else if (subscription.status === 'pending') {
              return 'pending';
            } else {
              return subscription.status;
            }
          }
        }
        
        // Still couldn't find any valid subscription information
        return 'not_found';
      }
      
      // Process the original response if it was successful
      if (result.ok && result.data) {
        console.log('Transaction status response:', result.data);
        
        if (result.data.status === 'completed') {
          // Transaction was successful, clear stored transaction
          sessionStorage.removeItem('paylink_transaction');
          return 'completed';
        }
        
        return result.data.status || 'unknown';
      }
      
      // If we reach here, something went wrong with both requests
      return 'error';
    } catch (err) {
      console.error('Error checking transaction status:', err);
      return 'error';
    }
  }, []);
  
  // Render payment status message based on transaction status
  const renderTransactionStatus = (status) => {
    switch(status) {
      case 'completed':
        return (
          <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-green-700 flex items-center mb-6">
            <FaCheckCircle className="mr-2 text-green-500" size={24} />
            <div>
              <h3 className="font-bold">{t('Payment Successful!')}</h3>
              <p>{t('Your subscription is now active.')}</p>
            </div>
          </div>
        );
      case 'pending':
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-700 flex items-center mb-6">
            <FaSpinner className="mr-2 text-yellow-500 animate-spin" size={24} />
            <div>
              <h3 className="font-bold">{t('Payment Processing')}</h3>
              <p>{t('Your payment is being processed. This may take a moment.')}</p>
            </div>
          </div>
        );
      case 'failed':
      case 'payment_failed':
        return (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 flex items-center mb-6">
            <FaExclamationTriangle className="mr-2 text-red-500" size={24} />
            <div>
              <h3 className="font-bold">{t('Payment Failed')}</h3>
              <p>{t('Your payment could not be processed. Please try again or contact support.')}</p>
              <button 
                onClick={() => {
                  // Clear any transaction in session storage
                  sessionStorage.removeItem('paylink_transaction');
                  // Refresh the page to start over
                  window.location.reload();
                }}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                {t('Try Again')}
              </button>
            </div>
          </div>
        );
      case 'not_found':
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-700 flex items-center mb-6">
            <FaExclamationTriangle className="mr-2 text-yellow-500" size={24} />
            <div>
              <h3 className="font-bold">{t('Payment Status Unknown')}</h3>
              <p>{t('We couldn\'t find your payment record. If you completed payment, please contact support.')}</p>
              <button 
                onClick={() => {
                  // Clear any transaction in session storage
                  sessionStorage.removeItem('paylink_transaction');
                  // Refresh the page to start over
                  window.location.reload();
                }}
                className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                {t('Try Again')}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  // Verify payment status with server and handle redirection
  const verifyPaymentStatus = useCallback(async (transactionData) => {
    setLoading(true);
    setMessage({
      type: 'processing',
      content: 'Verifying your payment status...'
    });
    
    try {
      console.log('Verifying payment status with data:', transactionData);
      const status = await checkTransactionStatus(transactionData);
      console.log(`Payment verification result: ${status}`);
      
      if (status === 'completed') {
        setMessage({
          type: 'success',
          content: 'Payment confirmed! Your subscription is now active.'
        });
        setTimeout(() => {
          router.push('/dashboard/client/subscriptions');
        }, 2000);
      } else if (status === 'pending') {
        setMessage({
          type: 'processing',
          content: 'Your payment is being processed. We\'ll notify you when it\'s complete.'
        });
        
        // Start a periodic check for pending payments
        let retryCount = 0;
        const maxRetries = 4;
        const statusCheckInterval = setInterval(async () => {
          retryCount++;
          console.log(`Rechecking payment status (attempt ${retryCount}/${maxRetries})`);
          
          try {
            const updatedStatus = await checkTransactionStatus(transactionData);
            if (updatedStatus === 'completed') {
              clearInterval(statusCheckInterval);
              setMessage({
                type: 'success',
                content: 'Payment confirmed! Your subscription is now active.'
              });
              setTimeout(() => {
                router.push('/dashboard/client/subscriptions');
              }, 2000);
            } else if (updatedStatus === 'failed' || updatedStatus === 'cancelled') {
              clearInterval(statusCheckInterval);
              setError('Payment was not completed. Please try again or contact support.');
            }
            
            if (retryCount >= maxRetries) {
              clearInterval(statusCheckInterval);
              router.push('/dashboard/client/subscriptions');
            }
          } catch (checkErr) {
            console.error('Error in payment status recheck:', checkErr);
            if (retryCount >= maxRetries) {
              clearInterval(statusCheckInterval);
            }
          }
        }, 8000); // Check every 8 seconds
      } else if (status === 'failed') {
        setMessage({
          type: 'error',
          content: 'Payment failed. Please try again or contact support.'
        });
      } else {
        setMessage({
          type: 'error',
          content: 'We could not verify your payment status. Please contact support.'
        });
      }
    } catch (err) {
      console.error('Error verifying payment status:', err);
      setMessage({
        type: 'error',
        content: 'Error verifying payment status. Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  }, [checkTransactionStatus, router]);

  // Check for payment result on component mount (e.g., when redirected back from Paylink)
  
  // Handle payment verification after redirects from Paylink
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Get URL parameters from the payment redirect
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('status');
    const txnId = urlParams.get('txn_id');
    const invoiceId = urlParams.get('invoice_id');
    
    // If we have URL parameters from a redirect, handle them
    if (paymentStatus || txnId || invoiceId) {
      console.log(`Redirected from payment gateway with: status=${paymentStatus}, txn_id=${txnId}, invoice_id=${invoiceId}`);
      
      // Handle successful payment
      if (paymentStatus === 'completed' || paymentStatus === 'success' || paymentStatus === 'paid') {
        setMessage({
          type: 'success',
          content: 'Payment successful! Verifying your subscription...'
        });
        
        verifyPaymentStatus({
          transaction_id: txnId,
          invoice_id: invoiceId
        });
      } 
      // Handle pending payment
      else if (paymentStatus === 'pending' || paymentStatus === 'processing') {
        setMessage({
          type: 'processing',
          content: 'Your payment is being processed. This may take a moment.'
        });
        
        const paymentData = {
          transaction_id: txnId,
          invoice_id: invoiceId
        };
        
        // Start checking status periodically
        let checkCount = 0;
        const maxChecks = 5;
        const checkInterval = setInterval(() => {
          checkCount++;
          console.log(`Checking payment status (${checkCount}/${maxChecks})`);
          verifyPaymentStatus(paymentData);
          
          if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
          }
        }, 5000);
        
        // Safety timeout
        setTimeout(() => clearInterval(checkInterval), 120000);
      } 
      // Handle failed payment
      else if (paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'expired') {
        setError(`Payment ${paymentStatus}. Please try again or contact support.`);
      }
      return;
    }
    
    // If no URL params, check sessionStorage for stored transaction
    const storedTransaction = sessionStorage.getItem('paylink_transaction');
    if (!storedTransaction) return;
    
    try {
      const transaction = JSON.parse(storedTransaction);
      console.log('Found stored transaction:', transaction);
      
      // Only verify recent transactions (< 1 hour old)
      const timestamp = new Date(transaction.timestamp || 0);
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      if (timestamp > oneHourAgo) {
        verifyPaymentStatus(transaction);
      } else {
        console.log('Transaction is too old, removing');
        sessionStorage.removeItem('paylink_transaction');
      }
    } catch (error) {
      console.error('Error parsing stored transaction:', error);
      sessionStorage.removeItem('paylink_transaction');
    }
  }, [verifyPaymentStatus]);

  // Fetch subscription plans from the API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Use preSelectedPlan from props first (passed directly) or check session storage
        let effectivePreSelectedPlan = preSelectedPlan;
        if (!effectivePreSelectedPlan && typeof window !== 'undefined') {
          const storedPlan = sessionStorage.getItem('selectedPlan');
          if (storedPlan) {
            try {
              effectivePreSelectedPlan = JSON.parse(storedPlan);
              console.log('Found stored plan with type:', effectivePreSelectedPlan?.type || effectivePreSelectedPlan?.subscription_type);
            } catch (e) {
              console.error('Error parsing stored plan:', e);
            }
          }
        }
        
        // Update subscription type from the selected plan if available
        if (effectivePreSelectedPlan?.type || effectivePreSelectedPlan?.subscription_type) {
          const planType = effectivePreSelectedPlan.type || effectivePreSelectedPlan.subscription_type;
          console.log(`Setting subscription type from selected plan: ${planType}`);
          setSubscriptionType(planType);
        }

        // Fetch plans from the API
        const response = await fetch('/api/subscriptions/plans');
        if (!response.ok) {
          throw new Error(`Failed to fetch subscription plans: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.plans && Array.isArray(data.plans)) {
          // Transform the API data to match the checkout form's expected format
          // Store weekly, monthly and yearly prices
          const formattedPlans = data.plans.map(plan => {
            // Calculate appropriate price based on subscription type
            let price;
            switch(subscriptionType) {
              case 'weekly':
                price = parseFloat(plan.price_weekly || plan.price_monthly / 4 || 0);
                break;
              case 'yearly':
                price = parseFloat(plan.price_yearly || 0);
                break;
              case 'monthly':
              default:
                price = parseFloat(plan.price_monthly || 0);
                break;
            }
            
            // Process features to ensure they're all strings, not objects
            const features = Array.isArray(plan.features) ? plan.features.map(feature => {
              // Convert any translation objects to strings
              if (feature && typeof feature === 'object' && (feature.en || feature.ar)) {
                return feature.en || ''; // Default to English version or empty string
              }
              return feature; // Return the feature if it's already a string
            }) : [];

            const features_ar = Array.isArray(plan.features_ar) ? plan.features_ar.map(feature => {
              // Convert any translation objects to strings
              if (feature && typeof feature === 'object' && (feature.en || feature.ar)) {
                return feature.ar || feature.en || ''; // Default to Arabic, then English, then empty string
              }
              return feature; // Return the feature if it's already a string
            }) : (Array.isArray(plan.features) ? plan.features.map(feature => {
              // If no Arabic features, try to extract Arabic from translation objects
              if (feature && typeof feature === 'object' && (feature.en || feature.ar)) {
                return feature.ar || feature.en || ''; // Default to Arabic, then English, then empty string
              }
              return feature; // Return the feature if it's already a string
            }) : []);
            
            return {
              id: plan.id,
              name: plan.name,
              name_ar: plan.name_ar || plan.name, // Arabic name if available
              description: plan.description,
              description_ar: plan.description_ar || plan.description, // Arabic description if available
              price_weekly: parseFloat(plan.price_weekly || plan.price_monthly / 4 || 0),
              price_monthly: parseFloat(plan.price_monthly || 0),
              price_yearly: parseFloat(plan.price_yearly || 0),
              price: price,
              features: features,
              features_ar: features_ar,
              isPopular: plan.is_popular || plan.isPopular || false,
              highlight_color: plan.highlight_color || '#3B82F6' // Default to blue if no color specified
            };
          });
          
          setPlans(formattedPlans);
          
          // Set the selected plan (either from props, session storage, or default to first plan)
          if (props.plan) {
            setSelectedPlan(props.plan);
          } else if (preSelectedPlan) {
            // Find the matching plan from our fetched plans
            const matchedPlan = formattedPlans.find(p => p.id === preSelectedPlan.id);
            setSelectedPlan(matchedPlan || formattedPlans[0]);
          } else if (formattedPlans.length > 0) {
            // If no plan is selected, choose the popular plan or the first one
            const popularPlan = formattedPlans.find(p => p.isPopular);
            setSelectedPlan(popularPlan || formattedPlans[0]);
          }
        } else {
          setError('No subscription plans available');
        }
      } catch (err) {
        console.error('Error fetching subscription plans:', err);
        setError('Failed to load subscription plans. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Fetch current user data
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    // Verify Paylink configuration status
    const checkPaylinkConfig = async () => {
      try {
        const response = await fetch('/api/paylink/status');
        if (!response.ok) {
          console.warn('Paylink configuration may have issues. Status:', response.status);
        }
      } catch (err) {
        console.error('Error checking Paylink status:', err);
      }
    };

    fetchPlans();
    fetchUserData();
    checkPaylinkConfig();
  }, [props.plan, props.subscriptionType, router, subscriptionType, preSelectedPlan]);

  // Handle loading state
  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-12">
        <FaSpinner className="animate-spin text-blue-600" size={32} />
        <span className="ml-2 text-gray-600">Loading subscription plans...</span>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Pass enhanced props to the checkout form
  const enhancedProps = {
    ...props,
    plans: plans,
    selectedPlan: selectedPlan,
    setSelectedPlan: setSelectedPlan,
    user: user,
    origin: getOrigin(), // Ensure callback URLs work properly with ngrok
    subscriptionType: subscriptionType,
    setSubscriptionType: updateSubscriptionType,
    isRtl: isRtl,
    showAllPlans: showAllPlans,
    setShowAllPlans: setShowAllPlans,
    // Language and theme utilities
    t: t,
    language: i18n.language,
    toggleLanguage: toggleLanguage,
    theme: theme,
    toggleTheme: toggleTheme,
    // Fix Paylink integration issues from memory:
    // 1. Ensure we pass the correct token format
    apiIdFormat: 'APP_ID_',  // Based on memory about API_ID format inconsistency
    // 2. Handle callback URL properly (ensure no double slashes)
    callbackUrlFormatter: (url) => {
      // Fix double slash issue in callback URL mentioned in memory
      return url.replace(/([^:]\/)\/+/g, "$1");
    }
  };

  return (
    <div className={`checkout-container ${isRtl ? 'rtl' : 'ltr'} ${theme === 'dark' ? 'dark' : 'light'}`}>
      <div className="subscription-period-selector mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white font-sans cairo-font">
          {t('Subscription Period')}
        </h3>
        
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => updateSubscriptionType('weekly')}
            className={`flex-1 py-2 px-4 rounded-md transition-all font-sans cairo-font ${
              subscriptionType === 'weekly' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isRtl ? 'أسبوعي' : 'Weekly'}
          </button>
          
          <button
            onClick={() => updateSubscriptionType('monthly')}
            className={`flex-1 py-2 px-4 rounded-md transition-all font-sans cairo-font ${
              subscriptionType === 'monthly' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isRtl ? 'شهري' : 'Monthly'}
          </button>
          
          <button
            onClick={() => updateSubscriptionType('yearly')}
            className={`flex-1 py-2 px-4 rounded-md transition-all font-sans cairo-font ${
              subscriptionType === 'yearly' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isRtl ? 'سنوي' : 'Yearly'}
          </button>
        </div>
      </div>
      
      <EnhancedCheckoutForm {...enhancedProps} />
    </div>
  );
};

export default FixedCheckout;
