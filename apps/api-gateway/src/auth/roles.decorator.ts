/**
 * @fileoverview Decorador @Roles — marca los roles requeridos por una ruta.
 * Los nombres son dinámicos (los que existan en Keycloak); no hay enum fijo.
 * @module roles.decorator
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
