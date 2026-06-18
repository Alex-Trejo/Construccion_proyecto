/**
 * @fileoverview Interceptor Global — Sincronización de Identidad.
 *
 * Intercepta todas las peticiones HTTP entrantes. Si la petición está
 * autenticada (tiene request.user inyectado por el guard JWT), emite un
 * evento TCP (IDENTITY_PATTERNS.SYNC_USER) hacia ms-core para hacer el
 * upsert de la Persona y el Usuario en las shadow tables (sgc_db).
 *
 * Se usa fire-and-forget (emisión asíncrona) para no penalizar la
 * latencia de la petición HTTP.
 *
 * @module IdentitySyncInterceptor
 */

import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { IDENTITY_PATTERNS, MICROSERVICE_TOKENS } from '@sgc/shared';
import type { AuthenticatedUser } from './keycloak-jwt.strategy';

@Injectable()
export class IdentitySyncInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdentitySyncInterceptor.name);

  constructor(
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCoreClient: ClientProxy,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    // Si hay un usuario autenticado (la ruta está protegida por JWT Guard)
    if (user) {
      this.logger.debug(`Emitiendo SYNC_USER para: ${user.username}`);

      // Fire-and-forget: emitimos el evento a ms-core para sincronizar al
      // usuario en PostgreSQL. IMPORTANTE: el Observable de emit() es "cold",
      // así que DEBEMOS suscribirnos para que el evento se envíe realmente.
      // La suscripción es asíncrona y no bloquea la respuesta HTTP.
      this.msCoreClient
        .emit(IDENTITY_PATTERNS.SYNC_USER, {
          keycloakId: user.userId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
        })
        .subscribe({
          error: (err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`No se pudo emitir SYNC_USER (${user.username}): ${msg}`);
          },
        });
    }

    return next.handle();
  }
}
