import { PageOptionsDto } from '../../../common/dto/page-options.dto.ts';
import { DateFieldOptional } from '../../../decorators/field.decorators.ts';

export class AbsencePageOptionsDto extends PageOptionsDto {
  @DateFieldOptional({
    description: 'Start date (inclusive) in local timezone',
    example: '2025-01-01T00:00:00.000Z',
  })
  startDate?: Date;

  @DateFieldOptional({
    description: 'End date (inclusive) in local timezone',
    example: '2025-01-31T23:59:59.999Z',
  })
  endDate?: Date;
}
