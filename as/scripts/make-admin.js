// Script to make a user an admin
// Usage: node scripts/make-admin.js user@example.com

import { makeUserAdmin } from '../src/lib/db/init.js';

async function main() {
  try {
    // Get the email from command line arguments
    const email = process.argv[2];
    
    if (!email) {
      console.error('Please provide an email address');
      console.log('Usage: node scripts/make-admin.js user@example.com');
      process.exit(1);
    }
    
    console.log(`Setting user ${email} as admin...`);
    
    // Make the user an admin
    const result = await makeUserAdmin(email);
    
    if (result) {
      console.log(`User ${email} has been successfully set as admin`);
      process.exit(0);
    } else {
      console.error(`Failed to set user ${email} as admin`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
