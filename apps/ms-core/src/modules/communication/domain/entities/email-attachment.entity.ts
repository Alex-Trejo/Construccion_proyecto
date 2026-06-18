/**
 * @fileoverview Entidad de dominio — Adjunto de Correo Electrónico.
 *
 * Representa un archivo (XML o PDF) extraído de un correo y
 * almacenado en MinIO. Contiene la referencia al Object Storage.
 *
 * @module EmailAttachmentEntity
 */

export interface EmailAttachmentProps {
  readonly id: string;
  /** ID del ReceivedEmail padre. */
  readonly receivedEmailId: string;
  /** Nombre original del archivo (ej: "factura_001-001-000000123.xml"). */
  readonly filename: string;
  /** Extensión en minúsculas: "xml" | "pdf". */
  readonly extension: string;
  /** MIME type (ej: "application/xml", "application/pdf"). */
  readonly contentType: string;
  /** Tamaño en bytes. */
  readonly size: number;
  /** Nombre del bucket en MinIO. */
  readonly storageBucket: string;
  /** Key (path) del objeto en MinIO. */
  readonly storageKey: string;
  readonly createdAt: Date;
}

export class EmailAttachmentEntity {
  readonly id: string;
  readonly receivedEmailId: string;
  readonly filename: string;
  readonly extension: string;
  readonly contentType: string;
  readonly size: number;
  readonly storageBucket: string;
  readonly storageKey: string;
  readonly createdAt: Date;

  constructor(props: EmailAttachmentProps) {
    this.id = props.id;
    this.receivedEmailId = props.receivedEmailId;
    this.filename = props.filename;
    this.extension = props.extension;
    this.contentType = props.contentType;
    this.size = props.size;
    this.storageBucket = props.storageBucket;
    this.storageKey = props.storageKey;
    this.createdAt = props.createdAt;
  }

  /** Indica si este adjunto es un XML de comprobante. */
  get isXml(): boolean {
    return this.extension === 'xml';
  }

  /** Indica si este adjunto es un PDF (RIDE). */
  get isPdf(): boolean {
    return this.extension === 'pdf';
  }

  /** Tamaño formateado legible. */
  get formattedSize(): string {
    if (this.size < 1024) return `${this.size} B`;
    const kb = this.size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }
}
