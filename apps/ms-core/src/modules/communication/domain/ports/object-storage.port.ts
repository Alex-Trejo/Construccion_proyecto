/**
 * @fileoverview Puerto — Object Storage (S3-compatible / MinIO).
 *
 * Abstrae las operaciones de almacenamiento de archivos.
 * La implementación concreta (MinioAdapter) vive en Infrastructure.
 *
 * @module ObjectStoragePort
 */

/** Resultado de una operación de subida exitosa. */
export interface UploadResult {
  /** Nombre del bucket donde se almacenó. */
  readonly bucket: string;
  /** Key (path) del objeto almacenado. */
  readonly key: string;
  /** ETag retornado por MinIO/S3 (hash del contenido). */
  readonly etag: string;
}

/** Opciones para la subida de un archivo. */
export interface UploadOptions {
  /** Nombre del bucket destino. */
  readonly bucket: string;
  /** Key (path) del objeto. Ej: "communications/2024-01/uuid/factura.xml". */
  readonly key: string;
  /** Contenido del archivo como Buffer. */
  readonly content: Buffer;
  /** MIME type del archivo. */
  readonly contentType: string;
  /** Metadata adicional (opcional). */
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface ObjectStoragePort {
  /**
   * Sube un archivo al Object Storage.
   *
   * @param options - Opciones de subida (bucket, key, content, contentType).
   * @returns Resultado con bucket, key y etag.
   */
  uploadFile(options: UploadOptions): Promise<UploadResult>;

  /**
   * Genera una Pre-Signed URL para descarga directa.
   *
   * @param bucket - Nombre del bucket.
   * @param key - Key del objeto.
   * @param expirySeconds - Tiempo de expiración en segundos (default: 300 = 5 min).
   * @returns URL firmada válida por el tiempo especificado.
   */
  getPresignedUrl(
    bucket: string,
    key: string,
    expirySeconds: number,
  ): Promise<string>;

  /**
   * Verifica que el bucket exista; si no, lo crea.
   * Llamar al arrancar la aplicación.
   */
  ensureBucketExists(bucket: string): Promise<void>;
}

export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');
