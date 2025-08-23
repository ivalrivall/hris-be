import { ApiProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto.ts';
import type { AbsenceEntity } from '../absence.entity.ts';
import { AbsenceStatus } from '../absence.entity.ts';

export class AbsenceDto extends AbstractDto {
  @ApiProperty()
  userId: Uuid;

  @ApiProperty({ enum: AbsenceStatus })
  status: AbsenceStatus;

  constructor(absenceEntity: AbsenceEntity) {
    super(absenceEntity);
    this.userId = absenceEntity.userId;
    this.status = absenceEntity.status;
  }
}
