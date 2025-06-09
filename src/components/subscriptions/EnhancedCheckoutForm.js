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
  user = null,
  renderPeriodSelector = null
}) => {
  const router = useRouter();
  
  // Log the subscription type received from props
  console.log('EnhancedCheckoutForm received subscriptionType:', subscriptionType);

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
      if (selectedPlan) {
        setStep('payment-details');
        return;
      } else {
        setError(t('Please select a subscription plan'));
        return;
      }
    }
    
    // Validate form for payment step
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Start processing payment
    setIsProcessing(true);
    setError('');
    
    try {
      // Prepare data for payment processing
      const paymentData = {
        plan_id: selectedPlan?.id,
        subscription_type: subscriptionType, // Ensure subscription type is passed
        amount: calculateTotal(),
        user: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          postal_code: formData.postalCode
        },
        promo_code: appliedCoupon?.code || '',
        discount: appliedCoupon?.discount || 0,
        // Include callback URLs with subscription type parameter
        success_url: `${origin}/dashboard/client/subscriptions/success?subscriptionType=${subscriptionType}`,
        cancel_url: `${origin}/dashboard/client/subscriptions/cancel?subscriptionType=${subscriptionType}`,
        // Include metadata with subscription type for payment gateway
        metadata: {
          subscriptionType: subscriptionType
        }
      };
      
      console.log('Payment data:', paymentData);
      
      const transactionId = `SUB-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;      
      // Clean plan name for consistent identification
      const cleanPlanName = selectedPlan.name;
      // Ensure we have the exact plan ID
      const exactPlanId = selectedPlan.id;
      
      setMessage({
        type: 'processing',
        content: t('Connecting to payment gateway...')
      });

      // Calculate the total price with any applicable discounts
      const totalAmount = parseFloat(calculateTotal());
      
      console.log('CHECKOUT FORM VALUES:', {
        subscriptionType: subscriptionType,
        planId: exactPlanId,
        amount: totalAmount
      });
      
      // Include plan details directly in the callback URL to ensure they're always available
      const callbackUrlWithPlanDetails = `${origin || window.location.origin}/dashboard/client/subscriptions/checkout?status=success&txn_id=${transactionId}&planId=${encodeURIComponent(exactPlanId)}&planName=${encodeURIComponent(cleanPlanName)}&subscriptionType=${encodeURIComponent(subscriptionType)}&amount=${encodeURIComponent(totalAmount)}`;
      
      console.log('Including plan details in callback URL:', { 
        planId: exactPlanId, 
        planName: cleanPlanName,
        subscriptionType: subscriptionType,
        amount: totalAmount
      });
      
      const invoicePayload = {
        subscriptionId: exactPlanId, // Use the exactPlanId to ensure consistency
        callbackUrl: callbackUrlWithPlanDetails,
        amount: totalAmount,
        customerInfo: {
          clientName: `${formData.firstName} ${formData.lastName}`,
          clientEmail: formData.email,
          clientMobile: formData.phone
        },
        orderNumber: transactionId,
        products: [{
          title: `${cleanPlanName} ${t('Subscription')} - ${subscriptionType === 'monthly' ? t('Monthly') : t('Yearly')}`,
          price: parseFloat(selectedPlan.price),
          qty: 1,
          description: `${cleanPlanName} ${t('plan')} - ${subscriptionType === 'monthly' ? t('monthly') : t('yearly')} ${t('billing')}`
        }],
        origin: origin || window.location.origin,
        // Include additional metadata to ensure plan details are preserved
        metadata: {
          exactPlanName: cleanPlanName,
          exactPlanId: exactPlanId,
          subscriptionType: subscriptionType,
          amount: totalAmount
        },
        // Also include at the top level for APIs that might not check metadata
        subscriptionType: subscriptionType,
        planName: cleanPlanName,
        planId: exactPlanId
      };
      
      console.log('Sending invoice payload with subscription details:', {
        subscriptionType: subscriptionType,
        amount: totalAmount,
        planId: exactPlanId
      });
      
      if (appliedCoupon?.discount || discount) {
        invoicePayload.discountAmount = selectedPlan.price * ((appliedCoupon?.discount || discount) / 100);
      }
      
      const directInvoiceResponse = await fetch('/api/paylink/direct-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoicePayload)
      });
      
      let invoiceData;
      try {
        // Check if the response is valid before trying to parse it
        const responseText = await directInvoiceResponse.text();
        console.log('Raw response from direct-invoice:', responseText);
        
        try {
          // Try to parse the JSON response
          invoiceData = JSON.parse(responseText);
          console.log('Parsed Paylink invoice response:', invoiceData);
          
          if (directInvoiceResponse.ok && invoiceData.success) {
            // Verify the payment URL exists
            if (!invoiceData.paymentUrl) {
              console.error('Error: Missing paymentUrl in successful response', invoiceData);
              throw new Error(t('Missing payment URL in response'));
            }
            
            // Redirect to Paylink's payment page
            console.log('Redirecting to payment URL:', invoiceData.paymentUrl);
            window.location.href = invoiceData.paymentUrl;
          } else {
            console.error('Error in Paylink response:', invoiceData);
            throw new Error(invoiceData.message || t('Payment initiation failed'));
          }
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError, 'Response was:', responseText);
          throw new Error(t('Failed to parse payment response'));
        }
      } catch (error) {
        console.error('Payment API error:', error);
        throw error;
      }
    } catch (error) {
      setError(error.message);
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // We no longer need to handle Paylink callback here as subscription creation happens
  // server-side in the create-from-payment endpoint only after payment confirmation
  // This prevents premature subscription creation before payment is confirmed

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
        
        {/* Render period selector if provided */}
        {renderPeriodSelector && renderPeriodSelector()}
        
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
                <MdPayment className="rtl:mr-2 ltr:ml-2" size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderPaymentDetails = () => {
    return (
      <div className="payment-details rtl:text-right rtl:font-[Cairo]">
        <button
          onClick={() => setStep('plan-selection')}
          className="mb-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center rtl:flex-row-reverse"
        >
          ← {language === 'ar' ? 'العودة إلى اختيار الخطة' : 'Back to Plan Selection'}
        </button>

        <div className="flex flex-col lg:flex-row rtl:lg:flex-row-reverse gap-8">
          {/* Order summary */}
          <div className="lg:w-1/3">
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white rtl:text-right rtl:font-[Cairo]">
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
                  {language === 'ar' ? 'اشتراك شهري' : 'Monthly subscription'}
                </div>
              </div>

              {/* Coupon code */}
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                {appliedCoupon ? (
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center text-green-600 dark:text-green-400 rtl:flex-row-reverse">
                        <FaPercent size={14} className="rtl:ml-1 ltr:mr-1" />
                        <span className="font-medium">{language === 'ar' ? 'كوبون' : 'Coupon'}: {appliedCoupon.code}</span>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-500 hover:text-red-600 text-sm hover:underline rtl:mr-2 ltr:ml-2"
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
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 rtl:text-right" htmlFor="couponCode">
                      {language === 'ar' ? 'هل لديك كوبون؟' : 'Have a coupon?'}
                    </label>
                    <div className="flex ltr:flex-row rtl:flex-row">
                      {/* Apply button comes first in RTL mode */}
                      {language === 'ar' && (
                        <button
                          onClick={handleApplyCoupon}
                          disabled={isApplyingCoupon || !couponCode.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-[Cairo] rounded-r-lg rounded-l-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApplyingCoupon ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            'تطبيق'
                          )}
                        </button>
                      )}
                      
                      <input
                        type="text"
                        id="couponCode"
                        name="couponCode"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder={language === 'ar' ? 'أدخل الكوبون هنا' : 'Enter coupon code'}
                        className={`flex-1 px-4 py-2 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          language === 'ar' 
                            ? 'rounded-l-lg rounded-r-none border-r-0' 
                            : 'rounded-l-lg rounded-r-none border-r-0'
                        }`}
                      />
                      
                      {/* Apply button comes after input in LTR mode */}
                      {language !== 'ar' && (
                        <button
                          onClick={handleApplyCoupon}
                          disabled={isApplyingCoupon || !couponCode.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg rounded-l-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApplyingCoupon ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            'Apply'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="mt-6 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center rtl:flex-row-reverse">
                <span className="text-lg font-bold rtl:font-[Cairo] text-gray-800 dark:text-white">{language === 'ar' ? 'المجموع' : 'Total'}</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 rtl:font-[Cairo] rtl:ml-1 ltr:mr-1">
                    {calculateTotal()}
                  </span>
                  <span className="text-lg font-medium rtl:font-[Cairo] text-gray-600 dark:text-gray-300">
                    {language === 'ar' ? 'ر.س.' : 'SAR'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 flex items-center rtl:flex-row-reverse">
              <MdLock className="rtl:ml-1 ltr:mr-1" />
              <span className="rtl:font-[Cairo]">{language === 'ar' ? 'جميع المدفوعات آمنة ومشفرة' : 'All payments are secure and encrypted'}</span>
            </div>
          </div>

          {/* Payment form */}
          <div className="lg:w-2/3">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white rtl:text-right rtl:font-[Cairo]">
              {language === 'ar' ? 'معلومات العميل' : 'Customer Information'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1 rtl:text-right rtl:font-[Cairo]" htmlFor="firstName">
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
                  <label className="block text-gray-700 dark:text-gray-300 mb-1 rtl:text-right rtl:font-[Cairo]" htmlFor="lastName">
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
                  <label className="block text-gray-700 dark:text-gray-300 mb-1 rtl:text-right rtl:font-[Cairo]" htmlFor="email">
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
                  <label className="block text-gray-700 dark:text-gray-300 mb-1 rtl:text-right rtl:font-[Cairo]" htmlFor="phone">
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
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 rtl:text-right rtl:font-[Cairo]">
                  {language === 'ar' ? 'سيتم إعادة توجيهك إلى بوابة الدفع الآمنة لإكمال عملية الدفع' : 'You will be redirected to our secure payment gateway to complete your payment'}
                </p>
                <div className="flex justify-center items-center rtl:space-x-0 rtl:space-x-reverse ltr:space-x-2 text-gray-500 dark:text-gray-400 rtl:flex-row-reverse">
                  <MdSecurity size={20} className="rtl:ml-2 ltr:mr-0" />
                  <span className="rtl:font-[Cairo]">{language === 'ar' ? 'جميع المدفوعات آمنة ومشفرة' : 'All payments are secure and encrypted'}</span>
                </div>
              </div>

              {/* Submit button */}
              <div className="flex justify-center mt-8">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed rtl:font-[Cairo]"
                >
                  {isProcessing ? (
                    <>
                      <FaSpinner className="animate-spin rtl:ml-2 ltr:mr-2" />
                      {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      {language === 'ar' ? 'إتمام الدفع' : 'Complete Payment'}
                      <FaCreditCard className="rtl:mr-2 ltr:ml-2" size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* End of payment details form */}
        </div>
      </div>
    );
  };

  return (
    <div className="checkout-form-container rtl:text-right rtl:font-[Cairo]">
      {renderMessage()}
      
      {/* Render different steps based on current step */}
      {step === 'plan-selection' ? renderPlanSelection() : renderPaymentDetails()}
    </div>
  );
};

export default EnhancedCheckoutForm;
