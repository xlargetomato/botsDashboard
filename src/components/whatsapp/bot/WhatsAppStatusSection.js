'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function WhatsAppStatusSection({ botId, isRtl }) {
  const [whatsappStatus, setWhatsappStatus] = useState({
    connected: false,
    loading: true,
    error: null,
    lastActivity: null,
    session: {
      exists: false,
      lastUpdated: null
    },
    needsQrScan: false,
    needsReconnect: false
  });
  const [qrCode, setQrCode] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Function to fetch WhatsApp status
  const fetchWhatsAppStatus = async (forceVerify = false) => {
    try {
      // Add verify parameter if requested
      const url = forceVerify 
        ? `/api/bots/${botId}/status?verify=true`
        : `/api/bots/${botId}/status`;
        
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        console.log("WhatsApp status response:", data);
        
        // Prioritize connection state from server
        const isConnected = data.whatsapp_connected || 
                          (data.session?.exists && data.connection_state?.authenticated) || 
                          (data.session?.exists && !data.connection_state?.needsQrScan);
        
        setWhatsappStatus({
          connected: isConnected,
          loading: false,
          error: data.error,
          lastActivity: data.connection_state?.lastActivity,
          session: data.session || { exists: false, lastUpdated: null },
          needsQrScan: !isConnected && data.connection_state?.needsQrScan,
          needsReconnect: !isConnected && data.connection_state?.needsReconnect
        });
        
        // If the bot has a QR code and we actually need it, use it
        if (!isConnected && data.qrCode) {
          setQrCode(data.qrCode);
        } else if (!isConnected && data.hasQr) {
          fetchQrCode();
        } else {
          // Clear QR code if we're connected
          setQrCode(null);
        }
      } else {
        setWhatsappStatus({
          connected: false,
          loading: false,
          error: { message: 'Failed to fetch status' },
          lastActivity: null,
          session: { exists: false, lastUpdated: null },
          needsQrScan: false,
          needsReconnect: false
        });
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      setWhatsappStatus({
        connected: false,
        loading: false,
        error: { message: error.message },
        lastActivity: null,
        session: { exists: false, lastUpdated: null },
        needsQrScan: false,
        needsReconnect: false
      });
    }
  };

  // Function to fetch QR code
  const fetchQrCode = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}/qr`);
      if (response.ok) {
        const data = await response.json();
        if (data.qr) {
          setQrCode(data.qr);
        }
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
    }
  };

  // Handler for reconnecting WhatsApp
  const handleReconnectWhatsApp = async () => {
    try {
      setReconnecting(true);
      const response = await fetch(`/api/bots/${botId}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success(
          isRtl 
          ? 'تم بدء الاتصال. يرجى مسح رمز QR عند ظهوره أو الانتقال إلى صفحة الاتصال.'
          : 'Connection initiated. Please scan the QR code when it appears or go to the connect page.'
        );
        
        // Wait a moment for the connection to reset and generate a QR code
        setTimeout(() => {
          fetchWhatsAppStatus();
          fetchQrCode();
          setReconnecting(false);
        }, 3000);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        console.error('Failed to reconnect WhatsApp:', errorData);
        
        toast.error(
          isRtl
          ? errorData.error || 'فشل في إعادة الاتصال بواتساب'
          : errorData.error || 'Failed to reconnect WhatsApp'
        );
        
        setWhatsappStatus(prev => ({
          ...prev,
          error: { message: errorData.error || 'Failed to reconnect' }
        }));
        setReconnecting(false);
      }
    } catch (error) {
      console.error('Error reconnecting WhatsApp:', error);
      toast.error(
        isRtl
        ? 'خطأ في الشبكة أثناء محاولة إعادة الاتصال بواتساب'
        : 'Network error while trying to reconnect WhatsApp'
      );
      
      setWhatsappStatus(prev => ({
        ...prev,
        error: { message: error.message || 'Network error occurred' }
      }));
      setReconnecting(false);
    }
  };

  // Handler for disconnecting WhatsApp
  const handleDisconnectWhatsApp = async () => {
    try {
      setDisconnecting(true);
      const response = await fetch(`/api/bots/${botId}/disconnect`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Update status after disconnection
        setTimeout(() => {
          fetchWhatsAppStatus();
          setDisconnecting(false);
        }, 2000);
        toast.success('WhatsApp session disconnected successfully');
      } else {
        const errorData = await response.json();
        setWhatsappStatus(prev => ({
          ...prev,
          error: { message: errorData.error || 'Failed to disconnect' }
        }));
        setDisconnecting(false);
        toast.error('Failed to disconnect WhatsApp session');
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      setWhatsappStatus(prev => ({
        ...prev,
        error: { message: error.message }
      }));
      setDisconnecting(false);
      toast.error('Error disconnecting WhatsApp session');
    }
  };

  // Handler for verifying WhatsApp connection
  const handleVerifyConnection = async () => {
    try {
      setWhatsappStatus(prev => ({ ...prev, loading: true }));
      
      await fetchWhatsAppStatus(true);
      
      toast.success(
        isRtl 
        ? 'تم التحقق من حالة الاتصال بنجاح'
        : 'Connection status verified successfully'
      );
    } catch (error) {
      console.error('Error verifying connection:', error);
      toast.error(
        isRtl
        ? 'حدث خطأ أثناء التحقق من حالة الاتصال'
        : 'Error verifying connection status'
      );
      setWhatsappStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Handler for force refresh connection
  const handleForceRefresh = async () => {
    try {
      setWhatsappStatus(prev => ({ ...prev, loading: true }));
      
      // First force verification
      await fetchWhatsAppStatus(true);
      
      // If still not connected and no session exists, force reset the QR
      if (!whatsappStatus.connected && !whatsappStatus.session.exists) {
        await fetch(`/api/bots/${botId}/qr?forcereset=true`, { method: 'GET' });
        setTimeout(() => {
          fetchWhatsAppStatus(true);
          fetchQrCode();
        }, 2000);
      }
      
      toast.success(
        isRtl 
        ? 'تم تحديث حالة الاتصال'
        : 'Connection status refreshed'
      );
    } catch (error) {
      console.error('Error forcing refresh:', error);
      toast.error(
        isRtl
        ? 'حدث خطأ أثناء تحديث حالة الاتصال'
        : 'Error refreshing connection status'
      );
    } finally {
      setWhatsappStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Set up interval to check WhatsApp status
  useEffect(() => {
    fetchWhatsAppStatus();
    
    const statusInterval = setInterval(fetchWhatsAppStatus, 30000); // Check every 30 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(statusInterval);
  }, [botId]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        {isRtl ? 'حالة اتصال واتساب' : 'WhatsApp Connection Status'}
      </h2>
      
      <div className="flex items-center mb-4">
        <span className={`text-gray-700 dark:text-gray-300 ${isRtl ? 'ml-2' : 'mr-2'}`}>
          {isRtl ? 'الحالة:' : 'Status:'}
        </span>
        {whatsappStatus.loading ? (
          <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full"></div>
        ) : whatsappStatus.connected ? (
          <span className="flex items-center text-green-600 dark:text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-1' : 'mr-1'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {isRtl ? 'متصل' : 'Connected'}
          </span>
        ) : (
          <span className="flex items-center text-red-600 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-1' : 'mr-1'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {isRtl ? 'غير متصل' : 'Disconnected'}
          </span>
        )}
      </div>
      
      {/* Session Information */}
      {!whatsappStatus.loading && (
        <div className="mb-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRtl ? 'حالة الجلسة' : 'Session Status'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {whatsappStatus.session.exists ? 
                  (isRtl ? 'الجلسة موجودة' : 'Session exists') : 
                  (isRtl ? 'لا توجد جلسة' : 'No session found')}
              </p>
              {whatsappStatus.session.lastUpdated && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {isRtl ? 'آخر تحديث: ' : 'Last updated: '}
                  {new Date(whatsappStatus.session.lastUpdated).toLocaleString()}
                </p>
              )}
              {whatsappStatus.session.exists && !whatsappStatus.connected && (
                <div className="mt-2 text-amber-600 dark:text-amber-400">
                  <p>
                    {isRtl 
                      ? 'الجلسة موجودة ولكن الاتصال غير نشط. انقر على "التحقق من الاتصال".' 
                      : 'Session exists but connection inactive. Click "Verify Connection".'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRtl ? 'حالة الاتصال' : 'Connection Status'}
              </h3>
              {whatsappStatus.connected ? (
                <p className="text-green-600 dark:text-green-400">
                  {isRtl ? 'متصل' : 'Connected'}
                </p>
              ) : whatsappStatus.needsQrScan ? (
                <p className="text-yellow-600 dark:text-yellow-400">
                  {isRtl ? 'يجب مسح رمز QR' : 'QR scan needed'}
                </p>
              ) : whatsappStatus.needsReconnect ? (
                <p className="text-orange-600 dark:text-orange-400">
                  {isRtl ? 'يجب إعادة الاتصال' : 'Reconnection needed'}
                </p>
              ) : (
                <p className="text-red-600 dark:text-red-400">
                  {isRtl ? 'غير متصل' : 'Disconnected'}
                </p>
              )}
              {whatsappStatus.lastActivity && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {isRtl ? 'آخر نشاط: ' : 'Last activity: '}
                  {new Date(whatsappStatus.lastActivity).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile vs Web Mismatch Alert */}
      {whatsappStatus.session.exists && !whatsappStatus.connected && !whatsappStatus.loading && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-amber-600 ${isRtl ? 'ml-2' : 'mr-2'} mt-0.5`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                {isRtl ? 'تباين في حالة اتصال واتساب' : 'WhatsApp Connection Mismatch'}
              </h3>
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                {isRtl 
                  ? 'يبدو أن واتساب متصل على هاتفك ولكنه يظهر كغير متصل في لوحة التحكم.' 
                  : 'WhatsApp appears to be connected on your phone but shows as disconnected in the dashboard.'}
              </p>
              <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded text-sm">
                <p className="font-medium mb-1 text-amber-800 dark:text-amber-300">
                  {isRtl ? 'للإصلاح:' : 'To fix this:'}
                </p>
                <ol className={`${isRtl ? 'mr-5 pr-0' : 'ml-5 pl-0'} list-decimal text-amber-700 dark:text-amber-400 space-y-1`}>
                  <li>{isRtl ? 'انقر على زر "التحقق من الاتصال" أدناه' : 'Click the "Verify Connection" button below'}</li>
                  <li>{isRtl ? 'تأكد من أن هاتفك متصل بالإنترنت' : 'Make sure your phone is connected to the internet'}</li>
                  <li>{isRtl ? 'تأكد من أن واتساب مفتوح على هاتفك' : 'Ensure WhatsApp is open on your phone'}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {whatsappStatus.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <h3 className="font-medium text-red-700 dark:text-red-400 mb-1">
            {isRtl ? 'خطأ: ' : 'Error: '}
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            {whatsappStatus.error.message}
          </p>
          {whatsappStatus.error.timestamp && (
            <p className="text-xs text-red-500 dark:text-red-500 mt-1">
              {isRtl ? 'وقت الخطأ: ' : 'Error time: '}
              {new Date(whatsappStatus.error.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      )}
      
      <div className={`flex ${isRtl ? 'space-x-reverse space-x-2' : 'space-x-2'} flex-wrap`}>
        {/* Verify Connection button - prioritize this when session exists */}
        <button 
          onClick={handleVerifyConnection}
          disabled={whatsappStatus.loading}
          className={`px-4 py-2 ${whatsappStatus.session.exists && !whatsappStatus.connected ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md mb-2 ${whatsappStatus.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {whatsappStatus.loading ? (
            <div className="flex items-center">
              <div className={`animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
              {isRtl ? 'جاري التحقق...' : 'Verifying...'}
            </div>
          ) : (
            isRtl ? 'التحقق من الاتصال' : 'Verify Connection'
          )}
        </button>
        
        {/* Force Refresh button - when things aren't working as expected */}
        <button 
          onClick={handleForceRefresh}
          disabled={whatsappStatus.loading}
          className={`px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md mb-2 ${whatsappStatus.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {whatsappStatus.loading ? (
            <div className="flex items-center">
              <div className={`animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
              {isRtl ? 'جاري التحديث...' : 'Refreshing...'}
            </div>
          ) : (
            isRtl ? 'تحديث إجباري' : 'Force Refresh'
          )}
        </button>
      
        {!whatsappStatus.connected && !whatsappStatus.session.exists && (
          <button 
            onClick={handleReconnectWhatsApp}
            disabled={reconnecting}
            className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md ${reconnecting ? 'opacity-50 cursor-not-allowed' : ''} mb-2`}
          >
            {reconnecting ? (
              <div className="flex items-center">
                <div className={`animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
                {isRtl ? 'جاري إعادة الاتصال...' : 'Reconnecting...'}
              </div>
            ) : (
              isRtl ? 'إعادة الاتصال بواتساب' : 'Reconnect WhatsApp'
            )}
          </button>
        )}
        
        {whatsappStatus.connected && (
          <button 
            onClick={handleDisconnectWhatsApp}
            disabled={disconnecting}
            className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md ${disconnecting ? 'opacity-50 cursor-not-allowed' : ''} mb-2`}
          >
            {disconnecting ? (
              <div className="flex items-center">
                <div className={`animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
                {isRtl ? 'جاري إيقاف الاتصال...' : 'Disconnecting...'}
              </div>
            ) : (
              isRtl ? 'إيقاف جلسة واتساب' : 'Stop WhatsApp Session'
            )}
          </button>
        )}
        
        {/* Go to Connect Page button - only shown when QR scan is needed and no session exists */}
        {whatsappStatus.needsQrScan && !qrCode && !whatsappStatus.session.exists && (
          <a 
            href={`/dashboard/client/bots/${botId}/connect`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M10 19l-7-7m0 0l7-7m-7 7h18" : "M14 5l7 7m0 0l-7 7m7-7H3"} />
            </svg>
            {isRtl ? 'الانتقال إلى صفحة الاتصال' : 'Go to Connect Page'}
          </a>
        )}
      </div>
      
      {qrCode && (
        <div className="mt-4">
          <p className="mb-2 text-gray-700 dark:text-gray-300">
            {isRtl ? 'امسح رمز QR هذا باستخدام تطبيق واتساب على هاتفك للاتصال:' : 'Scan this QR code with WhatsApp on your phone to connect:'}
          </p>
          <div className="bg-white p-4 inline-block">
            <img src={qrCode} alt="WhatsApp QR Code" className="max-w-xs" />
          </div>
        </div>
      )}
    </div>
  );
} 