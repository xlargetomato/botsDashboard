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
  const [message, setMessage] = useState(null);

  // Log the subscription type received from props
  console.log('FixedCheckout received props.subscriptionType:', props.subscriptionType);
  console.log('FixedCheckout initialized subscriptionType state:', subscriptionType);
  
  // Get the full URL including ngrok domain if available
  const getOrigin = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };
  
  // Update subscription type and adjust prices accordingly
  const updateSubscriptionType = (newType) => {
    // Only proceed if this is actually a different type
    if (newType === subscriptionType) return;
    
    console.log(`Updating subscription type from ${subscriptionType} to ${newType}`);
    
    // Immediately calculate new prices for all plans based on the new type
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
        price,
        subscription_type: newType, // Ensure the plan has the correct subscription type
        type: newType // Add type field for compatibility
      };
    });
    
    // Batch state updates to prevent multiple re-renders
    const batchedUpdate = () => {
      // First update subscription type
      setSubscriptionType(newType);
      
      // Then update plans with new prices
      setPlans(updatedPlans);
      
      // Update selected plan if one exists
      if (selectedPlan) {
        const updatedSelectedPlan = updatedPlans.find(p => p.id === selectedPlan.id);
        if (updatedSelectedPlan) {
          console.log('Updating selected plan with new subscription type:', newType);
          setSelectedPlan({
            ...updatedSelectedPlan,
            subscription_type: newType,
            type: newType
          });
        }
      }
    };
    
    // Execute all updates in one go
    batchedUpdate();
  };
  
  // Toggle language between English and Arabic
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  // Check the status of a transaction with the server - memoized with useCallback
  const checkTransactionStatus = useCallback(async (transactionData) => {
    if (!transactionData) return null;
    
    const { transaction_id, payment_intent_id, invoice_id, subscription_id, orderNumber, transactionNo } = transactionData;
    
    // Log all available transaction data for debugging
    console.log('Transaction data for status check:', transactionData);
    
    // Check if we have at least one identifier to work with
    if (!transaction_id && !payment_intent_id && !invoice_id && !subscription_id && !orderNumber && !transactionNo) {
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
      // Add subscription_id to query params if available
      if (transactionData.subscription_id) queryParams.append('subscription_id', transactionData.subscription_id);
      // Add additional transaction identifiers if available
      if (transactionData.orderNumber) queryParams.append('orderNumber', transactionData.orderNumber);
      if (transactionData.transactionNo) queryParams.append('transactionNo', transactionData.transactionNo);
      
      // Make the API call to check transaction status
      const apiUrl = `${apiBase}/api/subscriptions/transaction-status?${queryParams.toString()}`;
      const result = await tryFetchStatus(apiUrl);
      
      // If error or empty result, try an alternative approach with subscription ID
      if ((!result.ok || !result.data) && transactionData.subscription_id) {
        const subscriptionId = transactionData.subscription_id;
        console.log(`Trying alternative approach with subscription ID: ${subscriptionId}`);
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
        
        if (result.data.status === 'completed' || result.data.status === 'success' || result.data.status === 'paid') {
          // Transaction was successful, clear stored transaction
          sessionStorage.removeItem('paylink_transaction');
          return 'completed';
        }
        
        // Create payment - handle all possible success cases
        if (result.success && result.data && (result.data.url || result.data.checkoutUrl || result.data.redirectUrl)) {
          // Get the payment URL from the response
          const paymentUrl = result.data.url || result.data.checkoutUrl || result.data.redirectUrl;
          
          // Store invoice ID and transaction details in session storage for verification after redirect
          if (result.data.invoiceId || result.data.id) {
            sessionStorage.setItem('paylink_invoice_id', result.data.invoiceId || result.data.id);
          }
          
          if (result.data.transactionNo) {
            sessionStorage.setItem('paylink_transaction_no', result.data.transactionNo);
          }
          
          if (result.data.orderNumber) {
            sessionStorage.setItem('paylink_order_number', result.data.orderNumber);
          }
          
          // Store the timestamp for verification
          sessionStorage.setItem('paylink_redirect_time', Date.now().toString());
          
          // Navigate to payment URL
          if (paymentUrl) {
            console.log(`Redirecting to payment gateway: ${paymentUrl}`);
            window.location.href = paymentUrl;
            return;
          }
        }
        
        return result.data.status || 'unknown';
      }
      
      // Never assume success based on URL parameters alone - they can be manipulated
      // Always rely on the server's verification with Paylink API
      console.log('Could not verify transaction status through regular means');
      return 'error';
      
      // If we reach here, something went wrong with both requests
      console.error('All verification attempts failed');
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
  
  // Function to verify payment status with the server
  // Using useCallback to prevent recreation on every render and avoid infinite loops
  const verifyPaymentStatus = useCallback(async (transaction, autoVerify = false) => {
    const showProcessingMessage = autoVerify;
    setLoading(true);
    
    // Only show the processing message if explicitly requested
    // This prevents showing the message when just checking status without user action
    if (showProcessingMessage) {
      setMessage({
        type: 'processing',
        content: 'Verifying your payment status...'
      });
    }
    
    try {
      console.log('Verifying payment status with data:', transaction);
      const status = await checkTransactionStatus(transaction);
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
            const updatedStatus = await checkTransactionStatus(transaction);
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
      } else {
        setMessage({
          type: 'error',
          content: 'Payment failed. Please try again or contact support.'
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
  }, [router, setMessage, checkTransactionStatus]);
  
  // Handle payment verification after redirects from Paylink
  useEffect(() => {
    // Only run this effect on client-side
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    
    // If we have payment-related parameters, redirect directly to payment-status
    if (urlParams.get('status') || urlParams.get('txn_id') || urlParams.get('orderNumber')) {
      const currentUrl = new URL(window.location.href);
      
      // Always redirect to payment-status, never to checkout
      if (!currentUrl.pathname.includes('/payment-status')) {
        currentUrl.pathname = '/dashboard/client/subscriptions/payment-status';
        
        // Preserve all query parameters
        const newParams = new URLSearchParams(urlParams);
        currentUrl.search = newParams.toString();
        
        // Perform the redirect
        window.location.href = currentUrl.toString();
        return;
      }
    }

    // First, check if we have 3D Secure authentication parameters (PaRes and MD)
    const paRes = urlParams.get('PaRes');
    const md = urlParams.get('MD');
    
    // If we have 3D Secure parameters, handle 3DS authentication
    if (paRes && md) {
      console.log('Detected 3D Secure authentication callback');
      
      // Show processing message
      setMessage({
        type: 'processing',
        content: 'Completing payment authentication...'
      });
      
      // Get all transaction identifiers
      const txnId = urlParams.get('txn_id');
      const orderNumber = urlParams.get('orderNumber');
      const transactionNo = urlParams.get('transactionNo');
      const planId = urlParams.get('planId');
      const planName = urlParams.get('planName');
      
      // Save these identifiers to session storage
      if (txnId) sessionStorage.setItem('paymentTransactionId', txnId);
      if (orderNumber) sessionStorage.setItem('paymentOrderNumber', orderNumber);
      if (transactionNo) sessionStorage.setItem('paymentTransactionNo', transactionNo);
      
      // Redirect to 3DS callback handler with payment-status as the final destination
      let redirectUrl = `/api/paylink/3ds-callback?PaRes=${encodeURIComponent(btoa(paRes))}&MD=${encodeURIComponent(md)}`;
      
      // Add all transaction identifiers
      if (txnId) redirectUrl += `&txn_id=${encodeURIComponent(txnId)}`;
      if (orderNumber) redirectUrl += `&orderNumber=${encodeURIComponent(orderNumber)}`;
      if (transactionNo) redirectUrl += `&transactionNo=${encodeURIComponent(transactionNo)}`;
      if (planId) redirectUrl += `&planId=${encodeURIComponent(planId)}`;
      if (planName) redirectUrl += `&planName=${encodeURIComponent(planName)}`;
      
      // Add redirect_to parameter to ensure direct redirection to payment-status
      redirectUrl += `&redirect_to=${encodeURIComponent('/dashboard/client/subscriptions/payment-status')}`;
      
      window.location.href = redirectUrl;
      return;
    }
    
    // Get URL parameters from the payment redirect
    const paymentStatus = urlParams.get('status');
    const txnId = urlParams.get('txn_id');
    const invoiceId = urlParams.get('invoice_id');
    const subscriptionId = urlParams.get('subscription_id');
    const orderNumber = urlParams.get('orderNumber');
    const transactionNo = urlParams.get('transactionNo');
    
    // Also retrieve stored payment data from session storage
    const storedInvoiceId = sessionStorage.getItem('paylink_invoice_id');
    const storedTransactionNo = sessionStorage.getItem('paylink_transaction_no');
    const storedOrderNumber = sessionStorage.getItem('paylink_order_number');
    
    console.log('URL Parameters:', { 
      status: paymentStatus, 
      txn_id: txnId, 
      invoice_id: invoiceId, 
      subscription_id: subscriptionId,
      orderNumber,
      transactionNo
    });
    
    console.log('Stored Payment Data:', {
      invoice_id: storedInvoiceId,
      transactionNo: storedTransactionNo,
      orderNumber: storedOrderNumber
    });
    
    // Combine URL parameters and stored data for verification
    const finalInvoiceId = invoiceId || storedInvoiceId;
    const finalTransactionNo = transactionNo || storedTransactionNo;
    const finalOrderNumber = orderNumber || storedOrderNumber;
    
    // Only process payment status if we have explicit URL parameters from a redirect
    // or if we have stored payment data from a recent redirect
    if ((paymentStatus && (txnId || finalInvoiceId)) || finalInvoiceId) {
      console.log(`Processing payment verification with: invoice_id=${finalInvoiceId}, transactionNo=${finalTransactionNo}`);
      
      // This only controls what message to show initially before verification
      // The actual status will be determined by the API call to verify with Paylink
      if (paymentStatus === 'completed' || paymentStatus === 'success' || paymentStatus === 'paid') {
        console.log('URL indicates success, verifying with server...');
        setMessage({
          type: 'success',
          content: 'Payment successful! Verifying your subscription...'
        });
      } else {
        // Show processing message for all other cases until we verify
        setMessage({
          type: 'processing',
          content: 'Verifying your payment status...'
        });
      }
      
      // Combine all available transaction identifiers for verification
      const transaction = {
        transaction_id: txnId,
        invoice_id: finalInvoiceId,
        subscription_id: subscriptionId,
        orderNumber: finalOrderNumber,
        transactionNo: finalTransactionNo
      };
      
      // Always verify with the server regardless of URL parameters
      verifyPaymentStatus(transaction, true);
      
      // Clear stored payment data after verification
      sessionStorage.removeItem('paylink_invoice_id');
      sessionStorage.removeItem('paylink_transaction_no');
      sessionStorage.removeItem('paylink_order_number');
      sessionStorage.removeItem('paylink_redirect_time');
    }
    
    // Do not automatically check stored transactions on component mount
    // This prevents the payment processing message from appearing when just selecting a plan
    // The stored transaction will only be checked when explicitly triggered by user action
    // or when there are explicit URL parameters from a payment gateway redirect
  }, [verifyPaymentStatus, setMessage]);

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
              highlight_color: plan.highlight_color || '#3B82F6', // Default to blue if no color specified
              subscription_type: subscriptionType,
              type: subscriptionType
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
  }, [props.plan, props.subscriptionType, router, preSelectedPlan]); // Removed subscriptionType from dependencies to prevent re-fetching on type change

  // Render message component
  const renderMessage = () => {
    if (!message) return null;
    const { type, content } = message;
    let icon = null;
    let bgColor = '';
    let textColor = '';

    switch (type) {
      case 'success':
        icon = <FaCheckCircle className="text-green-500" size={24} />;
        bgColor = 'bg-green-50 border-green-100 text-green-700';
        break;
      case 'error':
        icon = <FaExclamationTriangle className="text-red-500" size={24} />;
        bgColor = 'bg-red-50 border-red-100 text-red-700';
        break;
      case 'processing':
        icon = <FaSpinner className="text-blue-500 animate-spin" size={24} />;
        bgColor = 'bg-blue-50 border-blue-100 text-blue-700';
        break;
      default:
        bgColor = 'bg-gray-50 border-gray-100 text-gray-700';
    }

    return (
      <div className={`p-4 ${bgColor} border rounded-lg flex items-center rtl:flex-row-reverse rtl:text-right mb-6`}>
        {icon && <div className="rtl:ml-3 ltr:mr-3">{icon}</div>}
        <div>{content}</div>
      </div>
    );
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-12 rtl:flex-row-reverse">
        <FaSpinner className="animate-spin text-blue-600" size={32} />
        <span className="rtl:mr-2 ltr:ml-2 text-gray-600 rtl:font-[Cairo]">Loading subscription plans...</span>
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

  // Handle payment creation
  const handleCreatePayment = async (paymentData) => {
    try {
      // Ensure subscription type is included in the payment data
      const enhancedPaymentData = {
        ...paymentData,
        subscriptionType: subscriptionType,
        planId: selectedPlan?.id,
        metadata: {
          ...paymentData.metadata,
          subscriptionType: subscriptionType
        }
      };
      
      console.log('Creating payment with data:', enhancedPaymentData);
      
      // Use the current origin for API calls when using ngrok or similar tunnels
      const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Make the API call to create payment
      const response = await fetch(`${apiBase}/api/paylink/direct-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedPaymentData),
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  };

  return (
    <div>
      {renderMessage()}
      <div className={`checkout-container rtl:text-right rtl:font-[Cairo] ${isRtl ? 'rtl' : 'ltr'} ${theme === 'dark' ? 'dark' : 'light'}`}>
        <EnhancedCheckoutForm 
          {...enhancedProps} 
          renderPeriodSelector={() => (
            <div className="subscription-period-selector mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white rtl:font-[Cairo] rtl:text-right">
                {t('Subscription Period')}
              </h3>
              
              <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3 shadow-md">
                <div className="relative flex rtl:flex-row-reverse gap-2 z-10">
                  <button
                    onClick={() => updateSubscriptionType('weekly')}
                    className={`relative flex-1 py-3 px-2 rounded-xl font-medium transition-all duration-300 rtl:font-[Cairo] flex justify-center items-center ${
                      subscriptionType === 'weekly' 
                        ? 'text-white' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    <span className={`relative z-10 ${subscriptionType === 'weekly' ? 'font-bold' : ''}`}>
                      {isRtl ? 'أسبوعي' : 'Weekly'}
                    </span>
                    {subscriptionType === 'weekly' && (
                      <span className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg animate-fadeIn" 
                            style={{animation: 'fadeIn 0.3s ease-out'}}></span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => updateSubscriptionType('monthly')}
                    className={`relative flex-1 py-3 px-2 rounded-xl font-medium transition-all duration-300 rtl:font-[Cairo] flex justify-center items-center ${
                      subscriptionType === 'monthly' 
                        ? 'text-white' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    <span className={`relative z-10 ${subscriptionType === 'monthly' ? 'font-bold' : ''}`}>
                      {isRtl ? 'شهري' : 'Monthly'}
                    </span>
                    {subscriptionType === 'monthly' && (
                      <span className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg animate-fadeIn"
                            style={{animation: 'fadeIn 0.3s ease-out'}}></span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => updateSubscriptionType('yearly')}
                    className={`relative flex-1 py-3 px-2 rounded-xl font-medium transition-all duration-300 rtl:font-[Cairo] flex justify-center items-center ${
                      subscriptionType === 'yearly' 
                        ? 'text-white' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    <span className={`relative z-10 ${subscriptionType === 'yearly' ? 'font-bold' : ''}`}>
                      {isRtl ? 'سنوي' : 'Yearly'}
                    </span>
                    {subscriptionType === 'yearly' && (
                      <span className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg animate-fadeIn"
                            style={{animation: 'fadeIn 0.3s ease-out'}}></span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default FixedCheckout;