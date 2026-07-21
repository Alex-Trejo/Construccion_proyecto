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
  type IImapTestResultDto,
  type TcpPayload,
} from '@sgc/shared';

import {
  SaveImapConfigUseCase,
  ListActiveImapConfigsUseCase,
  GetImapConfigUseCase,
  DeleteImapConfigUseCase,
  SetImapActiveUseCase,
  TestImapConnectionUseCase,
} from '../application/imap-config.use-cases';

@Controller()
export class ImapConfigTcpController {
  private readonly logger = new Logger(ImapConfigTcpController.name);

  constructor(
    private readonly saveConfig: SaveImapConfigUseCase,
    private readonly listActive: ListActiveImapConfigsUseCase,
    private readonly getConfig: GetImapConfigUseCase,
    private readonly deleteConfig: DeleteImapConfigUseCase,
    private readonly setActive: SetImapActiveUseCase,
    private readonly testConnection: TestImapConnectionUseCase,
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

  @MessagePattern(IMAP_PATTERNS.GET_CONFIG)
  async get(
    payload: TcpPayload<Record<string, never>>,
  ): Promise<IImapConfigDto | null> {
    return this.getConfig.execute(payload.metadata.userId);
  }

  @MessagePattern(IMAP_PATTERNS.DELETE_CONFIG)
  async remove(
    payload: TcpPayload<Record<string, never>>,
  ): Promise<{ deleted: boolean }> {
    const ownerId = payload.metadata.userId;
    this.logger.debug(`TCP IMAP DELETE_CONFIG owner=${ownerId}`);
    return { deleted: await this.deleteConfig.execute(ownerId) };
  }

  @MessagePattern(IMAP_PATTERNS.SET_ACTIVE)
  async active(
    payload: TcpPayload<{ isActive: boolean }>,
  ): Promise<IImapConfigDto | null> {
    const ownerId = payload.metadata.userId;
    this.logger.debug(
      `TCP IMAP SET_ACTIVE owner=${ownerId} active=${payload.data.isActive}`,
    );
    return this.setActive.execute(ownerId, payload.data.isActive);
  }

  @MessagePattern(IMAP_PATTERNS.TEST_CONNECTION)
  async test(
    payload: TcpPayload<ICreateImapConfigDto>,
  ): Promise<IImapTestResultDto> {
    this.logger.debug(`TCP IMAP TEST_CONNECTION owner=${payload.metadata.userId}`);
    return this.testConnection.execute(payload.data);
  }
}
