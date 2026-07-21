/**
 * @fileoverview Adaptador — Cliente IMAP para extracción de correos.
 *
 * Implementa ImapClientPort usando ImapFlow + mailparser.
 *
 * Flujo por cada ciclo de sincronización:
 *   1. Crear conexión IMAP (vía ImapConnectionFactory).
 *   2. Abrir INBOX.
 *   3. Buscar mensajes UNSEEN.
 *   4. Por cada mensaje: parsear MIME, filtrar adjuntos (.xml/.pdf).
 *   5. Marcar correo como SEEN (leído).
 *   6. Cerrar conexión.
 *
 * @module ImapClientAdapter
 */

import { Injectable, Logger } from '@nestjs/common';
import { type ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail, type Attachment } from 'mailparser';

import {
  type ImapClientPort,
  type ImapAccountConfig,
  type ProcessedEmail,
  type EmailAttachment,
  type EmailMetadata,
} from '../../domain/ports/imap-client.port';
import { ImapConnectionFactory } from '../factories/imap-connection.factory';

/** Extensiones de adjuntos que nos interesan. */
const ALLOWED_EXTENSIONS = new Set(['xml', 'pdf']);

@Injectable()
export class ImapClientAdapter implements ImapClientPort {
  private readonly logger = new Logger(ImapClientAdapter.name);

  constructor(private readonly connectionFactory: ImapConnectionFactory) {}

  async fetchUnseenWithAttachments(
    account: ImapAccountConfig,
  ): Promise<ReadonlyArray<ProcessedEmail>> {
    let client: ImapFlow | null = null;

    try {
      client = await this.connectionFactory.create(account);

      // ── 1. Abrir INBOX en modo lectura/escritura ────────────────────────
      const lock = await client.getMailboxLock('INBOX');

      try {
        // ── 2. Buscar correos no leídos ─────────────────────────────────
        const unseenUids: number[] = [];

        for await (const msg of client.fetch(
          { seen: false },
          { uid: true },
        )) {
          unseenUids.push(msg.uid);
        }

        if (unseenUids.length === 0) {
          this.logger.debug('No hay correos nuevos (UNSEEN) en INBOX');
          return [];
        }

        this.logger.log(`📧 Correos no leídos encontrados: ${unseenUids.length}`);

        // ── 3. Procesar cada correo ─────────────────────────────────────
        const processedEmails: ProcessedEmail[] = [];

        for (const uid of unseenUids) {
          const processed = await this.processMessage(client, uid);

          if (processed && processed.attachments.length > 0) {
            processedEmails.push(processed);

            // ── 4. Marcar como leído ──────────────────────────────────
            await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });

            this.logger.log(
              `✅ Correo UID=${uid} procesado: ${processed.attachments.length} adjuntos`,
            );
          }
        }

        this.logger.log(
          `Ciclo IMAP completado: ${processedEmails.length} correos con adjuntos válidos`,
        );

        return processedEmails;
      } finally {
        lock.release();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error en ciclo IMAP: ${errorMsg}`);
      throw new Error(`IMAP sync failed: ${errorMsg}`);
    } finally {
      if (client) {
        await client.logout().catch(() => {
          // Ignorar errores de logout (conexión ya pudo cerrarse)
        });
      }
    }
  }

  /**
   * Procesa un mensaje individual: descarga el source completo,
   * parsea MIME y extrae los adjuntos filtrados.
   */
  private async processMessage(
    client: ImapFlow,
    uid: number,
  ): Promise<ProcessedEmail | null> {
    try {
      // Descargar el source completo del mensaje
      const downloadResult = await client.download(String(uid), undefined, {
        uid: true,
      });

      // Leer el stream a buffer
      const chunks: Buffer[] = [];
      for await (const chunk of downloadResult.content) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const rawSource = Buffer.concat(chunks);

      // Parsear MIME
      const parsed: ParsedMail = await simpleParser(rawSource);

      // Extraer metadata
      const metadata = this.extractMetadata(parsed, uid);

      // Filtrar adjuntos válidos
      const attachments = this.filterAttachments(parsed.attachments ?? []);

      if (attachments.length === 0) {
        this.logger.debug(
          `Correo UID=${uid} sin adjuntos XML/PDF relevantes. Ignorado.`,
        );
        return null;
      }

      return { metadata, attachments };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Error procesando correo UID=${uid}: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Extrae metadata tipada del correo parseado.
   */
  private extractMetadata(parsed: ParsedMail, uid: number): EmailMetadata {
    const fromAddress = parsed.from?.value?.[0]?.address ?? 'unknown@unknown';
    const subject = parsed.subject ?? '(sin asunto)';
    const date = parsed.date ?? new Date();
    const messageId = parsed.messageId ?? `uid-${uid}-${Date.now()}`;

    return { uid, from: fromAddress, subject, date, messageId };
  }

  /**
   * Filtra adjuntos: solo .xml y .pdf.
   * Ignora archivos sin nombre, sin contenido, o con extensiones no permitidas.
   */
  private filterAttachments(
    rawAttachments: ReadonlyArray<Attachment>,
  ): ReadonlyArray<EmailAttachment> {
    const filtered: EmailAttachment[] = [];

    for (const attachment of rawAttachments) {
      const filename = attachment.filename;
      if (!filename || !attachment.content) continue;

      const extension = this.getExtension(filename);
      if (!ALLOWED_EXTENSIONS.has(extension)) continue;

      filtered.push({
        filename,
        extension,
        content: attachment.content,
        contentType: attachment.contentType ?? 'application/octet-stream',
        size: attachment.size ?? attachment.content.length,
      });
    }

    return filtered;
  }

  /**
   * Extrae la extensión de un nombre de archivo en minúsculas.
   */
  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot + 1).toLowerCase();
  }
}
