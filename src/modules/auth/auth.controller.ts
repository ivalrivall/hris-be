import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RoleType } from '../../constants/role-type.ts';
import { AuthUser } from '../../decorators/auth-user.decorator.ts';
import { Auth } from '../../decorators/http.decorators.ts';
import { UserDto } from '../user/dtos/user.dto.ts';
import type { UserEntity } from '../user/user.entity.ts';
import { AuthService } from './auth.service.ts';
import { LoginPayloadDto } from './dto/login-payload.dto.ts';
import { UserLoginDto } from './dto/user-login.dto.ts';

@Controller('v1/auth')
@ApiTags('auth')
export class AuthController {
  constructor(@Inject(AuthService) private authService: AuthService) {}

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
  @Auth([RoleType.USER, RoleType.ADMIN])
  @ApiOkResponse({ type: UserDto, description: 'current user info' })
  /**
   * Returns the current user data.
   *
   * @remarks
   * Only accessible when logged in.
   *
   * @returns The current user data.
   */
  getCurrentUser(@AuthUser() user: UserEntity): UserDto {
    return user.toDto();
  }

  @Post('verify_token')
  @HttpCode(HttpStatus.OK)
  @Auth([RoleType.USER, RoleType.ADMIN])
  @ApiOkResponse({
    type: Boolean,
    description: 'Token validation result',
  })
  /**
   * Verifies the current token.
   *
   * @remarks
   * Returns true when the token is valid.
   *
   * @returns The token validation result.
   */
  async verifyToken(): Promise<boolean> {
    // Since the Auth decorator ensures a valid token is present,
    // if we reach this point the token is already validated
    return true;
  }
}
