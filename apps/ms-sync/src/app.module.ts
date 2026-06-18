/**
 * @fileoverview Módulo raíz de ms-sync (Worker IMAP).
 *
 * Responsabilidades:
 *   1. Fail-Fast: Valida variables de entorno al arrancar.
 *   2. Registra ClientProxy TCP hacia ms-core (para emitir eventos).
 *   3. Carga ScheduleModule para polling IMAP.
 *   4. Provee los adaptadores IMAP e inyecta dependencias.
 *
 * ⚠️ ms-sync NO se conecta a BD ni a MinIO.
 * Su única responsabilidad: correo → extraer adjuntos → emitir a ms-core.
 *
 * @module AppModule
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MICROSERVICE_TOKENS } from '@sgc/shared';

import {
  configValidationSchema,
  configValidationOptions,
} from './config/config.validation';

import { IMAP_CLIENT_PORT } from './domain/ports/imap-client.port';
import { ImapClientAdapter } from './infrastructure/adapters/imap-client.adapter';
import { ImapConnectionFactory } from './infrastructure/factories/imap-connection.factory';
import { EmailSyncCronService } from './application/services/email-sync-cron.service';
import { EmailProcessorService } from './application/services/email-processor.service';

@Module({
  imports: [
    // ── Fail-Fast Config ─────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validationSchema: configValidationSchema,
      validationOptions: configValidationOptions,
    }),

    // ── Schedule (Cron/Polling) ──────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── TCP Client hacia ms-core ─────────────────────────────────────────
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
    ]),
  ],
  providers: [
    // ── Infrastructure ─────────────────────────────────────────────────
    ImapConnectionFactory,
    {
      provide: IMAP_CLIENT_PORT,
      useClass: ImapClientAdapter,
    },

    // ── Application Services ───────────────────────────────────────────
    EmailProcessorService,
    EmailSyncCronService,
  ],
})
export class AppModule {}
