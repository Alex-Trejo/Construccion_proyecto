/**
 * @fileoverview Helper — construye la metadata TCP a partir del usuario JWT.
 *
 * El `userId` (sub de Keycloak) se propaga en cada llamada a ms-core para
 * aplicar el AISLAMIENTO de datos (multi-tenancy): ms-core filtra por este id.
 *
 * @module tcp-metadata
 */

import { randomUUID } from 'node:crypto';
import type { TcpRequestMetadata } from '@sgc/shared';
import type { AuthenticatedUser } from './keycloak-jwt.strategy';

export function buildTcpMetadata(user: AuthenticatedUser): TcpRequestMetadata {
  return {
    correlationId: randomUUID(),
    userId: user.userId,
    timestamp: new Date().toISOString(),
  };
}
