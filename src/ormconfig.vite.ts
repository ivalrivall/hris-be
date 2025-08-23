import './boilerplate.polyfill';

import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { UserSubscriber } from './entity-subscribers/user-subscriber';
import { AbsenceEntity } from './modules/absence/absence.entity';
import { UserEntity } from './modules/user/user.entity';
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
  entities: [UserEntity, AbsenceEntity],
  migrations: [],
});
