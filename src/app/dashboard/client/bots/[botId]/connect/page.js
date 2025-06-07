"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { apiRoutes } from '@/lib/routes';

// Polling interval (ms)
const POLLING_INTERVAL = 2500;
// Timeout for connection (ms)
const CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export default function ConnectBot() {
  const { botId } = useParams();
  const router = useRouter();
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [connected, setConnected] = useState(false);
  const [waitingForQr, setWaitingForQr] = useState(false);
  const [deviceLinkingError, setDeviceLinkingError] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Preparing WhatsApp connection...');
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Use refs to prevent duplicate requests
  const fetchingRef = useRef(false);
  const pollingIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  
  // Cleanup timers function - define first since it's used by other functions
  const cleanupTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  // Function to fetch QR code - define as a named function first
  const fetchQrCodeFn = async (options = {}) => {
    // Prevent duplicate requests
    if (fetchingRef.current && !options.force) return;
    fetchingRef.current = true;
    
    try {
      setLoading(true);
      if (!options.keepError) {
        setError(null);
        setErrorDetails(null);
        setDeviceLinkingError(false);
      }
      
      // Add cache busting parameter to prevent caching
      const timestamp = Date.now();
      const forceResetParam = options.reset ? '&forcereset=true' : '';
      const url = `${apiRoutes.botQr(botId)}?t=${timestamp}${forceResetParam}`;
      
      console.log(`Fetching QR from: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.reset) {
        setStatusMessage('Connection reset, generating new QR code...');
        // If we've reset, wait briefly then try again without the reset flag
        setTimeout(() => {
          fetchingRef.current = false;
          fetchQrCode();
        }, 2000);
        return;
      }
      
      if (data.error) {
        setError(data.error);
        setLoading(false);
        
        // Check if this is a device linking error
        if (data.deviceLinkingError) {
          setDeviceLinkingError(true);
          setErrorDetails(data.errorDetails);
          console.log('Device linking error:', data.errorDetails);
        }
        
        fetchingRef.current = false;
        return;
      }
      
      if (data.active) {
        // Bot is already active
        setConnected(true);
        setLoading(false);
        setStatusMessage('WhatsApp connected successfully!');
        // Redirect to dashboard after a delay
        setTimeout(() => {
          router.push('/dashboard/client/bots');
        }, 3000);
        fetchingRef.current = false;
        return;
      }
      
      if (data.waiting) {
        // QR code is not yet generated, retry after a delay
        setWaitingForQr(true);
        setStatusMessage('Generating QR code, please wait...');
        
        // Retry after a short delay
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchingRef.current = false;
          fetchQrCode();
        }, 2000);
        return;
      }
      
      if (data.qr) {
        // QR code generated
        console.log('QR code received');
        setQrCodeData(data.qr);
        setWaitingForQr(false);
        setLoading(false);
        setStatusMessage('Scan this QR code with WhatsApp on your phone');
        
        // Start polling to check connection status
        startPolling();
        
        // Set connection timeout
        if (!connectionTimeoutRef.current) {
          connectionTimeoutRef.current = setTimeout(() => {
            if (!connected) {
              setError('Connection timed out. The QR code may have expired. Please try again.');
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
              }
            }
          }, CONNECTION_TIMEOUT);
        }
      }
      
      fetchingRef.current = false;
    } catch (error) {
      console.error('Error fetching QR code:', error);
      setError('Connection error. Please try again or refresh the page.');
      setLoading(false);
      fetchingRef.current = false;
      
      // Auto-retry after a short delay
      setTimeout(() => {
        fetchingRef.current = false;
        fetchQrCode({ keepError: true });
      }, 5000);
    }
  };
  
  // Create the memoized version
  const fetchQrCode = useCallback(fetchQrCodeFn, [botId, router, connected]);
  
  // Function to retry QR code generation
  const handleRetry = useCallback(() => {
    setError(null);
    setWaitingForQr(false);
    setLoading(true);
    setDeviceLinkingError(false);
    setErrorDetails(null);
    setStatusMessage('Preparing WhatsApp connection...');
    fetchingRef.current = false;
    
    // Clean up intervals and timeouts
    cleanupTimers();
    
    // Start fresh fetch
    fetchQrCode();
  }, [fetchQrCode, cleanupTimers]);
  
  // Function to handle reset
  const handleReset = useCallback(async () => {
    setError(null);
    setWaitingForQr(false);
    setLoading(true);
    setDeviceLinkingError(false);
    setErrorDetails(null);
    setStatusMessage('Resetting WhatsApp connection...');
    
    // Clean up intervals and timeouts
    cleanupTimers();
    
    // Force a reset
    fetchingRef.current = false;
    await fetchQrCode({ reset: true, force: true });
  }, [fetchQrCode, cleanupTimers]);
  
  // Function to start polling for connection status
  const startPolling = useCallback(() => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Use a counter to track consecutive successful responses
    let consecutiveSuccesses = 0;
    let streamErrorDetected = false;
    
    pollingIntervalRef.current = setInterval(async () => {
      if (fetchingRef.current) return; // Skip if already fetching
      
      try {
        const timestamp = Date.now();
        const response = await fetch(`${apiRoutes.botQr(botId)}?poll=true&t=${timestamp}`);
        
        if (!response.ok) {
          throw new Error(`Polling error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check for errors during polling
        if (data.error) {
          console.log('Poll detected error:', data.error);
          
          // Check for stream errors
          if (data.error.code === 515 || 
              (data.error.message && data.error.message.includes("Stream Errored"))) {
            // Stream error detected
            streamErrorDetected = true;
            setError("WhatsApp connection error. The server will automatically try to reconnect.");
            setStatusMessage("Reconnecting to WhatsApp servers...");
            
            // Don't clear the interval, let it keep polling to detect when the connection is restored
            return;
          }
          
          // Check for device linking errors
          if (data.error.type === 'device.link.failure' || 
              (data.error.message && (
                data.error.message.includes("couldn't link") || 
                data.error.message.includes("device linking failed")
              ))) {
            // Device linking error detected
            clearInterval(pollingIntervalRef.current);
            setDeviceLinkingError(true);
            setErrorDetails(data.error);
            setError("Couldn't link device. Please try resetting the connection and scanning again.");
            return;
          }
        }
        
        // If we previously had a stream error and now we have a success, refresh the QR code
        if (streamErrorDetected && data.success) {
          streamErrorDetected = false;
          setError(null);
          setStatusMessage("Connection restored! Refreshing QR code...");
          
          // Refresh the QR code
          clearInterval(pollingIntervalRef.current);
          fetchingRef.current = false;
          fetchQrCode({ force: true });
          return;
        }
        
        if (data.success) {
          // Count consecutive successes to ensure it's really connected
          consecutiveSuccesses++;
          
          if (consecutiveSuccesses >= 2) {
            // Connection successful
            setConnected(true);
            setStatusMessage('WhatsApp connected successfully!');
            clearInterval(pollingIntervalRef.current);
            
            // Clear connection timeout
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            
            // Redirect to dashboard after a delay
            setTimeout(() => {
              router.push('/dashboard/client/bots');
            }, 3000);
          }
        } else {
          consecutiveSuccesses = 0;
        }
      } catch (error) {
        console.error('Error polling connection status:', error);
        consecutiveSuccesses = 0;
        // Continue polling on error
      }
    }, POLLING_INTERVAL);
  }, [botId, router, fetchQrCode]);
  
  // Function to force connect (dev only)
  const forceConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatusMessage('Forcing connection...');
      
      const response = await fetch(apiRoutes.botForceConnect(botId), {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      
      if (data.success) {
        setConnected(true);
        setLoading(false);
        setStatusMessage('WhatsApp connected successfully!');
        // Redirect to dashboard after a delay
        setTimeout(() => {
          router.push('/dashboard/client/bots');
        }, 3000);
      }
    } catch (error) {
      console.error('Error force connecting:', error);
      setError('Failed to force connect. Please try again.');
      setLoading(false);
    }
  };
  
  // Fetch QR code on mount
  useEffect(() => {
    fetchQrCode();
    
    // Cleanup function
    return cleanupTimers;
  }, [fetchQrCode, cleanupTimers]);
  
  // Success component
  const ConnectedSuccess = () => (
    <Alert className="bg-green-50 border-green-500 text-green-700 mb-4">
      <AlertDescription>
        WhatsApp connected successfully! Redirecting to dashboard...
      </AlertDescription>
    </Alert>
  );
  
  // Device Linking Error component
  const DeviceLinkingErrorAlert = () => (
    <Alert className="bg-yellow-50 border-yellow-500 text-yellow-800 mb-4">
      <AlertDescription className="flex flex-col gap-2">
        <p className="font-semibold">WhatsApp couldn't link to this device.</p>
        <p>This usually happens when:</p>
        <ul className="list-disc list-inside text-sm pl-2">
          <li>You've linked too many devices to your WhatsApp account</li>
          <li>Your phone is not connected to the internet</li>
          <li>Your WhatsApp version doesn't support multi-device</li>
        </ul>
        <p className="text-sm italic mt-1">Try resetting the connection and scanning again.</p>
        <div className="mt-3">
          <Button 
            onClick={handleReset} 
            className="bg-yellow-600 hover:bg-yellow-700 text-white">
            Reset Connection
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
  
  // Stream Error component
  const StreamErrorAlert = () => (
    <Alert className="bg-orange-50 border-orange-500 text-orange-800 mb-4">
      <AlertDescription className="flex flex-col gap-2">
        <p className="font-semibold">WhatsApp connection error detected.</p>
        <p>This usually happens when:</p>
        <ul className="list-disc list-inside text-sm pl-2">
          <li>WhatsApp servers are experiencing issues</li>
          <li>Your internet connection is unstable</li>
          <li>There's a problem with your browser or device</li>
        </ul>
        <p className="text-sm italic mt-1">The system is automatically trying to reconnect. Please wait or try resetting the connection.</p>
        <div className="mt-3">
          <Button 
            onClick={handleReset} 
            className="bg-orange-600 hover:bg-orange-700 text-white">
            Reset Connection
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-bold mb-4 text-center">Connect WhatsApp</h2>
          
          {deviceLinkingError && <DeviceLinkingErrorAlert />}
          
          {error && !deviceLinkingError && !error.includes("Stream Errored") && (
            <Alert className="bg-red-50 border-red-500 text-red-700 mb-4">
              <AlertDescription>{error}</AlertDescription>
              <div className="mt-3 text-center">
                <Button onClick={handleRetry} size="sm" className="mr-2">
                  Try Again
                </Button>
                <Button onClick={handleReset} size="sm" variant="outline">
                  Reset Connection
                </Button>
              </div>
            </Alert>
          )}
          
          {error && error.includes("Stream Errored") && <StreamErrorAlert />}
          
          {connected && <ConnectedSuccess />}
          
          {loading && !waitingForQr && !connected && !error && (
            <div className="flex flex-col items-center justify-center py-8">
              <Spinner size="lg" />
              <p className="mt-4 text-center text-gray-600">
                {statusMessage}
              </p>
            </div>
          )}
          
          {waitingForQr && (
            <div className="flex flex-col items-center justify-center py-8">
              <Spinner size="lg" />
              <p className="mt-4 text-center text-gray-600">
                {statusMessage}
              </p>
            </div>
          )}
          
          {qrCodeData && !connected && !error && !deviceLinkingError && (
            <div className="flex flex-col items-center justify-center py-4">
              {typeof qrCodeData === 'string' && qrCodeData.startsWith('data:image') ? (
                <img 
                  src={qrCodeData} 
                  alt="WhatsApp QR Code" 
                  width={300} 
                  height={300}
                  className="border border-gray-200 rounded-md"
                />
              ) : (
                <QRCodeSVG 
                  value={qrCodeData} 
                  size={300} 
                  level="H"
                  includeMargin={true}
                  renderAs="svg"
                  className="border border-gray-200 rounded-md"
                />
              )}
              <p className="mt-4 text-center text-gray-600">
                Scan this QR code with WhatsApp on your phone to connect your bot.
              </p>
              <p className="mt-2 text-sm text-center text-gray-500">
                Open WhatsApp &gt; Menu &gt; Linked Devices &gt; Link a Device
              </p>
              
              <div className="mt-4 flex justify-center space-x-3">
                <Button 
                  onClick={handleRetry} 
                  variant="outline" 
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  Refresh QR Code
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  Reset Connection
                </Button>
              </div>
            </div>
          )}
          
          {/* Development only: Force connect button */}
          {isDevelopment && !connected && (
            <div className="mt-6 text-center">
              <Button 
                onClick={forceConnect} 
                variant="outline" 
                className="bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" className="mr-2" /> : null}
                Force Connect (Dev Only)
              </Button>
              <p className="mt-2 text-xs text-gray-500">
                This button is only available in development mode
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 