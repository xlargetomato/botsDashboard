'use client';

import { useEffect, useState } from 'react';

export default function DatabaseInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      if (initialized) return;  // Prevent re-initialization if already done
      try {
        const response = await fetch('/api/system/init-db', { method: 'POST' });
        
        // Check if the response is ok first
        if (response.ok) {
          try {
            const data = await response.json();
            setInitialized(true);
            console.log('Database initialized successfully');
          } catch (jsonError) {
            // Response was ok but not valid JSON
            setInitialized(true); // Assume success if response was ok
            console.log('Database initialized (with parsing warning)');
          }
        } else {
          // Handle error responses
          let errorMessage = 'Failed to initialize database';
          try {
            // Try to parse as JSON first
            const data = await response.json();
            errorMessage = data.sqlMessage || data.details || data.error || errorMessage;
            console.error('Database initialization error:', {
              error: data.error,
              details: data.details,
              code: data.code,
              sqlMessage: data.sqlMessage
            });
          } catch (jsonError) {
            // If not JSON, try to get text content
            try {
              // We need a new response since the body was already consumed
              const textResponse = await fetch('/api/system/init-db', { method: 'POST' });
              const textContent = await textResponse.text();
              errorMessage = `Server error (${response.status})`;
              console.error('Database initialization error (non-JSON):', {
                status: response.status,
                statusText: response.statusText,
                textContent: textContent.substring(0, 150) + '...' // Show beginning of response
              });
            } catch (textError) {
              console.error('Failed to read error response as text:', textError);
            }
          }
          setError(errorMessage);
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize database');
        console.error('Database initialization error:', err);
      }
    };

    initializeDatabase();
  }, [initialized]);

  // This component doesn't render anything visible
  return null;
}
