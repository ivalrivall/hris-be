import { RoleType } from '../../../constants/role-type.ts';
import {
  EmailField,
  EnumField,
  PasswordField,
  PhoneFieldOptional,
  StringField,
} from '../../../decorators/field.decorators.ts';

export class CreateUserDto {
  @StringField({ minLength: 2, maxLength: 100 })
  readonly name!: string;

  @EmailField()
  readonly email!: string;

  @PasswordField({ minLength: 6 })
  readonly password!: string;

  @PhoneFieldOptional({
    nullable: true,
    description: 'User phone number',
    example: '+1234567890',
  })
  readonly phone?: string | null;

  @EnumField(() => RoleType)
  readonly role!: RoleType;
}
