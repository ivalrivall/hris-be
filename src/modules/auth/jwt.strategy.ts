import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { RoleType } from '../../constants/role-type.ts';
import { TokenType } from '../../constants/token-type.ts';
import { ApiConfigService } from '../../shared/services/api-config.service.ts';
import type { UserEntity } from '../user/user.entity.ts';
import { UserService } from '../user/user.service.ts';
import { AuthService } from './auth.service.ts';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ApiConfigService) configService: ApiConfigService,
    @Inject(UserService) private userService: UserService,
    @Inject(AuthService) private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.authConfig.publicKey,
    });
  }

  async validate(args: {
    userId: Uuid;
    role: RoleType;
    type: TokenType;
    jti?: string;
  }): Promise<UserEntity> {
    if (args.type !== TokenType.ACCESS_TOKEN) {
      throw new UnauthorizedException();
    }

    // Check revocation (blacklist) by jti
    if (this.authService.isTokenRevoked(args.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // First find user by ID only
    const user = await this.userService.findOne({
      id: args.userId as never,
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Verify token role matches user's actual role
    if (user.role !== args.role) {
      throw new UnauthorizedException('Token role does not match user role');
    }

    return user;
  }
}
