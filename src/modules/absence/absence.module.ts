import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AbsenceController } from './absence.controller.ts';
import { AbsenceEntity } from './absence.entity.ts';
import { AbsenceService } from './absence.service.ts';

@Module({
  imports: [TypeOrmModule.forFeature([AbsenceEntity])],
  controllers: [AbsenceController],
  providers: [AbsenceService],
})
export class AbsenceModule {}
