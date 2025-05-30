// Migration to create the coupons table

export async function up(connection) {
  try {
    console.log('Creating coupons table...');
    
    // Check if the table already exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'coupons'"
    );
    
    if (tables.length > 0) {
      console.log('Coupons table already exists, skipping creation');
      return true;
    }
    
    // Create the coupons table
    await connection.execute(`
      CREATE TABLE coupons (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_type ENUM('percentage', 'fixed') NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        max_uses INT DEFAULT 0,
        used_count INT DEFAULT 0,
        expiry_date DATETIME NULL,
        active TINYINT(1) DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('Coupons table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating coupons table:', error);
    return false;
  }
}

export async function down(connection) {
  try {
    console.log('Dropping coupons table...');
    
    await connection.execute("DROP TABLE IF EXISTS coupons");
    
    console.log('Coupons table dropped successfully');
    return true;
  } catch (error) {
    console.error('Error dropping coupons table:', error);
    return false;
  }
}
