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
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  IMAP_PATTERNS,
  MICROSERVICE_TOKENS,
  type IImapActiveConfig,
  type ISyncTriggerResult,
} from '@sgc/shared';

import {
  type ImapClientPort,
  IMAP_CLIENT_PORT,
} from '../../domain/ports/imap-client.port';
import { EmailProcessorService } from './email-processor.service';
import { decryptSecret } from '../../common/crypto.util';

@Injectable()
export class EmailSyncCronService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailSyncCronService.name);

  /** Mutex para evitar ejecuciones concurrentes. */
  private isSyncing = false;

  /** Contador de ciclos ejecutados (para observabilidad). */
  private cycleCount = 0;

  /** Intervalo de sincronización (leído de env, usado en logs). */
  private readonly intervalMinutes: number;

  /** Clave para descifrar las contraseñas IMAP en memoria. */
  private readonly encryptionKey: string;

  constructor(
    @Inject(IMAP_CLIENT_PORT)
    private readonly imapClient: ImapClientPort,

    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCoreClient: ClientProxy,

    private readonly emailProcessor: EmailProcessorService,
    configService: ConfigService,
  ) {
    this.intervalMinutes = configService.getOrThrow<number>(
      'SYNC_INTERVAL_MINUTES',
    );
    this.encryptionKey = configService.getOrThrow<string>('ENCRYPTION_KEY');

    this.logger.log(
      `📅 Polling IMAP multiusuario configurado cada ${this.intervalMinutes} minuto(s)`,
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
   *
   * @returns Resumen del escaneo (cuentas, adjuntos, eventos emitidos).
   */
  async runSync(): Promise<ISyncTriggerResult> {
    const empty: ISyncTriggerResult = { accounts: 0, attachments: 0, eventsEmitted: 0 };

    // ── Mutex: evitar concurrencia ────────────────────────────────────────
    if (this.isSyncing) {
      this.logger.warn(
        '⏳ Ciclo anterior aún en progreso. Saltando este ciclo.',
      );
      return empty;
    }

    this.isSyncing = true;
    const startTime = Date.now();
    this.logger.log('🔄 Iniciando ciclo de sincronización IMAP (multiusuario)...');

    let totalEmitted = 0;
    let totalAttachments = 0;
    let accounts = 0;

    try {
      // ── 1. Consultar a ms-core las configs IMAP activas ─────────────────
      const configs = await this.fetchActiveConfigs();
      if (configs.length === 0) {
        this.logger.debug('Sin configuraciones IMAP activas. Nada que escanear.');
        return empty;
      }
      accounts = configs.length;

      // ── 2. Escanear el INBOX de CADA usuario por separado ───────────────
      for (const cfg of configs) {
        try {
          // Descifrar la contraseña EN MEMORIA (nunca se persiste en claro).
          const password = decryptSecret(cfg.passwordEncrypted, this.encryptionKey);

          const emails = await this.imapClient.fetchUnseenWithAttachments({
            host: cfg.host,
            port: cfg.port,
            email: cfg.email,
            password,
            tls: cfg.tls,
          });

          if (emails.length === 0) continue;

          // Inyecta el userId (dueño) en cada evento DOCUMENT_RECEIVED.
          const result = await this.emailProcessor.processEmails(
            emails,
            cfg.ownerId,
          );
          totalEmitted += result.eventsEmitted;
          totalAttachments += result.totalAttachments;
          this.logger.log(
            `📬 ${cfg.email}: ${result.totalAttachments} adjuntos, ${result.eventsEmitted} eventos`,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`❌ Error con la cuenta ${cfg.email}: ${msg}`);
          // Un fallo en una cuenta no detiene las demás.
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `✅ Ciclo completado en ${elapsed}ms — ${accounts} cuenta(s), ${totalEmitted} eventos emitidos`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error en ciclo IMAP: ${errorMsg}`);
    } finally {
      this.isSyncing = false;
    }

    return { accounts, attachments: totalAttachments, eventsEmitted: totalEmitted };
  }

  /** Pide a ms-core las configuraciones IMAP activas (password cifrado). */
  private async fetchActiveConfigs(): Promise<IImapActiveConfig[]> {
    return firstValueFrom(
      this.msCoreClient
        .send<IImapActiveConfig[]>(IMAP_PATTERNS.LIST_ACTIVE, {
          data: {},
          metadata: {
            correlationId: `sync-${Date.now()}`,
            userId: 'ms-sync',
            timestamp: new Date().toISOString(),
          },
        })
        .pipe(timeout(10_000)),
    );
  }

  onModuleDestroy(): void {
    this.logger.log('🛑 EmailSyncCronService detenido');
  }
}
