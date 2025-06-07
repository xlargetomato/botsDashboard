import { useEffect } from 'react';
import startExpirationCron from '../scripts/expireBots';

// Only run the cron job on the server side
if (typeof window === 'undefined') {
  startExpirationCron();
}

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp; 