import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../user/user.entity.ts';
import { AbsenceController } from './absence.controller.ts';
import { AbsenceEntity } from './absence.entity.ts';
import { AbsenceService } from './absence.service.ts';

@Module({
  imports: [TypeOrmModule.forFeature([AbsenceEntity, UserEntity])],
  controllers: [AbsenceController],
  providers: [AbsenceService],
})
export class AbsenceModule {}
