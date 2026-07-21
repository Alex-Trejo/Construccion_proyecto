/**
 * @fileoverview @CurrentUser() — inyecta el usuario autenticado (request.user).
 * @module current-user.decorator
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './keycloak-jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
