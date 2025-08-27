/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { ApiProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto.ts';
import type { AbsenceEntity } from '../absence.entity.ts';
import { AbsenceStatus } from '../absence.entity.ts';

export class AbsenceDto extends AbstractDto {
  @ApiProperty()
  userId: Uuid;

  @ApiProperty({ enum: AbsenceStatus })
  status: AbsenceStatus;

  @ApiProperty({ required: false, nullable: true })
  userName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  userPosition?: string | null;

  constructor(absenceEntity: AbsenceEntity) {
    super(absenceEntity);
    this.userId = absenceEntity.userId;
    this.status = absenceEntity.status;

    this.userName = absenceEntity.user?.name ?? null;
    this.userPosition = absenceEntity.user?.position ?? null;
  }
}
