/**
 * @fileoverview Adaptador — MinIO (S3-compatible Object Storage).
 *
 * Implementa ObjectStoragePort usando la librería oficial `minio`.
 * Se conecta al MinIO definido en Docker Compose.
 *
 * Operaciones:
 *   - uploadFile: Sube un Buffer al bucket.
 *   - getPresignedUrl: Genera URL firmada para descarga directa (5 min default).
 *   - ensureBucketExists: Crea el bucket si no existe (idempotente).
 *
 * @module MinioAdapter
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

import {
  type ObjectStoragePort,
  type UploadOptions,
  type UploadResult,
} from '../../domain/ports/object-storage.port';

@Injectable()
export class MinioAdapter implements ObjectStoragePort, OnModuleInit {
  private readonly logger = new Logger(MinioAdapter.name);
  private readonly minioClient: Minio.Client;
  private readonly defaultBucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpointUrl = new URL(
      this.configService.getOrThrow<string>('MINIO_ENDPOINT'),
    );

    this.minioClient = new Minio.Client({
      endPoint: endpointUrl.hostname,
      port: Number(endpointUrl.port) || 9000,
      useSSL: endpointUrl.protocol === 'https:',
      accessKey: this.configService.getOrThrow<string>('MINIO_ROOT_USER'),
      secretKey: this.configService.getOrThrow<string>('MINIO_ROOT_PASSWORD'),
    });

    this.defaultBucket = this.configService.getOrThrow<string>(
      'MINIO_BUCKET_NAME',
    );

    this.logger.log(
      `MinIO configurado: ${endpointUrl.host}, bucket: ${this.defaultBucket}`,
    );
  }

  /**
   * Al arrancar, asegura que el bucket por defecto exista.
   */
  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists(this.defaultBucket);
  }

  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    this.logger.debug(
      `Subiendo archivo: ${options.key} (${options.content.length} bytes) → ${options.bucket}`,
    );

    const metadata: Record<string, string> = {
      'Content-Type': options.contentType,
      ...(options.metadata ?? {}),
    };

    const uploadResult = await this.minioClient.putObject(
      options.bucket,
      options.key,
      options.content,
      options.content.length,
      metadata,
    );

    this.logger.log(`✅ Archivo subido: ${options.bucket}/${options.key}`);

    return {
      bucket: options.bucket,
      key: options.key,
      etag: uploadResult.etag,
    };
  }

  async getPresignedUrl(
    bucket: string,
    key: string,
    expirySeconds: number,
  ): Promise<string> {
    this.logger.debug(
      `Generando Pre-Signed URL: ${bucket}/${key} (expira: ${expirySeconds}s)`,
    );

    const url = await this.minioClient.presignedGetObject(
      bucket,
      key,
      expirySeconds,
    );

    return url;
  }

  async ensureBucketExists(bucket: string): Promise<void> {
    const exists = await this.minioClient.bucketExists(bucket);

    if (!exists) {
      await this.minioClient.makeBucket(bucket);
      this.logger.log(`🪣 Bucket creado: ${bucket}`);
    } else {
      this.logger.debug(`Bucket ya existe: ${bucket}`);
    }
  }
}
