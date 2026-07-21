/**
 * @fileoverview Handler TCP — Procesa documentos recibidos de ms-sync.
 *
 * Escucha el evento SYNC_PATTERNS.DOCUMENT_RECEIVED emitido por ms-sync.
 *
 * Flujo:
 *   1. Recibe DocumentReceivedPayload (base64 + metadata del correo).
 *   2. Deduplicación por Message-ID.
 *   3. Decodifica base64 → Buffer.
 *   4. Sube el archivo a MinIO (bucket/communications/YYYY-MM/emailId/filename).
 *   5. Guarda ReceivedEmail + EmailAttachment en BD.
 *   6. Si es XML → Sanitiza y valida contra XSD vía FetchAndSanitizeXmlUseCase.
 *
 * @module DocumentReceivedHandler
 */

import { Controller, Inject, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { SYNC_PATTERNS } from '@sgc/shared';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';

import {
  type ObjectStoragePort,
  OBJECT_STORAGE_PORT,
} from '../../domain/ports/object-storage.port';
import {
  type ReceivedEmailRepositoryPort,
  RECEIVED_EMAIL_REPOSITORY_PORT,
} from '../../domain/ports/received-email-repository.port';
import { ReceivedEmail } from '../../domain/entities/received-email.entity';
import { EmailAttachmentEntity } from '../../domain/entities/email-attachment.entity';
import type { UploadResult } from '../../domain/ports/object-storage.port';
import { ProcessSriXmlUseCase } from '../../../document/application/use-cases/process-sri-xml.use-case';

/** Payload recibido de ms-sync (debe coincidir con DocumentReceivedPayload). */
interface IncomingDocumentPayload {
  /** Dueño del correo (userId del JWT). Puede faltar en eventos legados. */
  readonly userId?: string;
  readonly filename: string;
  readonly extension: string;
  readonly contentBase64: string;
  readonly contentType: string;
  readonly size: number;
  readonly emailFrom: string;
  readonly emailSubject: string;
  readonly emailDate: string;
  readonly emailMessageId: string;
}

@Controller()
export class DocumentReceivedHandler {
  private readonly logger = new Logger(DocumentReceivedHandler.name);
  private readonly bucketName: string;

  constructor(
    @Inject(OBJECT_STORAGE_PORT)
    private readonly storage: ObjectStoragePort,

    @Inject(RECEIVED_EMAIL_REPOSITORY_PORT)
    private readonly emailRepo: ReceivedEmailRepositoryPort,

    private readonly processSriXmlUseCase: ProcessSriXmlUseCase,

    configService: ConfigService,
  ) {
    this.bucketName = configService.getOrThrow<string>('MINIO_BUCKET_NAME');
  }

  /**
   * Escucha eventos de documentos recibidos desde ms-sync.
   */
  @EventPattern(SYNC_PATTERNS.DOCUMENT_RECEIVED)
  async handleDocumentReceived(
    payload: IncomingDocumentPayload,
  ): Promise<void> {
    this.logger.log(
      `📥 Documento recibido: ${payload.filename} de ${payload.emailFrom}`,
    );

    const ownerId = payload.userId ?? null;

    try {
      // ── 1. Buscar el correo por Message-ID (dedup a nivel de ADJUNTO) ────
      // Un mismo correo llega como VARIOS eventos (uno por adjunto). Si ya
      // existe el correo, NO se descarta: se AÑADE el nuevo adjunto (p. ej. el
      // XML que llega después del PDF). Solo se ignora si ESE mismo adjunto
      // (por nombre) ya estaba guardado.
      const existing = await this.emailRepo.findByMessageId(
        payload.emailMessageId,
        ownerId,
      );

      if (existing?.attachments.some((a) => a.filename === payload.filename)) {
        this.logger.debug(
          `Adjunto ${payload.filename} de ${payload.emailMessageId} ya existe. Ignorando duplicado.`,
        );
        return;
      }

      // ── 2. Decodificar base64 a Buffer ──────────────────────────────────
      const fileBuffer = Buffer.from(payload.contentBase64, 'base64');

      // ── 3. Subir el adjunto a MinIO ─────────────────────────────────────
      const emailId = existing?.id ?? randomUUID();
      const datePrefix = this.getDatePrefix(payload.emailDate);
      const storageKey = `communications/${datePrefix}/${emailId}/${payload.filename}`;
      const uploadResult = await this.uploadAttachment(
        fileBuffer,
        storageKey,
        payload,
      );

      // ── 4. Crear el adjunto y persistirlo ───────────────────────────────
      const attachment = new EmailAttachmentEntity({
        id: randomUUID(),
        receivedEmailId: emailId,
        filename: payload.filename,
        extension: payload.extension,
        contentType: payload.contentType,
        size: payload.size,
        storageBucket: uploadResult.bucket,
        storageKey: uploadResult.key,
        createdAt: new Date(),
      });

      // Si el correo ya existía → se le AÑADE el adjunto; si no → se crea.
      const receivedEmail = new ReceivedEmail({
        id: emailId,
        ownerId: existing?.ownerId ?? ownerId,
        emailFrom: existing?.emailFrom ?? payload.emailFrom,
        emailSubject: existing?.emailSubject ?? payload.emailSubject,
        emailDate: existing?.emailDate ?? new Date(payload.emailDate),
        emailMessageId: payload.emailMessageId,
        attachments: [...(existing?.attachments ?? []), attachment],
        createdAt: existing?.createdAt ?? new Date(),
      });

      await this.emailRepo.save(receivedEmail);

      this.logger.log(
        existing
          ? `💾 Adjunto añadido al correo ${emailId}: ${payload.filename}`
          : `💾 Correo guardado en BD: ${emailId} (${payload.filename})`,
      );

      // ── 5. Si es XML → Ejecutar pipeline SRI completo ──────────────────
      if (payload.extension === 'xml') {
        await this.processXmlAttachment(fileBuffer, payload.filename, ownerId);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Error procesando documento ${payload.filename}: ${errorMsg}`,
      );
    }
  }

  /** Sube un adjunto a MinIO con la metadata del correo. */
  private async uploadAttachment(
    content: Buffer,
    storageKey: string,
    payload: IncomingDocumentPayload,
  ): Promise<UploadResult> {
    const uploadResult = await this.storage.uploadFile({
      bucket: this.bucketName,
      key: storageKey,
      content,
      contentType: payload.contentType,
      metadata: {
        'x-sgc-email-from': payload.emailFrom,
        'x-sgc-email-subject': payload.emailSubject,
        'x-sgc-original-filename': payload.filename,
      },
    });
    this.logger.log(
      `☁️ Archivo subido a MinIO: ${uploadResult.bucket}/${uploadResult.key}`,
    );
    return uploadResult;
  }

  /**
   * Procesa un XML adjunto ejecutando el pipeline completo:
   * sanitiza, valida contra XSD, parsea los datos fiscales y
   * auto-crea el proveedor en BD si no existe.
   */
  private async processXmlAttachment(
    fileBuffer: Buffer,
    filename: string,
    ownerId: string | null,
  ): Promise<void> {
    this.logger.log(`🔗 Iniciando pipeline SRI para XML: ${filename}`);

    const rawXml = fileBuffer.toString('utf-8');
    const result = await this.processSriXmlUseCase.execute(
      rawXml,
      filename,
      ownerId,
    );

    if (result.success) {
      this.logger.log(
        `✅ Pipeline SRI completado exitosamente para: ${filename}`,
      );
    } else {
      this.logger.warn(
        `⚠️ Fallo en pipeline SRI para: ${filename} — ${result.errorMessage}`,
      );
    }
  }

  /**
   * Genera un prefijo de fecha para organizar archivos en MinIO.
   * Formato: "YYYY-MM" (ej: "2026-06").
   */
  private getDatePrefix(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
