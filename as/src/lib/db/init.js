import { initializeDatabase } from './config';
import { createSubscriptionsTable } from './migrations/subscriptions';
import { addRoleColumn, setUserAsAdmin } from './migrations/add-role-column';
import { up as createCouponsTable } from './migrations/coupons/create_coupons_table';
import { up as createPaymentsTable } from './migrations/payments/create_payments_table';
import { createFaqsTable } from './migrations/faqs/create_faqs_table';
import { seedFaqs } from './migrations/faqs/seed-faqs';

// Function to initialize the database
export async function setupDatabase() {
  try {
    console.log('Initializing database...');
    const connection = await initializeDatabase();
    console.log('Database initialized successfully');
    
    // Run migrations
    await addRoleColumn();
    await createCouponsTable(connection);
    await createPaymentsTable(connection);
    await createFaqsTable();
    
    // Seed data
    await seedFaqs();
    
    console.log('All migrations and seeding completed successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Export a function to be called during app initialization
export default async function initDB() {
  try {
    await setupDatabase();
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

// Utility function to set a user as admin
export async function makeUserAdmin(email) {
  try {
    // First ensure the role column exists
    await addRoleColumn();
    
    // Then set the user as admin
    const result = await setUserAsAdmin(email);
    
    if (result) {
      console.log(`User ${email} has been set as admin`);
      return true;
    } else {
      console.error(`Failed to set user ${email} as admin`);
      return false;
    }
  } catch (error) {
    console.error('Error making user admin:', error);
    return false;
  }
}
