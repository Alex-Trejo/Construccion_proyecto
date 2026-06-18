/**
 * @fileoverview Estrategia Passport JWT — Validación contra Keycloak.
 *
 * Valida el Bearer token de cada petición obteniendo la clave pública
 * de firma directamente del endpoint JWKS de Keycloak (rotación
 * automática vía jwks-rsa). Verifica el issuer y la firma RS256.
 *
 * @module KeycloakJwtStrategy
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

/** Claims relevantes del access token de Keycloak. */
interface KeycloakJwtPayload {
  readonly sub: string;
  readonly preferred_username?: string;
  readonly email?: string;
  readonly given_name?: string;
  readonly family_name?: string;
  readonly realm_access?: { readonly roles?: ReadonlyArray<string> };
}

/** Usuario autenticado adjuntado a `request.user`. */
export interface AuthenticatedUser {
  readonly userId: string;
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: ReadonlyArray<string>;
}

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const issuer = configService.getOrThrow<string>('KEYCLOAK_ISSUER_URL');

    super({
      // Obtiene la clave de firma desde el JWKS de Keycloak (con caché).
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/protocol/openid-connect/certs`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer,
      algorithms: ['RS256'],
    });
  }

  /**
   * Se ejecuta tras validar firma + issuer. Lo que se retorna queda
   * disponible como `request.user`.
   */
  validate(payload: KeycloakJwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      username: payload.preferred_username ?? '',
      email: payload.email ?? '',
      firstName: payload.given_name ?? '',
      lastName: payload.family_name ?? '',
      roles: payload.realm_access?.roles ?? [],
    };
  }
}
