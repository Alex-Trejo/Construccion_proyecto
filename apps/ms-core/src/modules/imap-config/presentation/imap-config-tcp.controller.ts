/**
 * @fileoverview Controller TCP — Configuración IMAP por usuario.
 *
 *   SAVE_CONFIG  (gateway)  → guarda la config (password cifrado)
 *   LIST_ACTIVE  (ms-sync)  → lista configs activas (password cifrado)
 *
 * @module ImapConfigTcpController
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  IMAP_PATTERNS,
  type ICreateImapConfigDto,
  type IImapActiveConfig,
  type IImapConfigDto,
  type TcpPayload,
} from '@sgc/shared';

import {
  SaveImapConfigUseCase,
  ListActiveImapConfigsUseCase,
} from '../application/imap-config.use-cases';

@Controller()
export class ImapConfigTcpController {
  private readonly logger = new Logger(ImapConfigTcpController.name);

  constructor(
    private readonly saveConfig: SaveImapConfigUseCase,
    private readonly listActive: ListActiveImapConfigsUseCase,
  ) {}

  @MessagePattern(IMAP_PATTERNS.SAVE_CONFIG)
  async save(
    payload: TcpPayload<ICreateImapConfigDto>,
  ): Promise<IImapConfigDto> {
    const ownerId = payload.metadata.userId;
    this.logger.debug(`TCP IMAP SAVE_CONFIG owner=${ownerId}`);
    return this.saveConfig.execute(payload.data, ownerId);
  }

  @MessagePattern(IMAP_PATTERNS.LIST_ACTIVE)
  async list(): Promise<IImapActiveConfig[]> {
    return this.listActive.execute();
  }
}
