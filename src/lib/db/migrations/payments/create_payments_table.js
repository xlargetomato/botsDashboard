// Migration to create the payments table

export async function up(connection) {
  try {
    console.log('Creating payments table...');
    
    // Check if the table already exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'payments'"
    );
    
    if (tables.length > 0) {
      console.log('Payments table already exists, skipping creation');
      return true;
    }
    
    // Create the payments table
    await connection.execute(`
      CREATE TABLE payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(100) NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('Payments table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating payments table:', error);
    return false;
  }
}

export async function down(connection) {
  try {
    console.log('Dropping payments table...');
    
    await connection.execute("DROP TABLE IF EXISTS payments");
    
    console.log('Payments table dropped successfully');
    return true;
  } catch (error) {
    console.error('Error dropping payments table:', error);
    return false;
  }
}
