import { seedDatabase } from '../src/lib/db/seed.js';

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('Database seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  }); 