import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCreditCard, FaCheckCircle, FaExclamationCircle, FaSpinner, FaRegCreditCard } from 'react-icons/fa';
import { MdLock, MdPayment, MdSecurity } from 'react-icons/md';

const CheckoutForm = ({ 
  plans = [],
  subscriptionType = 'monthly',
  promoCode = '',
  discount = 0,
  origin = ''
}) => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    country: '',
    address: '',
    city: '',
    postalCode: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState(promoCode || '');
  const [appliedCoupon, setAppliedCoupon] = useState(promoCode ? { code: promoCode, discount } : null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Set default selected plan to first plan
  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlan) {
      setSelectedPlan(plans[0]);
      console.log('Selected default plan:', plans[0]);
    }
  }, [plans, selectedPlan]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Apply formatting for card number
    if (name === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    }
    
    // Apply formatting for expiry date
    if (name === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    
    // Clear the error for this field when user starts typing
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
    console.log('Selected plan:', plan);
    
    // Update the URL with the selected plan ID for better user flow
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('plan', plan.id);
      window.history.replaceState({}, '', url);
    }
    
    // Clear any previous error messages
    setMessage(null);
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (basic)
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9+ \-()]{8,}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    // Card validation
    if (!formData.cardNumber.trim()) {
      errors.cardNumber = 'Card number is required';
    } else if (formData.cardNumber.replace(/\s+/g, '').length < 16) {
      errors.cardNumber = 'Please enter a valid card number';
    }
    
    if (!formData.expiryDate.trim()) {
      errors.expiryDate = 'Expiry date is required';
    } else if (!/^[0-9]{2}\/[0-9]{2}$/.test(formData.expiryDate)) {
      errors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    }
    
    if (!formData.cvv.trim()) {
      errors.cvv = 'CVV is required';
    } else if (!/^[0-9]{3,4}$/.test(formData.cvv)) {
      errors.cvv = 'Please enter a valid CVV';
    }
    
    return errors;
  };

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry date
  const formatExpiryDate = (value) => {
    const v = value.replace(/\\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length >= 3) {
      return `${v.substring(0, 2)}/${v.substring(2)}`;
    }
    return v;
  };

  // Handle coupon code input changes
  const handleCouponChange = (e) => {
    setCouponCode(e.target.value);
  };

  // Calculate the total amount to pay
  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    const discountAmount = selectedPlan.price * ((appliedCoupon?.discount || discount) / 100);
    return (selectedPlan.price - discountAmount).toFixed(2);
  };
  
  // Validate and apply coupon code
  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    try {
      // Call your API to validate the coupon
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: couponCode.trim() })
      });
      
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setAppliedCoupon({
          code: couponCode,
          discount: data.discount
        });
        setMessage({
          type: 'success',
          content: `Coupon applied! You got ${data.discount}% off.`
        });
      } else {
        setAppliedCoupon(null);
        setMessage({
          type: 'error',
          content: data.message || 'Invalid coupon code.'
        });
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setMessage({
        type: 'error',
        content: 'Failed to validate coupon. Please try again.'
      });
    } finally {
      setIsApplyingCoupon(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Handle form submission
  const handleCheckout = async (e) => {
    e.preventDefault();
    
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
        content: 'Creating your subscription...'
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
          promo_code: appliedCoupon?.code || promoCode || null,
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
        throw new Error('Could not parse subscription creation response');
      }
      
      if (!subscriptionResponse.ok) {
        console.error('Error creating subscription:', subscriptionData);
        throw new Error(subscriptionData.message || 'Failed to create subscription');
      }
      
      console.log('Subscription created successfully:', subscriptionData);
      
      // Get the subscription ID from the response
      const subscriptionId = subscriptionData?.subscription?.id || 
                           subscriptionData?.id || 
                           subscriptionData?.subscriptionId;
      
      if (!subscriptionId) {
        throw new Error('Failed to get subscription ID from response');
      }
      
      // Create a callback URL that includes both transaction ID and subscription ID
      const originUrl = origin || window.location.origin;
      let callbackUrl = `${originUrl}/api/paylink/callback?txn_id=${transactionId}&subscription_id=${subscriptionId}`;
      
      // Fix any double slashes that aren't part of the protocol
      callbackUrl = callbackUrl.replace(/([^:\/])\/+/g, "$1/");
      
      // Create the Paylink invoice using the subscription ID
      setMessage({
        type: 'processing',
        content: 'Connecting to payment gateway...'
      });
      
      // Step 2: Create the payment invoice using Paylink
      setMessage({
        type: 'processing',
        content: 'Connecting to payment gateway...'
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
          title: `${selectedPlan.name} Subscription - ${subscriptionType}`,
          price: parseFloat(selectedPlan.price),
          qty: 1,
          description: `${selectedPlan.name} plan - ${subscriptionType} billing`
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
      } catch (jsonError) {
        console.error('Failed to parse payment gateway response:', jsonError);
        const rawText = await directInvoiceResponse.text().catch(() => 'Unable to read response');
        throw new Error(`Payment gateway returned invalid response: ${rawText.substring(0, 100)}...`);
      }
      
      // Handle error responses
      if (!directInvoiceResponse.ok) {
        throw new Error(
          invoiceData.message || 
          invoiceData.error || 
          `Payment gateway error (${directInvoiceResponse.status}): ${directInvoiceResponse.statusText}`
        );
      }
      
      // Validate response contains required data
      if (!invoiceData.paymentUrl) {
        throw new Error('Payment URL is missing from the response. Please try again.');
      }
      
      // Get the invoice ID - handle different response formats
      const invoiceId = invoiceData.invoiceId || invoiceData.id || invoiceData.transactionNo;
      
      if (!invoiceId) {
        throw new Error('Invoice ID is missing from the response. Please try again.');
      }
      
      // Skip these database updates - they're now handled directly by the direct-invoice endpoint
      // This reduces the potential for database errors in the client-side code
      console.log('Payment URL generated successfully:', invoiceData.paymentUrl);
      
      // Store transaction information in sessionStorage for retrieval after payment
      sessionStorage.setItem('paylink_transaction', JSON.stringify({
        transaction_id: transactionId,
        subscription_id: subscriptionId,
        invoice_id: invoiceId,
        plan_name: selectedPlan.name,
        amount: parseFloat(calculateTotal()),
        currency: 'SAR',
        timestamp: new Date().toISOString()
      }));
      
      // Show success message to user
      setMessage({
        type: 'success',
        content: 'Subscription created! Redirecting to payment gateway...'
      });
      
      console.log('Redirecting to payment URL:', invoiceData.paymentUrl);
      
      // Store a backup of the payment URL in localStorage in case the redirect fails
      try {
        localStorage.setItem('last_payment_url', invoiceData.paymentUrl);
        localStorage.setItem('last_payment_timestamp', new Date().toISOString());
      } catch (storageError) {
        console.warn('Failed to store payment URL in localStorage:', storageError);
      }
      
      // Short delay before redirect to allow user to see the success message
      setTimeout(() => {
        try {
          // Use a full page redirect to the payment URL
          window.location.href = invoiceData.paymentUrl;
        } catch (redirectError) {
          console.error('Error redirecting to payment URL:', redirectError);
          setMessage({
            type: 'error',
            content: 'Failed to redirect to payment page. Please try again.'
          });
        }
      }, 1500);
    } catch (error) {
      console.error('Checkout error:', error);
      setMessage({
        type: 'error',
        content: error.message || 'An error occurred during checkout. Please try again.'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">Complete Your Order</h2>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md flex items-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.type === 'success' ? (
            <FaCheckCircle className="mr-3 flex-shrink-0" />
          ) : (
            <FaSpinner className="mr-3 animate-spin flex-shrink-0" />
          )}
          <span>{message.content}</span>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 rounded-md flex items-center bg-red-100 text-red-800">
          <FaExclamationCircle className="mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 order-1 lg:order-1">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Select Your Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {plans && plans.length > 0 ? (
              plans.map(plan => (
                <div 
                  key={plan.id}
                  className={`rounded-lg border p-5 cursor-pointer transition-all duration-200 ${selectedPlan?.id === plan.id 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}
                  onClick={() => handlePlanSelect(plan)}
                >
                  <h4 className="font-bold text-lg text-gray-800">{plan.name}</h4>
                  <div className="my-3 text-2xl font-bold text-blue-600">
                    ${plan.price}
                    <span className="text-sm font-normal text-gray-500 ml-1">/ {subscriptionType}</span>
                  </div>
                  <div className="mt-3 mb-4">
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Access to {plan.name} features</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{plan.name === 'Basic' ? '5' : plan.name === 'Premium' ? '15' : '50'} project uploads</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{plan.name === 'Basic' ? 'Email' : 'Priority'} support</span>
                      </li>
                      {plan.name !== 'Basic' && (
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Advanced analytics</span>
                        </li>
                      )}
                      {plan.name === 'Enterprise' && (
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Custom integrations</span>
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className={`mt-4 text-center py-2 px-4 rounded-md font-medium ${selectedPlan?.id === plan.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                    {selectedPlan?.id === plan.id ? 'Selected' : 'Select Plan'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 border border-gray-200 rounded-lg bg-gray-50 text-center">
                <p className="text-gray-600">No subscription plans available at the moment. Please check back later.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-3 order-2 lg:order-2">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <MdPayment className="mr-2 text-blue-600" size={22} />
              Payment Details
            </h3>
            <form onSubmit={handleCheckout}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${formErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {formErrors.firstName && <div className="text-red-600 text-sm mt-1">{formErrors.firstName}</div>}
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${formErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {formErrors.lastName && <div className="text-red-600 text-sm mt-1">{formErrors.lastName}</div>}
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${formErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {formErrors.email && <div className="text-red-600 text-sm mt-1">{formErrors.email}</div>}
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${formErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {formErrors.phone && <div className="text-red-600 text-sm mt-1">{formErrors.phone}</div>}
                </div>
              </div>
              
              <div className="my-6 border-t border-gray-200 pt-4">
                <h4 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                  <MdSecurity className="mr-2 text-blue-600" size={20} />
                  Payment Information
                  <span className="ml-2 flex items-center text-xs bg-gray-100 text-gray-600 py-1 px-2 rounded-full">
                    <MdLock className="mr-1" size={12} /> Secure
                  </span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">Card Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCreditCard className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="cardNumber"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        maxLength="19"
                        placeholder="1234 5678 9012 3456"
                        className={`w-full p-3 pl-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${formErrors.cardNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      />
                    </div>
                    {formErrors.cardNumber && <div className="text-red-600 text-sm mt-1">{formErrors.cardNumber}</div>}
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input
                      type="text"
                      id="expiryDate"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      maxLength="5"
                      placeholder="MM/YY"
                      className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${formErrors.expiryDate ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.expiryDate && <div className="text-red-600 text-sm mt-1">{formErrors.expiryDate}</div>}
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="cvv" className="block text-sm font-medium text-gray-700">CVV</label>
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      value={formData.cvv}
                      onChange={handleInputChange}
                      maxLength="4"
                      placeholder="123"
                      className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${formErrors.cvv ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.cvv && <div className="text-red-600 text-sm mt-1">{formErrors.cvv}</div>}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">{selectedPlan?.name} Plan</span>
                  <span className="font-medium">${selectedPlan?.price}</span>
                </div>
                
                {/* Coupon Section */}
                <div className="my-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Have a coupon?</h4>
                  <div className="flex">
                    <input
                      type="text"
                      className="flex-grow p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={handleCouponChange}
                    />
                    <button
                      type="button"
                      className={`px-4 py-2 rounded-r-md font-medium ${isApplyingCoupon || !couponCode.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      onClick={validateCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                    >
                      {isApplyingCoupon ? (
                        <span className="flex items-center">
                          <FaSpinner className="animate-spin mr-1" size={14} />
                          Applying
                        </span>
                      ) : 'Apply'}
                    </button>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="mt-2 text-sm flex items-center text-green-600">
                      <FaCheckCircle className="mr-1" size={14} />
                      <span>Coupon &quot;{appliedCoupon.code}&quot; applied: {appliedCoupon.discount}% off</span>
                    </div>
                  )}
                </div>
                
                {(appliedCoupon || discount > 0) && (
                  <div className="flex justify-between items-center py-2 text-green-600">
                    <span>Discount</span>
                    <span>-${(selectedPlan?.price * ((appliedCoupon?.discount || discount) / 100)).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-3 border-t border-gray-200 mt-2 font-bold text-lg">
                  <span>Total</span>
                  <span>${calculateTotal()}</span>
                </div>
                
                {promoCode && (
                  <div className="mt-2 p-2 bg-blue-50 text-blue-700 text-sm rounded-md">
                    Promo code <span className="font-medium">{promoCode}</span> applied!
                  </div>
                )}
              </div>
              
              <button 
                type="submit" 
                className={`w-full mt-6 py-3 px-4 rounded-md font-semibold text-white ${isLoading || isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 transition-colors'}`}
                disabled={isLoading || isProcessing}
              >
                {isLoading || isProcessing ? (
                  <span className="flex items-center justify-center">
                    <FaSpinner className="animate-spin mr-2" />
                    Processing Payment...
                  </span>
                ) : 'Complete Payment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutForm;
