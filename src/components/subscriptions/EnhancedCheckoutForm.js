import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCreditCard, FaCheckCircle, FaExclamationCircle, FaSpinner, FaRegCreditCard, FaPercent, FaSun, FaMoon } from 'react-icons/fa';
import { MdLock, MdPayment, MdSecurity, MdLocalOffer } from 'react-icons/md';
import PlanCard from './PlanCard';

const EnhancedCheckoutForm = ({ 
  plans = [],
  selectedPlan,
  setSelectedPlan,
  subscriptionType = 'monthly',
  setSubscriptionType,
  promoCode = '',
  discount = 0,
  origin = '',
  isRtl = false,
  language = 'en',
  t,
  theme,
  showAllPlans = true,
  user = null
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    country: user?.country || '',
    address: user?.address || '',
    city: user?.city || '',
    postalCode: user?.postal_code || ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState(promoCode || '');
  const [appliedCoupon, setAppliedCoupon] = useState(promoCode ? { code: promoCode, discount } : null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [step, setStep] = useState('plan-selection'); // 'plan-selection' or 'payment-details'

  // Set default selected plan to first popular plan or first plan
  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlan) {
      const popularPlan = plans.find(plan => plan.isPopular);
      setSelectedPlan(popularPlan || plans[0]);
      console.log('Selected default plan:', popularPlan || plans[0]);
    }
  }, [plans, selectedPlan, setSelectedPlan]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Apply formatting for card number
    if (name === 'cardNumber') {
      // Remove non-digits
      formattedValue = value.replace(/\D/g, '');
      // Add spaces every 4 digits
      formattedValue = formattedValue.replace(/(\d{4})(?=\d)/g, '$1 ');
      // Limit to 19 characters (16 digits + 3 spaces)
      formattedValue = formattedValue.substring(0, 19);
    }
    
    // Format expiry date as MM/YY
    if (name === 'expiryDate') {
      // Remove non-digits
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length > 2) {
        formattedValue = `${formattedValue.substring(0, 2)}/${formattedValue.substring(2, 4)}`;
      }
    }
    
    // Limit CVV to 3-4 digits
    if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').substring(0, 4);
    }
    
    // Update form data with formatted value
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle plan selection
  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  // Handle theme toggle using the parent's toggleTheme function
  const handleThemeToggle = () => {
    if (toggleTheme && typeof toggleTheme === 'function') {
      toggleTheme();
    }
  };

  // Calculate total price with discount
  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    
    const basePrice = selectedPlan.price;
    const discountAmount = appliedCoupon 
      ? (basePrice * (appliedCoupon.discount / 100)) 
      : 0;
    
    return (basePrice - discountAmount).toFixed(2);
  };

  // Apply coupon code
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    setError('');
    
    try {
      const response = await fetch(`/api/coupons/validate?code=${couponCode}`);
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setAppliedCoupon({
          code: couponCode,
          discount: data.discount_percentage || 0
        });
        setMessage({
          type: 'success',
          content: `${t('Coupon applied')}: ${data.discount_percentage}% ${t('discount')}`
        });
      } else {
        setError(data.message || t('Invalid coupon code'));
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error('Error validating coupon:', err);
      setError(t('Failed to validate coupon. Please try again.'));
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Remove applied coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setMessage(null);
  };

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    
    // Required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone'];
    requiredFields.forEach(field => {
      if (!formData[field]) {
        errors[field] = `${t('This field is required')}`;
      }
    });
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('Please enter a valid email address');
    }
    
    // Phone validation
    if (formData.phone && !/^\+?[\d\s-]{8,15}$/.test(formData.phone)) {
      errors.phone = t('Please enter a valid phone number');
    }
    
    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 'plan-selection') {
      // Move to payment details step if plan is selected
      if (selectedPlan) {
        setStep('payment-details');
        return;
      } else {
        setError(t('Please select a subscription plan'));
        return;
      }
    }
    
    // Validate form
    setIsProcessing(true);
    setError('');
    setMessage(null);
    
    try {
      // Validate form data
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setIsProcessing(false);
        return;
      }
      
      // Generate unique transaction ID for tracking
      const transactionId = `SUB-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Step 1: First create the subscription record
      setMessage({
        type: 'processing',
        content: t('Creating your subscription...')
      });
      
      console.log('Creating subscription with transaction ID:', transactionId);
      
      const subscriptionResponse = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          transaction_id: transactionId,
          customer_info: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone
          },
          payment_info: {
            amount: parseFloat(calculateTotal()),
            currency: 'SAR'
          },
          promo_code: appliedCoupon?.code || couponCode || null,
          discount_percentage: appliedCoupon?.discount || discount || 0,
          subscription_type: subscriptionType,
          status: 'pending',
          origin: origin || window.location.origin
        })
      });
      
      let subscriptionData;
      try {
        subscriptionData = await subscriptionResponse.json();
      } catch (parseError) {
        console.error('Error parsing subscription response:', parseError);
        throw new Error(t('Could not parse subscription creation response'));
      }
      
      if (!subscriptionResponse.ok) {
        console.error('Error creating subscription:', subscriptionData);
        throw new Error(subscriptionData.message || t('Failed to create subscription'));
      }
      
      console.log('Subscription created successfully:', subscriptionData);
      
      // Get the subscription ID from the response
      const subscriptionId = subscriptionData?.subscription?.id || 
                           subscriptionData?.id || 
                           subscriptionData?.subscriptionId;
      
      if (!subscriptionId) {
        throw new Error(t('Failed to get subscription ID from response'));
      }
      
      // Create a callback URL that includes both transaction ID and subscription ID
      const callbackUrl = `${origin || window.location.origin}/dashboard/client/subscriptions/checkout?status=success&txn_id=${transactionId}&sub_id=${subscriptionId}`;
      
      // Use the origin from props or window.location.origin
      const originUrl = origin || window.location.origin;
      
      // Step 2: Create the payment invoice using Paylink
      setMessage({
        type: 'processing',
        content: t('Connecting to payment gateway...')
      });
      
      console.log('Creating Paylink invoice for subscription:', subscriptionId);
      
      // Build a simplified payload for Paylink to minimize potential issues
      const invoicePayload = {
        subscriptionId,
        callbackUrl,
        amount: parseFloat(calculateTotal()),
        customerInfo: {
          clientName: `${formData.firstName} ${formData.lastName}`,
          clientEmail: formData.email,
          clientMobile: formData.phone
        },
        orderNumber: transactionId,
        products: [{
          title: `${selectedPlan.name} ${t('Subscription')} - ${subscriptionType === 'monthly' ? t('Monthly') : t('Yearly')}`,
          price: parseFloat(selectedPlan.price),
          qty: 1,
          description: `${selectedPlan.name} ${t('plan')} - ${subscriptionType === 'monthly' ? t('monthly') : t('yearly')} ${t('billing')}`
        }],
        // Add origin to the request payload for proper URL construction
        origin: originUrl
      };
      
      // Optional discount amount - only add if discount exists
      if (appliedCoupon?.discount || discount) {
        invoicePayload.discountAmount = selectedPlan.price * ((appliedCoupon?.discount || discount) / 100);
      }
      
      console.log('Sending invoice payload:', invoicePayload);
      
      const directInvoiceResponse = await fetch('/api/paylink/direct-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoicePayload)
      });
      
      // Parse the response
      let invoiceData;
      try {
        invoiceData = await directInvoiceResponse.json();
        console.log('Paylink invoice response:', invoiceData);
      } catch (error) {
        throw new Error(t('Failed to parse payment gateway response'));
      }
      
      // Check if the invoice creation was successful
      if (!directInvoiceResponse.ok) {
        throw new Error(invoiceData.message || invoiceData.error || t('Failed to create payment invoice'));
      }
      
      // Extract payment URL from the response
      // The response structure might vary, so we need to handle different formats
      if (!invoiceData.paymentUrl && !invoiceData.url && !invoiceData.data?.url) {
        console.error('Invalid payment gateway response:', invoiceData);
        throw new Error(t('Payment URL is missing from the response. Please try again.'));
      }
      
      // Get the payment URL from wherever it exists in the response
      const paymentUrl = invoiceData.paymentUrl || invoiceData.url || invoiceData.data?.url;
      
      // Get the invoice ID from the response
      // The response structure might vary, so we need to handle different formats
      const invoiceId = invoiceData.invoiceId || 
                      invoiceData.id || 
                      invoiceData.data?.id || 
                      invoiceData.data?.invoiceId;
      
      if (!invoiceId) {
        throw new Error(t('Invoice ID is missing from the response. Please try again.'));
      }
      
      // Skip these database updates - they're now handled directly by the direct-invoice endpoint
      // This reduces the potential for database errors in the client-side code
      console.log('Payment URL generated successfully:', paymentUrl);
      
      // Store transaction and payment intent information in sessionStorage for retrieval after payment
      sessionStorage.setItem('paylink_transaction', JSON.stringify({
        transaction_id: transactionId,
        payment_intent_id: invoiceData.paymentIntentId || invoiceData.id,
        invoice_id: invoiceId,
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        subscription_type: subscriptionType,
        amount: calculateTotal(),
        discount: appliedCoupon?.discount || 0,
        timestamp: new Date().toISOString()
      }));
      
      // Update UI to show processing message - NOT success yet
      setMessage({
        type: 'processing',
        content: t('Preparing payment gateway... You will be redirected to complete your payment.')
      });
      
      console.log('Redirecting to payment URL:', paymentUrl);
      
      // Store a backup of the payment URL in localStorage in case the redirect fails
      try {
        localStorage.setItem('last_payment_url', paymentUrl);
        localStorage.setItem('last_payment_timestamp', new Date().toISOString());
      } catch (storageError) {
        console.warn('Failed to store payment URL in localStorage:', storageError);
      }
      
      // Short delay before redirect to allow user to see the success message
      setTimeout(() => {
        try {
          // Use a full page redirect to the payment URL
          window.location.href = paymentUrl;
        } catch (redirectError) {
          console.error('Error redirecting to payment URL:', redirectError);
          setMessage({
            type: 'error',
            content: t('Failed to redirect to payment page. Please try again.')
          });
        }
      }, 1500);
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.message || t('An error occurred during checkout. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

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
        bgColor = 'bg-green-50 dark:bg-green-900/20';
        textColor = 'text-green-800 dark:text-green-200';
        break;
      case 'error':
        icon = <FaExclamationCircle className="text-red-500" size={24} />;
        bgColor = 'bg-red-50 dark:bg-red-900/20';
        textColor = 'text-red-800 dark:text-red-200';
        break;
      case 'processing':
        icon = <FaSpinner className="text-blue-500 animate-spin" size={24} />;
        bgColor = 'bg-blue-50 dark:bg-blue-900/20';
        textColor = 'text-blue-800 dark:text-blue-200';
        break;
      default:
        bgColor = 'bg-gray-50 dark:bg-gray-800';
        textColor = 'text-gray-800 dark:text-gray-200';
    }
    
    return (
      <div className={`${bgColor} p-4 rounded-lg mb-6 flex items-center`}>
        {icon && <div className="mr-3">{icon}</div>}
        <div className={`${textColor}`}>{content}</div>
      </div>
    );
  };

  // Render plan selection step
  const renderPlanSelection = () => {
    return (
      <div className="plan-selection">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
          {language === 'ar' ? 'اختر خطة الاشتراك الخاصة بك' : 'Choose your subscription plan'}
        </h2>
        
        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan?.id === plan.id}
              onSelect={handlePlanSelect}
              subscriptionType={subscriptionType}
              isRtl={isRtl}
              language={language}
            />
          ))}
        </div>
        
        {/* Continue button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleSubmit}
            disabled={!selectedPlan || isProcessing}
            className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                {t('Processing')}...
              </>
            ) : (
              <>
                {language === 'ar' ? 'المتابعة إلى الدفع' : 'Continue to Payment'}
                <MdPayment className="ml-2" size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Render payment details step
  const renderPaymentDetails = () => {
    return (
      <div className="payment-details">
        <button
          onClick={() => setStep('plan-selection')}
          className="mb-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center"
        >
          ← {language === 'ar' ? 'العودة إلى اختيار الخطة' : 'Back to Plan Selection'}
        </button>
        

        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Order summary */}
          <div className="lg:w-1/3">
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                {language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
              </h3>
              
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-300">{selectedPlan?.name}</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {selectedPlan?.price.toFixed(2)} {t('SAR')}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {subscriptionType === 'monthly' ? (language === 'ar' ? 'اشتراك شهري' : 'Monthly subscription') : (language === 'ar' ? 'اشتراك سنوي' : 'Yearly subscription')}
                </div>
              </div>
              
              {/* Coupon code */}
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                {appliedCoupon ? (
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <FaPercent size={14} className="mr-1" />
                        <span className="font-medium">{language === 'ar' ? 'كوبون' : 'Coupon'}: {appliedCoupon.code}</span>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                      >
                        {language === 'ar' ? 'إزالة' : 'Remove'}
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">{language === 'ar' ? 'خصم' : 'Discount'}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        -{(selectedPlan?.price * (appliedCoupon.discount / 100)).toFixed(2)} {t('SAR')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex">
                    <input
                      type="text"
                      placeholder={t('Promo code')}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApplyingCoupon ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        t('Apply')
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Total */}
              <div className="flex justify-between font-bold text-lg">
                <span className="text-gray-800 dark:text-white">{language === 'ar' ? 'المجموع' : 'Total'}</span>
                <span className="text-gray-800 dark:text-white">
                  {calculateTotal()} {language === 'ar' ? 'ر.س.' : 'SAR'}
                </span>
              </div>
              
              <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <MdLock className="mr-1" />
                {language === 'ar' ? 'دفع آمن بواسطة Paylink' : 'Secure payment processed by Paylink'}
              </div>
            </div>
          </div>
          
          {/* Payment form */}
          <div className="lg:w-2/3">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {language === 'ar' ? 'معلومات العميل' : 'Customer Information'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1" htmlFor="firstName">
                    {language === 'ar' ? 'الاسم الأول' : 'First Name'} *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      formErrors.firstName ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {typeof formErrors.firstName === 'object' ? (language === 'ar' ? 'هذا الحقل مطلوب' : 'This field is required') : formErrors.firstName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1" htmlFor="lastName">
                    {language === 'ar' ? 'اسم العائلة' : 'Last Name'} *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      formErrors.lastName ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {typeof formErrors.lastName === 'object' ? (language === 'ar' ? 'هذا الحقل مطلوب' : 'This field is required') : formErrors.lastName}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'} *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      formErrors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {typeof formErrors.email === 'object' ? (language === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address') : formErrors.email}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1" htmlFor="phone">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone'} *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      formErrors.phone ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {typeof formErrors.phone === 'object' ? (language === 'ar' ? 'يرجى إدخال رقم هاتف صالح' : 'Please enter a valid phone number') : formErrors.phone}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-8 mb-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {language === 'ar' ? 'سيتم إعادة توجيهك إلى بوابة الدفع الآمنة لإكمال عملية الدفع' : 'You will be redirected to our secure payment gateway to complete your payment'}
                </p>
                <div className="flex justify-center items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <MdSecurity size={20} />
                  <span>{language === 'ar' ? 'جميع المدفوعات آمنة ومشفرة' : 'All payments are secure and encrypted'}</span>
                </div>
              </div>
              
              {/* Submit button */}
              <div className="flex justify-center mt-8">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      {language === 'ar' ? 'جاري المعالجة' : 'Processing'}...
                    </>
                  ) : (
                    <>
                      {language === 'ar' ? 'إتمام الدفع' : 'Complete Payment'}
                      <FaCreditCard className="ml-2" size={20} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="checkout-container w-full max-w-6xl mx-auto p-4 md:p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-800/30"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Display error message if any */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6 flex items-center">
          <FaExclamationCircle className="text-red-500 mr-3" size={24} />
          <div className="text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}
      
      {/* Display success/processing message if any */}
      {renderMessage()}
      
      {/* Render different steps based on current step */}
      {step === 'plan-selection' ? renderPlanSelection() : renderPaymentDetails()}
    </div>
  );
};

export default EnhancedCheckoutForm;
