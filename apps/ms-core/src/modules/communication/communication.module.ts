/**
 * @fileoverview Módulo de Comunicaciones (ms-core).
 *
 * Responsabilidades:
 *   - Persiste correos recibidos de ms-sync (vía TCP event).
 *   - Sube adjuntos (XML/PDF) a MinIO.
 *   - Expone queries TCP para el api-gateway (listado, detalle, download URL).
 *   - Conecta XMLs recibidos al pipeline SRI (vía DocumentModule).
 *
 * @module CommunicationModule
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OBJECT_STORAGE_PORT } from './domain/ports/object-storage.port';
import { RECEIVED_EMAIL_REPOSITORY_PORT } from './domain/ports/received-email-repository.port';

import { MinioAdapter } from './infrastructure/adapters/minio.adapter';
import { ReceivedEmailOrmEntity } from './infrastructure/persistence/received-email.orm-entity';
import { EmailAttachmentOrmEntity } from './infrastructure/persistence/email-attachment.orm-entity';
import { TypeOrmReceivedEmailRepository } from './infrastructure/persistence/typeorm-received-email.repository';

import { DocumentReceivedHandler } from './application/handlers/document-received.handler';
import { CommunicationTcpController } from './application/controllers/communication-tcp.controller';
import { ListReceivedEmailsUseCase } from './application/use-cases/list-received-emails.use-case';
import { GetReceivedEmailDetailUseCase } from './application/use-cases/get-received-email-detail.use-case';
import { GetAttachmentDownloadUrlUseCase } from './application/use-cases/get-attachment-download-url.use-case';

import { DocumentModule } from '../document/document.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReceivedEmailOrmEntity, EmailAttachmentOrmEntity]),
    // Importa DocumentModule para acceder a ProcessSriXmlUseCase y AutoProvisionEntitiesUseCase
    DocumentModule,
  ],
  controllers: [DocumentReceivedHandler, CommunicationTcpController],
  providers: [
    // ── Infrastructure Adapters ──────────────────────────────────────────
    {
      provide: OBJECT_STORAGE_PORT,
      useClass: MinioAdapter,
    },
    {
      provide: RECEIVED_EMAIL_REPOSITORY_PORT,
      useClass: TypeOrmReceivedEmailRepository,
    },

    // ── Use Cases ────────────────────────────────────────────────────────
    ListReceivedEmailsUseCase,
    GetReceivedEmailDetailUseCase,
    GetAttachmentDownloadUrlUseCase,
  ],
  exports: [OBJECT_STORAGE_PORT],
})
export class CommunicationModule {}
