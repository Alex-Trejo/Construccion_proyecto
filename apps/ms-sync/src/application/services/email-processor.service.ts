/**
 * @fileoverview Servicio de procesamiento de correos.
 *
 * Responsabilidades:
 *   - Recibe los correos procesados del adaptador IMAP.
 *   - Por cada adjunto XML/PDF, emite un evento TCP hacia ms-core
 *     usando el patrón SYNC_PATTERNS.DOCUMENT_RECEIVED.
 *   - Convierte el Buffer a base64 para transporte TCP seguro.
 *
 * ⚠️ ms-sync NO persiste nada. Solo emite eventos.
 * Es ms-core quien guarda en MinIO y PostgreSQL.
 *
 * @module EmailProcessorService
 */

import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { MICROSERVICE_TOKENS, SYNC_PATTERNS } from '@sgc/shared';

import { type ProcessedEmail } from '../../domain/ports/imap-client.port';

/** Payload del evento TCP enviado a ms-core. */
export interface DocumentReceivedPayload {
  /** Nombre original del archivo. */
  readonly filename: string;
  /** Extensión del archivo (xml o pdf). */
  readonly extension: string;
  /** Contenido del archivo en base64 (para transporte TCP seguro). */
  readonly contentBase64: string;
  /** MIME type del adjunto. */
  readonly contentType: string;
  /** Tamaño original en bytes. */
  readonly size: number;
  /** Remitente del correo. */
  readonly emailFrom: string;
  /** Asunto del correo. */
  readonly emailSubject: string;
  /** Fecha de recepción del correo. */
  readonly emailDate: string;
  /** Message-ID del correo (para deduplicación en ms-core). */
  readonly emailMessageId: string;
}

/** Resultado del procesamiento de un lote de correos. */
export interface ProcessingResult {
  readonly totalEmails: number;
  readonly totalAttachments: number;
  readonly eventsEmitted: number;
  readonly eventsFailed: number;
}

/** Timeout para la emisión TCP (ms). */
const TCP_EMIT_TIMEOUT_MS = 10_000;

@Injectable()
export class EmailProcessorService implements OnModuleInit {
  private readonly logger = new Logger(EmailProcessorService.name);

  constructor(
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCoreClient: ClientProxy,
  ) {}

  async onModuleInit(): Promise<void> {
    // Intento de conexión temprana (best-effort). NO debe tumbar el arranque:
    // ms-core puede no estar listo todavía (orden de arranque). El ClientProxy
    // se (re)conecta de forma perezosa en el primer emit del ciclo de polling.
    try {
      await this.msCoreClient.connect();
      this.logger.log('✅ Conexión TCP con ms-core establecida');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `⚠️ ms-core no disponible al arrancar (se reintentará al emitir): ${msg}`,
      );
    }
  }

  /**
   * Procesa un lote de correos: por cada adjunto, emite un evento TCP.
   */
  async processEmails(
    emails: ReadonlyArray<ProcessedEmail>,
  ): Promise<ProcessingResult> {
    let eventsEmitted = 0;
    let eventsFailed = 0;
    let totalAttachments = 0;

    for (const email of emails) {
      for (const attachment of email.attachments) {
        totalAttachments++;

        const payload: DocumentReceivedPayload = {
          filename: attachment.filename,
          extension: attachment.extension,
          contentBase64: attachment.content.toString('base64'),
          contentType: attachment.contentType,
          size: attachment.size,
          emailFrom: email.metadata.from,
          emailSubject: email.metadata.subject,
          emailDate: email.metadata.date.toISOString(),
          emailMessageId: email.metadata.messageId,
        };

        const success = await this.emitToMsCore(payload);

        if (success) {
          eventsEmitted++;
          this.logger.log(
            `📤 Evento emitido: ${attachment.filename} ` +
            `(${attachment.extension}, ${this.formatBytes(attachment.size)})`,
          );
        } else {
          eventsFailed++;
          this.logger.error(
            `❌ Evento fallido: ${attachment.filename}`,
          );
        }
      }
    }

    return {
      totalEmails: emails.length,
      totalAttachments,
      eventsEmitted,
      eventsFailed,
    };
  }

  /**
   * Emite un evento TCP hacia ms-core con timeout y manejo de errores.
   */
  private async emitToMsCore(
    payload: DocumentReceivedPayload,
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.msCoreClient
          .emit(SYNC_PATTERNS.DOCUMENT_RECEIVED, payload)
          .pipe(
            timeout(TCP_EMIT_TIMEOUT_MS),
            catchError((error: Error) => {
              this.logger.error(
                `TCP emit error para ${payload.filename}: ${error.message}`,
              );
              return of(null);
            }),
          ),
      );
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`TCP emit exception: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Formatea bytes a formato legible.
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }
}
