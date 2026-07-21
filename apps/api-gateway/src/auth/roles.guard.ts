/**
 * @fileoverview RolesGuard — autorización por roles del JWT de Keycloak.
 *
 * Lee los roles requeridos del decorador @Roles y los compara contra los
 * roles del usuario autenticado (request.user.roles, poblados desde el JWT
 * por KeycloakJwtStrategy). No consulta la BD: los roles vienen del token.
 *
 * @module roles.guard
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from './roles.decorator';
import type { AuthenticatedUser } from './keycloak-jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin @Roles → no se exige rol específico (solo autenticación, vía JwtAuthGuard).
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const roles = request.user?.roles ?? [];

    const allowed = required.some((r) => roles.includes(r));
    if (!allowed) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los roles: ${required.join(', ')}, contacte con un Administrador.`,
      );
    }
    return true;
  }
}
