import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { AbsenceStatus } from '../absence.entity.ts';

export class CreateAbsenceDto {
  @ApiProperty({ enum: AbsenceStatus })
  @IsEnum(AbsenceStatus)
  status!: AbsenceStatus;
}
