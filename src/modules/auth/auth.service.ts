import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { validateHash } from '../../common/utils.ts';
import type { RoleType } from '../../constants/role-type.ts';
import { TokenType } from '../../constants/token-type.ts';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception.ts';
import { GeneratorProvider } from '../../providers/generator.provider.ts';
import { ApiConfigService } from '../../shared/services/api-config.service.ts';
import type { UserEntity } from '../user/user.entity.ts';
import { UserService } from '../user/user.service.ts';
import { TokenPayloadDto } from './dto/token-payload.dto.ts';
import type { UserLoginDto } from './dto/user-login.dto.ts';

@Injectable()
export class AuthService {
  // In-memory blacklist of revoked JWT IDs (jti) with expiry timestamps (epoch seconds)
  private readonly revokedJtis = new Map<string, number>();

  constructor(
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(ApiConfigService) private configService: ApiConfigService,
    @Inject(UserService) private userService: UserService,
  ) {}

  private cleanupRevoked() {
    const now = Math.floor(Date.now() / 1000);

    for (const [jti, exp] of this.revokedJtis.entries()) {
      if (exp <= now) {
        this.revokedJtis.delete(jti);
      }
    }
  }

  isTokenRevoked(jti?: string): boolean {
    if (!jti) {
      return false;
    }

    this.cleanupRevoked();
    const exp = this.revokedJtis.get(jti);

    if (!exp) {
      return false;
    }

    // If entry exists but past exp, clean and allow
    if (exp <= Math.floor(Date.now() / 1000)) {
      this.revokedJtis.delete(jti);

      return false;
    }

    return true;
  }

  async createAccessToken(data: {
    role: RoleType;
    userId: Uuid;
  }): Promise<TokenPayloadDto> {
    const jti = GeneratorProvider.uuid();
    const expiresIn = this.configService.authConfig.jwtExpirationTime;

    return new TokenPayloadDto({
      expiresIn,
      token: await this.jwtService.signAsync(
        {
          userId: data.userId,
          type: TokenType.ACCESS_TOKEN,
          role: data.role,
          jti,
        },
        { expiresIn },
      ),
    });
  }

  async validateUser(userLoginDto: UserLoginDto): Promise<UserEntity> {
    const user = await this.userService.findOne({
      email: userLoginDto.email,
    });

    const isPasswordValid = await validateHash(
      userLoginDto.password,
      user?.password,
    );

    if (!isPasswordValid) {
      throw new UserNotFoundException();
    }

    return user!;
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const payload: any = await this.jwtService.verifyAsync(token);

      if (this.isTokenRevoked(payload?.jti)) {
        return false;
      }

      return Boolean(payload);
    } catch {
      return false;
    }
  }

  /**
   * Logout a user by revoking the JWT so it cannot be used again until it expires.
   */
  async logout(token?: string): Promise<boolean> {
    if (!token) {
      return true;
    }

    try {
      // Verify to get payload (and ensure signature is valid)
      const payload: any = await this.jwtService.verifyAsync(token);
      const exp = typeof payload?.exp === 'number' ? payload.exp : null;
      const jti: string | undefined = payload?.jti;

      if (!jti) {
        // If token has no jti, we cannot reliably revoke it; treat as best-effort
        return true;
      }

      // If token already expired, nothing to do
      if (exp && exp <= Math.floor(Date.now() / 1000)) {
        return true;
      }

      // Store jti until token expiry (fallback to configured TTL if exp missing)
      const fallbackExp =
        Math.floor(Date.now() / 1000) +
        this.configService.authConfig.jwtExpirationTime;
      this.revokedJtis.set(jti, exp ?? fallbackExp);
    } catch {
      // Invalid or expired token; consider logout successful
      return true;
    }

    return true;
  }
}
