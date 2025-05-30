import { executeQuery } from '../config';

// Function to add role column to users table if it doesn't exist
export async function addRoleColumn() {
  try {
    console.log('Checking if role column exists in users table...');
    
    // Check if the role column already exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `;
    
    const columnExists = await executeQuery(checkColumnQuery);
    
    if (columnExists.length === 0) {
      // Add the role column to the users table
      await executeQuery(`
        ALTER TABLE users 
        ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user'
      `);
      
      console.log('Added role column to users table');
    } else {
      console.log('Role column already exists in users table');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding role column to users table:', error);
    return false;
  }
}

// Function to set a user as admin by email
export async function setUserAsAdmin(email) {
  try {
    if (!email) {
      console.error('No email provided to set as admin');
      return false;
    }
    
    // Update the specified user to have the admin role
    const updateResult = await executeQuery(
      'UPDATE users SET role = ? WHERE email = ?',
      ['admin', email]
    );
    
    if (updateResult.affectedRows === 0) {
      console.error(`No user found with email: ${email}`);
      return false;
    }
    
    console.log(`Successfully set user ${email} as admin`);
    return true;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    return false;
  }
}
