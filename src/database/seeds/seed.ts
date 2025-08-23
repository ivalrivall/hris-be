import { dataSource } from '../../ormconfig';
import { seedUsers } from './user.seed';

async function seed() {
  await dataSource.initialize();
  await seedUsers(dataSource);
  await dataSource.destroy();
}

seed()
  .then(() => {
    console.info('Seeding complete!');
  })
  .catch((err: any) => {
    console.error('Seeding failed:', err);
  });