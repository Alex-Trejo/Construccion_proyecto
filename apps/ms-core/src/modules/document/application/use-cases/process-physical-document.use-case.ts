/**
 * @fileoverview Caso de uso — Procesar comprobante FÍSICO (OCR).
 *
 * Sube la imagen a MinIO, genera una Pre-Signed URL y la envía a OpenAI
 * Vision para extraer los datos. Devuelve datos pre-llenados para revisión
 * humana (no persiste el comprobante todavía).
 *
 * @module ProcessPhysicalDocumentUseCase
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { type IOcrResultDto } from '@sgc/shared';

import {
  type ObjectStoragePort,
  OBJECT_STORAGE_PORT,
} from '../../../communication/domain/ports/object-storage.port';
import { type OcrPort, OCR_PORT } from '../../domain/ports/ocr.port';

export interface PhysicalDocumentInput {
  readonly content: Buffer;
  readonly filename: string;
  readonly contentType: string;
}

@Injectable()
export class ProcessPhysicalDocumentUseCase {
  private readonly logger = new Logger(ProcessPhysicalDocumentUseCase.name);
  private readonly bucket: string;

  constructor(
    @Inject(OBJECT_STORAGE_PORT)
    private readonly storage: ObjectStoragePort,
    @Inject(OCR_PORT)
    private readonly ocr: OcrPort,
    config: ConfigService,
  ) {
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET_NAME');
  }

  async execute(
    file: PhysicalDocumentInput,
    ownerId: string | null,
  ): Promise<IOcrResultDto> {
    const safeName = file.filename.replace(/[^\w.-]/g, '_');
    const key = `documents/${ownerId ?? 'system'}/${randomUUID()}-${safeName}`;

    await this.storage.uploadFile({
      bucket: this.bucket,
      key,
      content: file.content,
      contentType: file.contentType,
    });
    this.logger.log(`Imagen subida a MinIO: ${key}`);

    // Pre-Signed URL para que OpenAI pueda leer la imagen.
    const url = await this.storage.getPresignedUrl(this.bucket, key, 300);
    return this.ocr.extractFromImageUrl(url, key);
  }
}
