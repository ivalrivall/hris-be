import { EnumField, PasswordField, StringField, EmailField } from '../../../decorators/field.decorators.ts';
import { RoleType } from '../../../constants/role-type.ts';

export class CreateUserDto {
  @StringField({ minLength: 2, maxLength: 100 })
  readonly name!: string;

  @EmailField()
  readonly email!: string;

  @PasswordField({ minLength: 6 })
  readonly password!: string;

  @EnumField(() => RoleType)
  readonly role!: RoleType;
}
