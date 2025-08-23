import './boilerplate.polyfill';

import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { UserSubscriber } from './entity-subscribers/user-subscriber';
import { SnakeNamingStrategy } from './snake-naming.strategy';

dotenv.config();

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  namingStrategy: new SnakeNamingStrategy(),
  subscribers: [UserSubscriber],
  entities: [
    process.env.NODE_ENV === 'production'
      ? 'dist/modules/**/*.entity{.js}'
      : 'src/modules/**/*.entity{.ts,.js}',
    process.env.NODE_ENV === 'production'
      ? 'dist/modules/**/*.view-entity{.js}'
      : 'src/modules/**/*.view-entity{.ts,.js}',
  ],
  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/database/migrations/*{.js}'
      : 'src/database/migrations/*{.ts,.js}',
  ],
});

export default dataSource;
