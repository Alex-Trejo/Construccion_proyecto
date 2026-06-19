/**
 * @fileoverview Módulo raíz del API Gateway.
 *
 * Responsabilidades:
 * 1. Fail-Fast: Valida variables de entorno al arrancar.
 * 2. Registra ClientProxy TCP hacia ms-core y ms-sync.
 * 3. Carga el módulo de autenticación Keycloak/JWT.
 *
 * @module AppModule
 */

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MICROSERVICE_TOKENS } from '@sgc/shared';

import {
  configValidationSchema,
  configValidationOptions,
} from './config/config.validation';
import { AuthModule } from './auth/auth.module';
import { CommunicationController } from './controllers/communication.controller';
import { SupplierController } from './controllers/supplier.controller';
import { HealthController } from './controllers/health.controller';
import { UserController } from './controllers/user.controller';
import { RoleController } from './controllers/role.controller';
import { DocumentController } from './controllers/document.controller';
import { ReportsController } from './controllers/reports.controller';
import { UserImapController } from './controllers/user-imap.controller';
import { IdentitySyncInterceptor } from './auth/identity-sync.interceptor';
import { KeycloakAdminService } from './keycloak/keycloak-admin.service';

@Module({
  imports: [
    // ── Fail-Fast Config ─────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validationSchema: configValidationSchema,
      validationOptions: configValidationOptions,
    }),

    // ── TCP Clients (ms-core + ms-sync) ──────────────────────────────────
    ClientsModule.registerAsync([
      {
        name: MICROSERVICE_TOKENS.MS_CORE_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.getOrThrow<string>('MS_CORE_TCP_HOST'),
            port: config.getOrThrow<number>('MS_CORE_TCP_PORT'),
          },
        }),
      },
      {
        name: MICROSERVICE_TOKENS.MS_SYNC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.getOrThrow<string>('MS_SYNC_TCP_HOST'),
            port: config.getOrThrow<number>('MS_SYNC_TCP_PORT'),
          },
        }),
      },
    ]),

    // ── Autenticación (JWT/Keycloak) ─────────────────────────────────────
    AuthModule,

    // ── Métricas Prometheus (expone /api/v1/metrics) ─────────────────────
    PrometheusModule.register(),
  ],
  controllers: [
    HealthController,
    CommunicationController,
    SupplierController,
    UserController,
    RoleController,
    DocumentController,
    ReportsController,
    UserImapController,
  ],
  providers: [
    KeycloakAdminService,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdentitySyncInterceptor,
    },
  ],
})
export class AppModule {}
