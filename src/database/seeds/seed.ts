import { dataSource } from '../../ormconfig';
import { seedUsers } from './user.seed';

async function seed() {
  await dataSource.initialize();
  await seedUsers(dataSource);
  await dataSource.destroy();
}

try {
  await seed();
  console.info('Seeding complete');
} catch (error: unknown) {
  console.error('Seeding failed:', error);
}
