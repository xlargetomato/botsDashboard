"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/config';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';

export default function ConnectWhatsAppPage() {
  const { botId } = useParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [qrCode, setQrCode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(
    isRtl ? 'جاري تجهيز اتصال واتساب...' : 'Preparing WhatsApp connection...'
  );
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);
  const [botName, setBotName] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const fetchingRef = useRef(false);
  
  // Function to fetch WhatsApp status and QR code
  const fetchStatus = async () => {
    // Prevent multiple simultaneous requests
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    try {
      setIsLoading(true);
      
      // First fetch the status to get bot info and connection state
      const statusResponse = await fetch(`/api/bots/${botId}/status`);
      const statusData = await statusResponse.json();
      
      // Save bot name for display
      if (statusData.name) {
        setBotName(statusData.name);
      }
      
      // Check if already connected
      if (statusData.whatsapp_connected) {
        setIsConnected(true);
        setStatusMessage(
          isRtl ? 'واتساب متصل بالفعل!' : 'WhatsApp already connected!'
        );
        setIsLoading(false);
        
        // Redirect back to bot page after a delay
        setTimeout(() => {
          router.push(`/dashboard/client/bots/${botId}`);
        }, 2000);
        return;
      }
      
      // If we have a QR code directly in the status, use it
      if (statusData.qrCode) {
        setQrCode(statusData.qrCode);
        setStatusMessage(
          isRtl ? 'امسح رمز QR هذا باستخدام تطبيق واتساب على هاتفك' : 'Scan this QR code with WhatsApp on your phone'
        );
        setIsLoading(false);
        setRetryCount(0); // Reset retry count on success
        startPolling();
        return;
      }
      
      // If we need to force reconnection
      if (statusData.connection_state?.needsReconnect) {
        // Try to reconnect
        setStatusMessage(
          isRtl ? 'جاري إعادة الاتصال بواتساب...' : 'Reconnecting to WhatsApp...'
        );
        
        try {
          const reconnectResponse = await fetch(`/api/bots/${botId}/connect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!reconnectResponse.ok) {
            throw new Error('Failed to reconnect');
          }
          
          // Wait a bit then fetch QR code
          setTimeout(() => {
            fetchingRef.current = false;
            fetchStatus();
          }, 3000);
          return;
        } catch (reconnectError) {
          setError(
            isRtl ? 'فشل إعادة الاتصال: ' + reconnectError.message : 'Failed to reconnect: ' + reconnectError.message
          );
          setIsLoading(false);
          return;
        }
      }
      
      // If we need QR code
      if (statusData.connection_state?.needsQrScan) {
        // Try to fetch the QR code separately
        try {
          const qrResponse = await fetch(`/api/bots/${botId}/qr`);
          const qrData = await qrResponse.json();
          
          if (qrData.qr) {
            setQrCode(qrData.qr);
            setStatusMessage(
              isRtl ? 'امسح رمز QR هذا باستخدام تطبيق واتساب على هاتفك' : 'Scan this QR code with WhatsApp on your phone'
            );
            setIsLoading(false);
            setRetryCount(0);
            startPolling();
            return;
          } else {
            // QR not ready yet, retry after delay
            setStatusMessage(
              isRtl ? 'جاري إنشاء رمز QR...' : 'Generating QR code...'
            );
            setTimeout(() => {
              fetchingRef.current = false;
              fetchStatus();
            }, 2000);
            return;
          }
        } catch (qrError) {
          setError(
            isRtl ? 'فشل في الحصول على رمز QR: ' + qrError.message : 'Failed to get QR code: ' + qrError.message
          );
          setIsLoading(false);
          return;
        }
      }
      
      // If we get here, something unexpected happened
      setError(
        isRtl ? 'استجابة غير متوقعة من الخادم' : 'Unexpected response from server'
      );
      setStatusMessage(
        isRtl ? 'خطأ في الاتصال بواتساب' : 'Error connecting to WhatsApp'
      );
      setIsLoading(false);
    } catch (error) {
      setError(
        isRtl ? 'فشل الاتصال بواتساب: ' + error.message : 'Failed to connect to WhatsApp: ' + error.message
      );
      setStatusMessage(
        isRtl ? 'خطأ في الاتصال بواتساب' : 'Error connecting to WhatsApp'
      );
      setIsLoading(false);
      
      // Retry after a delay
      if (retryCount < 5) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchingRef.current = false;
          fetchStatus();
        }, 5000);
      }
    } finally {
      fetchingRef.current = false;
    }
  };
  
  // Function to poll for connection status
  const startPolling = () => {
    // Clear any existing interval
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    
    // Create new polling interval
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/bots/${botId}/status`);
        const data = await response.json();
        
        if (data.whatsapp_connected) {
          // Connected successfully
          setIsConnected(true);
          setQrCode(null);
          setStatusMessage(
            isRtl ? 'تم الاتصال بواتساب بنجاح!' : 'WhatsApp connected successfully!'
          );
          clearInterval(interval);
          setPollInterval(null);
          
          // Redirect after a short delay
          setTimeout(() => {
            router.push(`/dashboard/client/bots/${botId}`);
          }, 2000);
          return;
        }
        
        if (data.error) {
          setError(
            isRtl ? `خطأ في الاتصال: ${data.error.message || 'خطأ غير معروف'}` 
            : `Connection error: ${data.error.message || 'Unknown error'}`
          );
          clearInterval(interval);
          setPollInterval(null);
        }
        
        // Check if QR code needs to be refreshed
        if (data.connection_state?.needsQrScan && !qrCode) {
          fetchingRef.current = false;
          fetchStatus();
        }
      } catch (error) {
        console.error('Error polling connection status:', error);
      }
    }, 3000);
    
    // Store the interval ID
    setPollInterval(interval);
  };
  
  // Function to reset connection
  const handleReset = async () => {
    try {
      setIsLoading(true);
      setStatusMessage(
        isRtl ? 'جاري إعادة ضبط اتصال واتساب...' : 'Resetting WhatsApp connection...'
      );
      setQrCode(null);
      setError(null);
      setRetryCount(0);
      
      await fetch(`/api/bots/${botId}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch status again after a delay
      setTimeout(() => {
        fetchingRef.current = false;
        fetchStatus();
      }, 3000);
    } catch (error) {
      setError(
        isRtl ? 'فشل في إعادة ضبط الاتصال: ' + error.message : 'Failed to reset connection: ' + error.message
      );
      setIsLoading(false);
    }
  };
  
  // Function to fetch QR code
  const fetchQrCode = async () => {
    try {
      console.log(`Fetching QR code for bot ${botId}`);
      const qrResponse = await fetch(`/api/bots/${botId}/qr`);
      const qrData = await qrResponse.json();
      
      if (qrData.qr && qrData.success) {
        setQrCode(qrData.qr);
        setStatusMessage(
          isRtl ? 'امسح رمز QR هذا باستخدام تطبيق واتساب على هاتفك' : 'Scan this QR code with WhatsApp on your phone'
        );
        setIsLoading(false);
        setRetryCount(0);
        startPolling();
        return;
      } else if (qrData.waiting) {
        setStatusMessage(
          isRtl ? 'جاري إنشاء رمز QR... يرجى الانتظار' : 'Generating QR code... please wait'
        );
        setTimeout(() => {
          fetchingRef.current = false;
          fetchQrCode();
        }, 3000);
        return;
      } else {
        setStatusMessage(
          isRtl ? 'جاري إنشاء رمز QR...' : 'Generating QR code...'
        );
        setTimeout(() => {
          fetchingRef.current = false;
          fetchQrCode();
        }, 2000);
        return;
      }
    } catch (qrError) {
      setError(
        isRtl ? 'فشل في الحصول على رمز QR: ' + qrError.message : 'Failed to get QR code: ' + qrError.message
      );
      setIsLoading(false);
    }
  };
  
  // Initial fetch of status
  useEffect(() => {
    fetchQrCode();
    
    // Clean up polling interval on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [botId]);
  
  // Add a QR refresh interval to ensure we always have a fresh QR
  useEffect(() => {
    // Refresh QR code every 20 seconds to avoid expiration
    const qrRefreshInterval = setInterval(() => {
      if (!isConnected) {
        fetchQrCode();
      }
    }, 20000);
    
    return () => {
      clearInterval(qrRefreshInterval);
    };
  }, [botId, isConnected]);
  
  return (
    <div className={`container max-w-3xl mx-auto py-8 font-cairo ${isRtl ? 'rtl' : 'ltr'}`}>
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle>{isRtl ? 'اتصال واتساب' : 'Connect WhatsApp'}</CardTitle>
          <CardDescription>
            {botName && <span className="font-semibold">{botName}</span>}
          </CardDescription>
          <div className="mt-2 text-sm text-muted-foreground">
            {isRtl 
              ? 'امسح رمز QR باستخدام تطبيق واتساب على هاتفك لربط البوت الخاص بك'
              : 'Scan the QR code with WhatsApp on your phone to connect your bot'
            }
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {isLoading && !qrCode && !isConnected && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg text-center">{statusMessage}</p>
            </div>
          )}
          
          {isConnected && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">
                  {isRtl 
                    ? 'تم الاتصال بواتساب بنجاح! جاري إعادة التوجيه إلى لوحة التحكم...'
                    : 'WhatsApp connected successfully! Redirecting to dashboard...'
                  }
                </p>
              </div>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{isRtl ? 'خطأ' : 'Error'}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {qrCode && !isConnected && (
            <div className="flex flex-col items-center space-y-4">
              <div className="mb-6 bg-white p-4 rounded-lg">
                <div className="qr-code-container" style={{ minHeight: '264px', minWidth: '264px' }}>
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64 mx-auto"
                    style={{ imageRendering: 'pixelated' }}
                    onError={(e) => {
                      console.error("QR image failed to load");
                      e.target.style.display = 'none';
                      setTimeout(fetchQrCode, 2000);
                    }}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {isRtl ? 'امسح رمز QR هذا باستخدام تطبيق واتساب على هاتفك' : 'Scan this QR code with WhatsApp on your phone'}
              </div>
            </div>
          )}
          
          {!qrCode && !isConnected && !error && (
            <div className="flex flex-col items-center space-y-4">
              <div className="mb-6 bg-white p-4 rounded-lg">
                <div className="w-64 h-64 border border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center p-4">
                    <Spinner size="lg" className="mb-4" />
                    <p className="text-muted-foreground">
                      {statusMessage || (isRtl ? 'جاري إنشاء رمز QR...' : 'Generating QR code...')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {isRtl ? 'يرجى الانتظار بينما نقوم بإنشاء رمز QR...' : 'Please wait while we generate your QR code...'}
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusMessage(isRtl ? 'جاري تحديث رمز QR...' : 'Refreshing QR code...');
                  fetchQrCode();
                }}
              >
                {isRtl ? 'تحديث رمز QR' : 'Refresh QR Code'}
              </Button>
            </div>
          )}
          
          <div className={`flex flex-wrap justify-center gap-2 ${isRtl ? 'space-x-reverse' : ''}`}>
            {!isConnected && (
              <Button 
                variant="outline" 
                onClick={handleReset} 
                disabled={isLoading}
                className="mt-2"
              >
                {isRtl ? 'إعادة ضبط الاتصال' : 'Reset Connection'}
              </Button>
            )}
            
            <Link href={`/dashboard/client/bots/${botId}`}>
              <Button variant="outline" className="mt-2">
                {isRtl ? 'العودة إلى البوت' : 'Back to Bot'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 