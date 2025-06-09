import { executeQuery } from './lib/db/config.js';

async function fixSchema() {
  try {
    console.log('Removing default value from subscription_type column...');
    
    // This will remove the default value from the subscription_type column
    await executeQuery(`
      ALTER TABLE subscription_plans 
      MODIFY COLUMN subscription_type ENUM('weekly', 'monthly', 'yearly') NOT NULL
    `);
    
    console.log('Schema updated successfully!');
    
    // Verify the change
    const [columns] = await executeQuery('DESCRIBE subscription_plans');
    console.log('Updated subscription_plans schema:');
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type}, ${col.Null}, Default: ${col.Default || 'NULL'}`);
    });
    
  } catch (err) {
    console.error('Error updating schema:', err);
  }
}

fixSchema().then(() => process.exit(0)).catch(() => process.exit(1)); 