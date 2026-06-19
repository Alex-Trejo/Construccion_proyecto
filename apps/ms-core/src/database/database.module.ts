/**
 * @fileoverview Módulo de Base de Datos — TypeORM + PostgreSQL.
 *
 * Configura TypeOrmModule.forRootAsync con variables de entorno
 * ya validadas por el Fail-Fast de ConfigModule.
 *
 * Todas las entidades ORM del sistema se registran aquí centralmente.
 * Cada módulo de dominio puede usar TypeOrmModule.forFeature() para
 * inyectar repositorios específicos.
 *
 * @module DatabaseModule
 */

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// ── Communication entities ───────────────────────────────────────────────────
import { ReceivedEmailOrmEntity } from '../modules/communication/infrastructure/persistence/received-email.orm-entity';
import { EmailAttachmentOrmEntity } from '../modules/communication/infrastructure/persistence/email-attachment.orm-entity';

// ── Supplier entities (se crearán en esta fase) ──────────────────────────────
import { SupplierOrmEntity } from '../modules/supplier/infrastructure/persistence/supplier.orm-entity';

// ── Document entities ────────────────────────────────────────────────────────
import { IncomingInvoiceOrmEntity } from '../modules/document/infrastructure/persistence/incoming-invoice.orm-entity';
import { CompanyOrmEntity } from '../modules/supplier/infrastructure/persistence/company.orm-entity';
import { TipoComprobanteOrmEntity } from '../modules/document/infrastructure/persistence/tipo-comprobante.orm-entity';
import { DocumentOrmEntity } from '../modules/document/infrastructure/persistence/document.orm-entity';
import { DocumentItemOrmEntity } from '../modules/document/infrastructure/persistence/document-item.orm-entity';
import { DocumentTaxOrmEntity } from '../modules/document/infrastructure/persistence/document-tax.orm-entity';

// ── Identity entities (Shadow Tables de Keycloak) ────────────────────────────
import { RolOrmEntity } from '../modules/identity/infrastructure/persistence/rol.orm-entity';
import { PersonaOrmEntity } from '../modules/identity/infrastructure/persistence/persona.orm-entity';
import { UsuarioOrmEntity } from '../modules/identity/infrastructure/persistence/usuario.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.getOrThrow<string>('POSTGRES_HOST'),
        port: config.getOrThrow<number>('POSTGRES_PORT'),
        username: config.getOrThrow<string>('POSTGRES_USER'),
        password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
        database: config.getOrThrow<string>('POSTGRES_DB'),

        // ── Entidades registradas centralmente ─────────────────────────
        entities: [
          // Communication
          ReceivedEmailOrmEntity,
          EmailAttachmentOrmEntity,
          // Supplier
          SupplierOrmEntity,
          CompanyOrmEntity,
          // Document
          IncomingInvoiceOrmEntity,
          TipoComprobanteOrmEntity,
          DocumentOrmEntity,
          DocumentItemOrmEntity,
          DocumentTaxOrmEntity,
          // Identity (Shadow Tables de Keycloak — Rúbrica 3.1)
          RolOrmEntity,
          PersonaOrmEntity,
          UsuarioOrmEntity,
        ],

        // ── Configuración ──────────────────────────────────────────────
        synchronize: config.getOrThrow<string>('NODE_ENV') === 'development',
        logging: config.getOrThrow<string>('NODE_ENV') === 'development',
        autoLoadEntities: false, // Registro explícito (más seguro)

        // ── Pool de conexiones ─────────────────────────────────────────
        extra: {
          max: 20,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
