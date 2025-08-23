import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '../../shared/shared.module.ts';
import { UserController } from './user.controller.ts';
import { UserEntity } from './user.entity';
import { UserService } from './user.service.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    SharedModule,
  ],
  controllers: [UserController],
  exports: [UserService],
  providers: [UserService],
})
export class UserModule {}
