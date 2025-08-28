import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '../../shared/shared.module.ts';
import { AbsenceEntity } from '../absence/absence.entity.ts';
import { FirebaseModule } from '../firebase/firebase.module.ts';
import { UserController } from './user.controller.ts';
import { UserEntity } from './user.entity';
import { UserService } from './user.service.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AbsenceEntity]),
    SharedModule,
    FirebaseModule,
  ],
  controllers: [UserController],
  exports: [UserService],
  providers: [UserService],
})
export class UserModule {}
