/**
 * @fileoverview Tarea Programada — Sincronización IMAP (Cron/Polling).
 *
 * Usa @nestjs/schedule para ejecutar un polling periódico al buzón IMAP.
 *
 * Flujo cada X minutos:
 *   1. Invoca ImapClientPort.fetchUnseenWithAttachments()
 *   2. Si hay adjuntos → los envía a EmailProcessorService
 *   3. EmailProcessorService emite eventos TCP a ms-core
 *
 * Protecciones:
 *   - Mutex: evita ejecuciones concurrentes (si un ciclo tarda > intervalo).
 *   - Error handling: un fallo no detiene futuros ciclos.
 *   - Logging detallado de cada ciclo.
 *
 * @module EmailSyncCronService
 */

import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import {
  type ImapClientPort,
  IMAP_CLIENT_PORT,
} from '../../domain/ports/imap-client.port';
import { EmailProcessorService } from './email-processor.service';

@Injectable()
export class EmailSyncCronService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailSyncCronService.name);

  /** Mutex para evitar ejecuciones concurrentes. */
  private isSyncing = false;

  /** Contador de ciclos ejecutados (para observabilidad). */
  private cycleCount = 0;

  /** Intervalo de sincronización (leído de env, usado en logs). */
  private readonly intervalMinutes: number;

  constructor(
    @Inject(IMAP_CLIENT_PORT)
    private readonly imapClient: ImapClientPort,

    private readonly emailProcessor: EmailProcessorService,
    configService: ConfigService,
  ) {
    this.intervalMinutes = configService.getOrThrow<number>(
      'SYNC_INTERVAL_MINUTES',
    );

    this.logger.log(
      `📅 Polling IMAP configurado cada ${this.intervalMinutes} minuto(s)`,
    );
  }

  /**
   * Polling principal. Se ejecuta cada minuto y verifica internamente
   * si ha pasado el intervalo configurado.
   *
   * Usamos EVERY_MINUTE como base y controlamos el intervalo real
   * internamente para respetar SYNC_INTERVAL_MINUTES dinámico.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    this.cycleCount++;

    // Solo ejecutar cada N minutos
    if (this.cycleCount % this.intervalMinutes !== 0) {
      return;
    }

    await this.runSync();
  }

  /**
   * Ejecuta un ciclo de sincronización IMAP.
   * También invocable manualmente (vía TCP desde api-gateway).
   */
  async runSync(): Promise<void> {
    // ── Mutex: evitar concurrencia ────────────────────────────────────────
    if (this.isSyncing) {
      this.logger.warn(
        '⏳ Ciclo anterior aún en progreso. Saltando este ciclo.',
      );
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    this.logger.log('🔄 Iniciando ciclo de sincronización IMAP...');

    try {
      // ── 1. Extraer correos del buzón ────────────────────────────────────
      const emails = await this.imapClient.fetchUnseenWithAttachments();

      if (emails.length === 0) {
        this.logger.debug('Sin correos nuevos con adjuntos relevantes.');
        return;
      }

      // ── 2. Procesar y emitir eventos a ms-core ─────────────────────────
      const result = await this.emailProcessor.processEmails(emails);

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `✅ Ciclo completado en ${elapsed}ms — ` +
        `${result.totalEmails} correos, ` +
        `${result.totalAttachments} adjuntos, ` +
        `${result.eventsEmitted} eventos emitidos, ` +
        `${result.eventsFailed} fallidos`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error en ciclo IMAP: ${errorMsg}`);
      // No re-lanzamos: el cron debe seguir intentando en el próximo ciclo.
    } finally {
      this.isSyncing = false;
    }
  }

  onModuleDestroy(): void {
    this.logger.log('🛑 EmailSyncCronService detenido');
  }
}
