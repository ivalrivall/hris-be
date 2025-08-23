import type { DataSource } from 'typeorm';

import { RoleType } from '../../constants/role-type';
import { UserEntity } from '../../modules/user/user.entity';

export const seedUsers = async (dataSource: DataSource) => {
  const userRepo = dataSource.getRepository(UserEntity);

  const exists = await userRepo.count();

  if (exists > 0) {
    console.log('Users already seeded. Skipping...');

    return;
  }

  await userRepo.insert([
    {
      email: 'admin@example.com',
      name: 'admin',
      password: 'admin123', // you should hash this in real apps
      role: RoleType.ADMIN,
    },
    {
      email: 'user@example.com',
      name: 'user',
      password: 'user123',
      role: RoleType.USER,
    },
  ]);

  console.log('✅ Users seeded');
};
