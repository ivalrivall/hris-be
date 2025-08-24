// src/guards/roles.guard.ts
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from 'jsonwebtoken';

import type { RoleType } from '../constants/role-type.ts';
import type { UserEntity } from '../modules/user/user.entity.ts';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    console.log('RolesGuard: Checking roles...');
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    console.log('RolesGuard: Required roles:', requiredRoles);

    if (!requiredRoles) {
      console.log('RolesGuard: No required roles set');

      return true; // Allow access if no required roles are set
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    console.log('RolesGuard: User:', user);

    const userRole = user?.role;
    console.log('RolesGuard: User role:', userRole);

    if (!userRole) {
      console.log('RolesGuard: User role is not set');

      throw new UnauthorizedException('Unauthorized');
    }

    return requiredRoles.includes(userRole);
  }
}
