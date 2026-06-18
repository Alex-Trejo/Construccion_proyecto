/**
 * @fileoverview Entidad de dominio — Correo Electrónico Recibido.
 *
 * Persiste la metadata de cada correo procesado por ms-sync.
 * Relación 1:N con EmailAttachment.
 *
 * @module ReceivedEmail
 */

import { type EmailAttachmentEntity } from './email-attachment.entity';

export interface ReceivedEmailProps {
  readonly id: string;
  readonly emailFrom: string;
  readonly emailSubject: string;
  readonly emailDate: Date;
  readonly emailMessageId: string;
  readonly attachments: ReadonlyArray<EmailAttachmentEntity>;
  readonly createdAt: Date;
}

export class ReceivedEmail {
  readonly id: string;
  readonly emailFrom: string;
  readonly emailSubject: string;
  readonly emailDate: Date;
  readonly emailMessageId: string;
  readonly attachments: ReadonlyArray<EmailAttachmentEntity>;
  readonly createdAt: Date;

  constructor(props: ReceivedEmailProps) {
    this.id = props.id;
    this.emailFrom = props.emailFrom;
    this.emailSubject = props.emailSubject;
    this.emailDate = props.emailDate;
    this.emailMessageId = props.emailMessageId;
    this.attachments = props.attachments;
    this.createdAt = props.createdAt;
  }

  /** Número total de adjuntos. */
  get attachmentCount(): number {
    return this.attachments.length;
  }

  /** Indica si el correo tiene adjuntos XML (facturas). */
  get hasXmlAttachments(): boolean {
    return this.attachments.some((a) => a.extension === 'xml');
  }

  /** Indica si el correo tiene adjuntos PDF (RIDE). */
  get hasPdfAttachments(): boolean {
    return this.attachments.some((a) => a.extension === 'pdf');
  }
}
