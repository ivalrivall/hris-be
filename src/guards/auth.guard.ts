import { UnauthorizedException } from '@nestjs/common';
import type { IAuthGuard, Type } from '@nestjs/passport';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';

export function AuthGuard(
  options?: Partial<{ public: boolean }>,
): Type<IAuthGuard> {
  const strategies = ['jwt'];

  if (options?.public) {
    strategies.push('public');
  }

  class CustomAuthGuard extends NestAuthGuard(strategies) {
    // Delegate auth to passport strategy (JwtStrategy or PublicStrategy)
    // Ensure unauthorized requests throw proper 401 instead of generic Error
    handleRequest<TUser = any>(
      err: any,
      user: any,
      info: any,
    ): TUser {
      if (err) {
        throw err;
      }

      if (!user) {
        throw new UnauthorizedException('Unauthorized');
      }

      return user as TUser;
    }
  }

  return CustomAuthGuard;
}
