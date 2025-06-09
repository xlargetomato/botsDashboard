import { executeQuery } from './config.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed the database with initial subscription plans
 */
export async function seedSubscriptionPlans() {
  try {
    console.log('Checking for existing subscription plans...');
    
    // Check if subscription plans already exist
    const existingPlans = await executeQuery('SELECT COUNT(*) as count FROM subscription_plans');
    
    if (existingPlans[0].count > 0) {
      console.log(`Found ${existingPlans[0].count} existing subscription plans. Skipping seed.`);
      return true;
    }
    
    console.log('No subscription plans found. Creating default plans...');
    
    // Create basic plan
    const basicPlanId = uuidv4();
    await executeQuery(`
      INSERT INTO subscription_plans 
      (id, name, description, price_weekly, price_monthly, price_yearly, features, is_active) 
      VALUES 
      (?, 'Basic Plan', 'Essential features for small businesses', 49.99, 99.99, 999.99, ?, TRUE)
    `, [basicPlanId, JSON.stringify(['5 Projects', '10 GB Storage', 'Basic Support'])]);
    
    // Create pro plan
    const proPlanId = uuidv4();
    await executeQuery(`
      INSERT INTO subscription_plans 
      (id, name, description, price_weekly, price_monthly, price_yearly, features, is_active) 
      VALUES 
      (?, 'Pro Plan', 'Advanced features for growing businesses', 99.99, 199.99, 1999.99, ?, TRUE)
    `, [proPlanId, JSON.stringify(['20 Projects', '50 GB Storage', 'Priority Support', 'Advanced Analytics'])]);
    
    // Create enterprise plan
    const enterprisePlanId = uuidv4();
    await executeQuery(`
      INSERT INTO subscription_plans 
      (id, name, description, price_weekly, price_monthly, price_yearly, features, is_active) 
      VALUES 
      (?, 'Enterprise Plan', 'Comprehensive solution for large organizations', 199.99, 499.99, 4999.99, ?, TRUE)
    `, [enterprisePlanId, JSON.stringify(['Unlimited Projects', '200 GB Storage', 'Priority Support', 'Advanced Analytics', 'Custom Integrations'])]);
    
    console.log('Successfully created default subscription plans');
    return true;
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    return false;
  }
}

/**
 * Main seed function to run all seeders
 */
export async function seedDatabase() {
  try {
    await seedSubscriptionPlans();
    console.log('Database seeding completed successfully');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
}

export default seedDatabase; 