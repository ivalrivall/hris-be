import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RoleType } from '../../constants/role-type.ts';
import { AuthUser } from '../../decorators/auth-user.decorator.ts';
import { Auth } from '../../decorators/http.decorators.ts';
import { UserDto } from '../user/dtos/user.dto.ts';
import type { UserEntity } from '../user/user.entity.ts';
import { UserService } from '../user/user.service.ts';
import { AuthService } from './auth.service.ts';
import { LoginPayloadDto } from './dto/login-payload.dto.ts';
import { UserLoginDto } from './dto/user-login.dto.ts';

@Controller('v1/auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private authService: AuthService,
    @Inject(UserService) private userService: UserService,
  ) {}

  @Post('login')
  @ApiBody({ type: UserLoginDto })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: LoginPayloadDto,
    description: 'User info with access token',
  })
  /**
   * Validate user credentials and issue a JWT token with user info if
   * credentials are valid.
   * @param userLoginDto User credentials
   * @returns User info with JWT token
   */
  async userLogin(
    @Body() userLoginDto: UserLoginDto,
  ): Promise<LoginPayloadDto> {
    const userEntity = await this.authService.validateUser(userLoginDto);

    const token = await this.authService.createAccessToken({
      userId: userEntity.id,
      role: userEntity.role,
    });

    return new LoginPayloadDto(userEntity.toDto(), token);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Auth([RoleType.USER, RoleType.ADMIN])
  @ApiOkResponse({ type: UserDto, description: 'current user info' })
  /**
   * Returns the current user data including last absence.
   */
  async getCurrentUser(@AuthUser() user: UserEntity): Promise<UserDto> {
    return this.userService.getUserWithLastAbsence(user.id);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Auth([RoleType.USER, RoleType.ADMIN])
  @ApiOkResponse({ type: Boolean, description: 'Logout result' })
  /**
   * Logs out the current user by advising the client to discard the JWT.
   *
   * @returns The logout operation result.
   */
  async logout(
    @Headers('authorization') authorization?: string,
  ): Promise<boolean> {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;
    await this.authService.logout(token);

    return true;
  }
}
