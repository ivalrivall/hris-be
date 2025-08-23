import { PartialType } from '@nestjs/swagger';

import { CreateAbsenceDto } from './create-absence.dto.ts';

export class UpdateAbsenceDto extends PartialType(CreateAbsenceDto) {}
