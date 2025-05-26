'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import CurrencySymbol from './CurrencySymbol';

export default function CheckoutForm() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  
  // State for selected plan
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // State for form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    country: 'Saudi Arabia',
    phoneNumber: '',
    address: '',
    addressCont: '',
    city: '',
    province: '',
    zipCode: '',
    organization: '',
    taxId: ''
  });
  
  // State for payment method
  const [paymentMethod, setPaymentMethod] = useState('visa');
  
  // State for promo code
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeValid, setPromoCodeValid] = useState(false);
  const [promoCodeMessage, setPromoCodeMessage] = useState('');
  const [discount, setDiscount] = useState(0);
  
  // State for loading
  const [isLoading, setIsLoading] = useState(false);
  
  // State for form errors
  const [formErrors, setFormErrors] = useState({});
  
  // Calculate total amount
  const total = selectedPlan ? selectedPlan.price - discount : 0;
  
  // Load selected plan from session storage
  useEffect(() => {
    const storedPlan = sessionStorage.getItem('selectedPlan');
    if (storedPlan) {
      const parsedPlan = JSON.parse(storedPlan);
      console.log('Loaded plan from session storage:', parsedPlan);
      // Ensure subscription_type is set correctly
      if (!parsedPlan.subscription_type && parsedPlan.type) {
        parsedPlan.subscription_type = parsedPlan.type;
      }
      setSelectedPlan(parsedPlan);
    } else {
      // Redirect back to plans page if no plan is selected
      router.push('/dashboard/client/subscriptions');
    }
  }, [router]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };
  
  // Handle payment method selection
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
  };
  
  // Handle promo code validation
  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscriptions/promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promoCode,
          planId: selectedPlan?.id,
          subscriptionType: selectedPlan?.type
        })
      });
      
      const data = await response.json();
      
      if (data.valid) {
        setPromoCodeValid(true);
        setPromoCodeMessage(data.message);
        setDiscount(data.discountAmount);
      } else {
        setPromoCodeValid(false);
        setPromoCodeMessage(data.message);
        setDiscount(0);
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoCodeValid(false);
      setPromoCodeMessage(isRtl ? 'حدث خطأ أثناء التحقق من الرمز الترويجي' : 'Error validating promo code');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Validation function
  const validateFormData = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    // Make zipCode optional
    return errors;
  };

  // Handle checkout process
  const handleCheckout = async () => {
    const errors = validateFormData();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      console.error('Validation errors:', errors);
      alert('Please correct the errors in the form');
      return;
    }

    if (!selectedPlan) {
      alert('Please select a subscription plan');
      return;
    }
    
    setIsLoading(true);
    try {
      // Generate a unique transaction ID
      const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      
      // Generate a unique access ticket for WhatsApp bot
      const accessTicket = `WA-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      // Calculate total amount
      const totalAmount = selectedPlan.price - discount;
      
      // Use the exact subscription type from the selected plan
      let subscriptionType = selectedPlan.subscription_type || selectedPlan.type || 'yearly';
      console.log(`Using subscription type: ${subscriptionType} for checkout`);
      
      // Create subscription data to be sent to the API
      const subscriptionData = {
        planId: selectedPlan.id,
        subscriptionType: subscriptionType, // Use the correct subscription type
        amountPaid: totalAmount,
        discount: discount,
        paymentMethod: 'paylink', // Set payment method to Paylink.sa
        transactionId: transactionId,
        promoCode: promoCodeValid ? promoCode : null,
        // Additional data for UI and tracking
        planName: selectedPlan.name,
        billingInfo: {
          ...formData,
          fullName: `${formData.firstName} ${formData.lastName}`
        },
        accessTicket: accessTicket
      };
      
      // Create the initial subscription record
      const response = await fetch('/api/subscriptions/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Store subscription details in session storage for the success page
        const subscriptionDetails = {
          id: result.subscriptionId,
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          subscription_type: subscriptionType,
          amount_paid: totalAmount,
          discount_amount: discount,
          payment_method: 'paylink',
          transaction_id: transactionId,
          started_date: result.startDate,
          expired_date: result.expireDate,
          status: 'pending'
        };
        
        sessionStorage.setItem('subscriptionDetails', JSON.stringify(subscriptionDetails));
        
        try {
          // Create a dynamic callback URL that includes the transaction ID
          const callbackUrl = `${window.location.origin}/api/paylink/callback?txn_id=${transactionId}`;
          
          // Create Paylink.sa invoice using our API
          const paylinkResponse = await fetch('/api/paylink/addInvoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subscriptionId: result.subscriptionId,
              callbackUrl: callbackUrl
            })
          });
          
          if (paylinkResponse.ok) {
            const paylinkResult = await paylinkResponse.json();
            
            // Redirect to Paylink.sa payment page
            if (paylinkResult.paymentUrl) {
              console.log('Redirecting to Paylink payment page:', paylinkResult.paymentUrl);
              window.location.href = paylinkResult.paymentUrl;
            } else {
              // Fallback to our payment gateway if Paylink URL is not available
              const encodedPlanName = encodeURIComponent(selectedPlan.name);
              router.push(
                `/dashboard/client/subscriptions/payment-gateway?txn_id=${transactionId}&amount=${totalAmount.toFixed(2)}&plan_name=${encodedPlanName}`
              );
            }
          } else {
            // Handle Paylink error - fallback to our payment gateway
            console.error('Paylink invoice creation error:', await paylinkResponse.json());
            const encodedPlanName = encodeURIComponent(selectedPlan.name);
            router.push(
              `/dashboard/client/subscriptions/payment-gateway?txn_id=${transactionId}&amount=${totalAmount.toFixed(2)}&plan_name=${encodedPlanName}`
            );
          }
        } catch (paylinkError) {
          // If Paylink integration fails, fall back to our payment gateway
          console.error('Paylink integration error:', paylinkError);
          const encodedPlanName = encodeURIComponent(selectedPlan.name);
          router.push(
            `/dashboard/client/subscriptions/payment-gateway?txn_id=${transactionId}&amount=${totalAmount.toFixed(2)}&plan_name=${encodedPlanName}`
          );
        }
      } else {
        // Handle error
        const errorData = await response.json();
        alert(isRtl ? 'حدث خطأ أثناء إنشاء الاشتراك: ' + errorData.error : 'Error creating subscription: ' + errorData.error);
        console.error('Subscription creation error:', errorData);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(isRtl ? 'حدث خطأ أثناء معالجة الطلب' : 'An error occurred during checkout');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!selectedPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="py-6 px-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white mb-6">
          {isRtl ? 'إتمام الدفع' : 'Complete Checkout'}
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white mb-6">
                {isRtl ? 'معلومات الفوترة' : 'Billing Information'}
              </h2>
              
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                    {isRtl ? 'الاسم الأول' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full ${formErrors.firstName ? 'border-red-500' : ''}`}
                  />
                  {formErrors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>
                  )}
                </div>
                
                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                    {isRtl ? 'الاسم الأخير' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full ${formErrors.lastName ? 'border-red-500' : ''}`}
                  />
                  {formErrors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>
                  )}
                </div>
                
                {/* Country */}
                <div>
                  <label htmlFor="country" className="block text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                    {isRtl ? 'الدولة' : 'Country'}
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full"
                  >
                    <option value="Saudi Arabia">{isRtl ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</option>
                    <option value="Egypt">{isRtl ? 'مصر' : 'Egypt'}</option>
                    <option value="UAE">{isRtl ? 'الإمارات العربية المتحدة' : 'UAE'}</option>
                    <option value="Kuwait">{isRtl ? 'الكويت' : 'Kuwait'}</option>
                    <option value="Qatar">{isRtl ? 'قطر' : 'Qatar'}</option>
                  </select>
                </div>
                
                {/* Phone Number */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                    {isRtl ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full ${formErrors.phoneNumber ? 'border-red-500' : ''}`}
                  />
                  {formErrors.phoneNumber && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.phoneNumber}</p>
                  )}
                </div>
                
                {/* Address */}
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                    {isRtl ? 'العنوان' : 'Address'}
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full ${formErrors.address ? 'border-red-500' : ''}`}
                  />
                  {formErrors.address && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>
                  )}
                </div>
                
                {/* City */}
                <div>
                  <label htmlFor="city" className="block text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                    {isRtl ? 'المدينة' : 'City'}
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full ${formErrors.city ? 'border-red-500' : ''}`}
                  />
                  {formErrors.city && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.city}</p>
                  )}
                </div>
                
                {/* Province/State */}
                <div>
                  <label htmlFor="province" className="block text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                    {isRtl ? 'المحافظة / المنطقة' : 'Province / Region'}
                  </label>
                  <input
                    type="text"
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full"
                  />
                </div>
              </div>
              
              {/* Payment Method Selection */}
              <h3 className="text-lg font-bold font-cairo text-gray-900 dark:text-white mb-4">
                {isRtl ? 'طريقة الدفع' : 'Payment Method'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => handlePaymentMethodChange('visa')}
                  className={`p-4 border rounded-lg flex items-center justify-center h-20 ${
                    paymentMethod === 'visa' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Image 
                    src="/images/payment/visa.svg" 
                    alt="Visa" 
                    width={60} 
                    height={40} 
                    className="object-contain max-h-12"
                  />
                </button>
                
                <button
                  type="button"
                  onClick={() => handlePaymentMethodChange('mastercard')}
                  className={`p-4 border rounded-lg flex items-center justify-center h-20 ${
                    paymentMethod === 'mastercard' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Image 
                    src="/images/payment/mastercard.svg" 
                    alt="Mastercard" 
                    width={60} 
                    height={40} 
                    className="object-contain max-h-12"
                  />
                </button>
                
                <button
                  type="button"
                  onClick={() => handlePaymentMethodChange('mada')}
                  className={`p-4 border rounded-lg flex items-center justify-center h-20 ${
                    paymentMethod === 'mada' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Image 
                    src="/images/payment/mada.svg" 
                    alt="Mada" 
                    width={60} 
                    height={40} 
                    className="object-contain max-h-12"
                  />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => handlePaymentMethodChange('stcpay')}
                  className={`p-4 border rounded-lg flex items-center justify-center h-20 ${
                    paymentMethod === 'stcpay' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Image 
                    src="/images/payment/stcpay.svg" 
                    alt="STC Pay" 
                    width={60} 
                    height={40} 
                    className="object-contain max-h-12"
                  />
                </button>
                
                <button
                  type="button"
                  onClick={() => handlePaymentMethodChange('paypal')}
                  className={`p-4 border rounded-lg flex items-center justify-center h-20 ${
                    paymentMethod === 'paypal' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Image 
                    src="/images/payment/paypal.svg" 
                    alt="PayPal" 
                    width={60} 
                    height={40} 
                    className="object-contain max-h-12"
                  />
                </button>
                
                <button
                  type="button"
                  onClick={() => handlePaymentMethodChange('bank_transfer')}
                  className={`p-4 border rounded-lg flex items-center justify-center h-20 ${
                    paymentMethod === 'bank_transfer' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Image 
                    src="/images/payment/bank.svg" 
                    alt="Bank Transfer" 
                    width={60} 
                    height={40} 
                    className="object-contain max-h-12"
                  />
                </button>
              </div>
              
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo disabled:bg-blue-400 transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isRtl ? 'جاري المعالجة...' : 'Processing...'}
                  </>
                ) : (
                  isRtl ? 'إتمام الدفع' : 'Complete Payment'
                )}
              </button>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-6">
              <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
                {isRtl ? 'ملخص الطلب' : 'Order Summary'}
              </h2>
              
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-300 font-cairo">
                    {selectedPlan.name}
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    <CurrencySymbol /> {selectedPlan.price.toFixed(2)}
                  </span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between mb-2 text-green-600 dark:text-green-400">
                    <span className="font-cairo">
                      {isRtl ? 'خصم' : 'Discount'}
                    </span>
                    <span>
                      - <CurrencySymbol /> {discount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                <div className={`flex justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="text-lg font-bold text-gray-900 dark:text-white font-cairo">
                    {isRtl ? 'الإجمالي المقدر' : 'Est. Total'}
                  </span>
                  <span className={`text-lg font-bold text-gray-900 dark:text-white flex items-center ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                    <CurrencySymbol className="text-sm" />
                    <span>{total.toFixed(2)}</span>
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                  {isRtl ? 'هل لديك رمز ترويجي؟' : 'Have a promo code?'}
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className={`flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 ${isRtl ? 'rounded-r-md' : 'rounded-l-md'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    placeholder={isRtl ? 'أدخل الرمز' : 'Enter code'}
                  />
                  <button
                    type="button"
                    onClick={validatePromoCode}
                    disabled={isLoading || !promoCode.trim()}
                    className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium ${isRtl ? 'rounded-l-md' : 'rounded-r-md'} shadow-sm font-cairo disabled:bg-blue-400`}
                  >
                    {isRtl ? 'تطبيق' : 'Apply'}
                  </button>
                </div>
                {promoCodeMessage && (
                  <p className={`mt-2 text-sm ${promoCodeValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {promoCodeMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
