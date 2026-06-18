/**
 * @fileoverview Módulo de Autenticación del API Gateway.
 *
 * Registra Passport con la estrategia JWT de Keycloak. Cualquier
 * controller puede proteger sus rutas con `@UseGuards(JwtAuthGuard)`.
 *
 * @module AuthModule
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { KeycloakJwtStrategy } from './keycloak-jwt.strategy';

@Module({
  imports: [ConfigModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [KeycloakJwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
