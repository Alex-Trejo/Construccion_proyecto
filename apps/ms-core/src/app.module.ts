/**
 * @fileoverview Módulo raíz de ms-core.
 *
 * Orquesta todos los módulos del microservicio:
 *   - ConfigModule: Fail-Fast de variables de entorno.
 *   - DatabaseModule: TypeORM + PostgreSQL.
 *   - DocumentModule: Pipeline SRI (sanitizar, validar XSD, APIs).
 *   - CommunicationModule: Correos recibidos, MinIO, queries TCP.
 *
 * @module AppModule
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  configValidationSchema,
  configValidationOptions,
} from './config/config.validation';
import { DatabaseModule } from './database/database.module';
import { DocumentModule } from './modules/document/document.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [
    // ── Fail-Fast Config ─────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validationSchema: configValidationSchema,
      validationOptions: configValidationOptions,
    }),

    // ── Base de Datos (TypeORM + PostgreSQL) ──────────────────────────────
    DatabaseModule,

    // ── Módulos de Dominio ────────────────────────────────────────────────
    IdentityModule,
    SupplierModule,
    DocumentModule,
    CommunicationModule,
  ],
})
export class AppModule {}
