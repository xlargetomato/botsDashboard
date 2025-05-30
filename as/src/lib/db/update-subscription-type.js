import { executeQuery } from './config';

/**
 * Updates the subscriptions table to include 'weekly' in subscription_type enum
 */
export async function updateSubscriptionTypeEnum() {
  try {
    console.log('Updating subscription_type ENUM to include weekly option...');
    
    // First check if the table exists
    const tableCheckResult = await executeQuery(
      `SHOW TABLES LIKE 'subscriptions'`
    );
    
    if (tableCheckResult.length === 0) {
      console.log('Subscriptions table does not exist yet. No update needed.');
      return;
    }
    
    // Alter the existing subscriptions table to modify the ENUM
    await executeQuery(
      `ALTER TABLE subscriptions 
       MODIFY COLUMN subscription_type ENUM('weekly', 'monthly', 'yearly') NOT NULL`
    );
    
    console.log('Successfully updated subscription_type ENUM.');
  } catch (error) {
    console.error('Error updating subscription_type ENUM:', error);
    throw error;
  }
}

// Execute the update if this file is run directly
if (require.main === module) {
  updateSubscriptionTypeEnum()
    .then(() => {
      console.log('Update completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Update failed:', err);
      process.exit(1);
    });
}
