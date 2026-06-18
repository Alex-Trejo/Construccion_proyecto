/**
 * @fileoverview Caso de uso — Generar Pre-Signed URL para descargar adjunto.
 *
 * NO retorna el archivo. Genera una URL firmada de MinIO (válida 5 min)
 * que el frontend usará para descargar directamente del Object Storage.
 *
 * @module GetAttachmentDownloadUrlUseCase
 */

import { Injectable, Inject, Logger } from '@nestjs/common';

import {
  type ReceivedEmailRepositoryPort,
  RECEIVED_EMAIL_REPOSITORY_PORT,
} from '../../domain/ports/received-email-repository.port';
import {
  type ObjectStoragePort,
  OBJECT_STORAGE_PORT,
} from '../../domain/ports/object-storage.port';

/** Resultado de la generación de URL. */
export interface DownloadUrlResult {
  readonly url: string;
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  readonly expiresInSeconds: number;
}

/** Duración de la Pre-Signed URL: 5 minutos. */
const PRESIGNED_URL_EXPIRY_SECONDS = 300;

@Injectable()
export class GetAttachmentDownloadUrlUseCase {
  private readonly logger = new Logger(GetAttachmentDownloadUrlUseCase.name);

  constructor(
    @Inject(RECEIVED_EMAIL_REPOSITORY_PORT)
    private readonly emailRepo: ReceivedEmailRepositoryPort,

    @Inject(OBJECT_STORAGE_PORT)
    private readonly storage: ObjectStoragePort,
  ) {}

  /**
   * Genera una Pre-Signed URL para un adjunto específico.
   *
   * @param emailId - ID del correo padre.
   * @param attachmentId - ID del adjunto.
   * @returns URL firmada + metadata, o null si no existe.
   */
  async execute(
    emailId: string,
    attachmentId: string,
  ): Promise<DownloadUrlResult | null> {
    this.logger.debug(
      `Generando URL para adjunto: email=${emailId}, attachment=${attachmentId}`,
    );

    const email = await this.emailRepo.findById(emailId);
    if (!email) {
      this.logger.warn(`Correo ${emailId} no encontrado`);
      return null;
    }

    const attachment = email.attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      this.logger.warn(
        `Adjunto ${attachmentId} no encontrado en correo ${emailId}`,
      );
      return null;
    }

    const url = await this.storage.getPresignedUrl(
      attachment.storageBucket,
      attachment.storageKey,
      PRESIGNED_URL_EXPIRY_SECONDS,
    );

    return {
      url,
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
      expiresInSeconds: PRESIGNED_URL_EXPIRY_SECONDS,
    };
  }
}
