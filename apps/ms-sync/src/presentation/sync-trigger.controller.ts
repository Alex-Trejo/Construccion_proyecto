/**
 * @fileoverview Controller TCP — Disparo manual del escaneo IMAP.
 *
 * Escucha SYNC_PATTERNS.TRIGGER_SYNC (enviado por el api-gateway) y ejecuta
 * un ciclo de sincronización a demanda, sin esperar al cron. Devuelve un
 * resumen (cuentas, adjuntos, eventos emitidos) para dar feedback al usuario.
 *
 * @module SyncTriggerController
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { SYNC_PATTERNS, type ISyncTriggerResult } from '@sgc/shared';

import { EmailSyncCronService } from '../application/services/email-sync-cron.service';

@Controller()
export class SyncTriggerController {
  private readonly logger = new Logger(SyncTriggerController.name);

  constructor(private readonly syncCron: EmailSyncCronService) {}

  @MessagePattern(SYNC_PATTERNS.TRIGGER_SYNC)
  async trigger(): Promise<ISyncTriggerResult> {
    this.logger.log('▶️ TRIGGER_SYNC recibido: escaneo IMAP a demanda');
    return this.syncCron.runSync();
  }
}
