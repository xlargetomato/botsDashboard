'use client';

import { useEffect, useState } from 'react';

export default function DatabaseInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const response = await fetch('/api/system/init-db', { method: 'POST' });
        const data = await response.json();
        
        if (response.ok) {
          setInitialized(true);
          console.log('Database initialized successfully');
        } else {
          const errorMessage = data.sqlMessage || data.details || data.error || 'Failed to initialize database';
          setError(errorMessage);
          console.error('Database initialization error:', {
            error: data.error,
            details: data.details,
            code: data.code,
            sqlMessage: data.sqlMessage
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize database');
        console.error('Database initialization error:', err);
      }
    };

    initializeDatabase();
  }, []);

  // This component doesn't render anything visible
  return null;
}
