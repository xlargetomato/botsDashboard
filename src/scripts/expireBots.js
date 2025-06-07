import cron from 'node-cron';
import { executeQuery } from '../lib/db/config.js';

// Track if the cron job has been started to prevent duplicate instances
let cronStarted = false;

/**
 * Cron job to mark expired bots
 * Runs every hour (at minute 0)
 */
export function startExpirationCron() {
  // Prevent multiple instances of the cron job in development with hot reloading
  if (cronStarted) {
    return;
  }
  
  console.log('Starting bot expiration cron job...');
  cronStarted = true;
  
  // Schedule the job to run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      console.log(`Running bot expiration check at ${now.toISOString()}`);
      
      // Update all active bots that have expired
      const result = await executeQuery(`
        UPDATE whatsapp_bots
        SET status = 'expired'
        WHERE 
          status = 'active' 
          AND expires_at < NOW()
      `);
      
      console.log(`Expired bots processed: ${result.affectedRows || 0} bots marked as expired`);
    } catch (error) {
      console.error('Error in bot expiration cron job:', error);
    }
  });
  
  // Also run immediately on startup to catch any bots that expired while the server was down
  setTimeout(async () => {
    try {
      const now = new Date();
      console.log(`Running initial bot expiration check at ${now.toISOString()}`);
      
      const result = await executeQuery(`
        UPDATE whatsapp_bots
        SET status = 'expired'
        WHERE 
          status = 'active' 
          AND expires_at < NOW()
      `);
      
      console.log(`Initial expired bots processed: ${result.affectedRows || 0} bots marked as expired`);
    } catch (error) {
      console.error('Error in initial bot expiration check:', error);
    }
  }, 5000); // Wait 5 seconds after startup to ensure database connection is established
}

// Export the function
export default startExpirationCron; 