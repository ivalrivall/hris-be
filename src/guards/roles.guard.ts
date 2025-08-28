// src/guards/roles.guard.ts
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    this.logger.log('Checking roles...');
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    this.logger.log('Required roles:', requiredRoles);

    if (!requiredRoles) {
      this.logger.log('No required roles set');

      return true; // Allow access if no required roles are set
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    this.logger.log('User:', user);

    const userRole = user?.role;
    this.logger.log('User role:', userRole);

    if (!userRole) {
      this.logger.log('User role is not set');

      throw new UnauthorizedException('Unauthorized');
    }

    return requiredRoles.includes(userRole);
  }
}
