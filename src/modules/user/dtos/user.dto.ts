import { AbstractDto } from '../../../common/dto/abstract.dto.ts';
import { RoleType } from '../../../constants/role-type.ts';
import {
  ClassField,
  EmailFieldOptional,
  EnumFieldOptional,
  PhoneFieldOptional,
  StringField,
  StringFieldOptional,
} from '../../../decorators/field.decorators.ts';
import { S3UrlParser } from '../../../decorators/transform.decorators.ts';
import { AbsenceDto } from '../../absence/dtos/absence.dto.ts';
import type { UserEntity } from '../user.entity.ts';

export class UserDto extends AbstractDto {
  @StringField({ nullable: false })
  name?: string | null;

  @EnumFieldOptional(() => RoleType)
  role?: RoleType;

  @EmailFieldOptional({ nullable: true })
  email?: string | null;

  @S3UrlParser()
  @StringFieldOptional({ nullable: true })
  avatar?: string | null;

  @PhoneFieldOptional({ nullable: true })
  phone?: string | null;

  @StringFieldOptional({ nullable: true })
  position?: string | null;

  @ClassField(() => AbsenceDto, { required: false, nullable: true })
  lastIn?: AbsenceDto | null;

  @ClassField(() => AbsenceDto, { required: false, nullable: true })
  lastOut?: AbsenceDto | null;

  constructor(
    user: UserEntity,
    options?: {
      lastInByUserIdDto?: Record<string, AbsenceDto>;
      lastOutByUserIdDto?: Record<string, AbsenceDto>;
    },
  ) {
    super(user);
    this.name = user.name;
    this.role = user.role;
    this.email = user.email;
    this.avatar = user.avatar;
    this.phone = user.phone;
    this.position = user.position;
    this.lastIn = options?.lastInByUserIdDto?.[user.id] ?? null;
    this.lastOut = options?.lastOutByUserIdDto?.[user.id] ?? null;
  }
}
