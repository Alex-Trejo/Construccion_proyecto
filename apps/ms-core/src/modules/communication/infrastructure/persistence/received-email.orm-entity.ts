/**
 * @fileoverview Schema TypeORM — Correo Electrónico Recibido.
 *
 * Define la entidad de persistencia para la tabla `received_emails`.
 * Relación OneToMany con `email_attachments`.
 *
 * @module ReceivedEmailSchema
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { EmailAttachmentOrmEntity } from './email-attachment.orm-entity';

@Entity('received_emails')
// Dedup por dueño: un Message-ID por usuario (multi-tenant).
@Index('idx_received_emails_owner_msg', ['ownerId', 'emailMessageId'], {
  unique: true,
})
export class ReceivedEmailOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index('idx_received_emails_owner')
  @Column({ name: 'owner_id', type: 'varchar', length: 255, nullable: true })
  ownerId!: string | null;

  @Column({ name: 'email_from', type: 'varchar', length: 255 })
  emailFrom!: string;

  @Column({ name: 'email_subject', type: 'varchar', length: 500 })
  emailSubject!: string;

  @Column({ name: 'email_date', type: 'timestamptz' })
  emailDate!: Date;

  @Column({ name: 'email_message_id', type: 'varchar', length: 500 })
  emailMessageId!: string;

  @OneToMany(
    () => EmailAttachmentOrmEntity,
    (attachment) => attachment.receivedEmail,
    { cascade: true, eager: true },
  )
  attachments!: EmailAttachmentOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
