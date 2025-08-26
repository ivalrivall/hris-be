import { ApiProperty } from '@nestjs/swagger';
import { Matches, ValidateIf } from 'class-validator';

import { RoleType } from '../../../constants/role-type.ts';
import {
  EmailFieldOptional,
  EnumFieldOptional,
  PasswordFieldOptional,
  PhoneFieldOptional,
  StringFieldOptional,
} from '../../../decorators/field.decorators.ts';
import { SameAs } from '../../../validators/same-as.validator.ts';

export class UserUpdateDto {
  @PhoneFieldOptional({ nullable: true })
  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
    nullable: true,
  })
  phone?: string | null;

  @PasswordFieldOptional({ minLength: 8, nullable: true })
  @ApiProperty({
    description:
      'User password (min 8 chars; must include letters and numbers)',
    example: 'Newpass123',
    required: false,
    nullable: true,
  })
  @ValidateIf((o) => o.password != null)
  @Matches(/^(?=.*[a-z])(?=.*\d).{8,}$/i, {
    message:
      'password must be at least 8 characters long and contain letters and numbers',
  })
  password?: string | null;

  @StringFieldOptional({
    description: 'Name',
    example: 'John Doe',
  })
  name?: string | null;

  @StringFieldOptional({
    description: 'Position',
    example: 'Software Engineer',
  })
  position?: string | null;

  @EmailFieldOptional({
    description: 'Email',
    example: 'john.doe@example.com',
  })
  email?: string | null;

  @EnumFieldOptional(() => RoleType)
  @ApiProperty({
    description: 'Role',
    enum: RoleType,
    required: false,
    nullable: true,
  })
  role?: RoleType | null;

  @StringFieldOptional({
    description: 'Password confirmation (must match password when provided)',
    example: 'Newpass123',
  })
  @ValidateIf((o) => o.password != null)
  @SameAs('password', { message: 'confirmPassword must match password' })
  confirmPassword?: string;
}
