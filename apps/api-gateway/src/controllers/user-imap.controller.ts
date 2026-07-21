/**
 * @fileoverview Controller HTTP — Configuración IMAP del usuario.
 *   GET    /user/imap-config        → devuelve la config del usuario (sin password).
 *   POST   /user/imap-config        → guarda/actualiza el correo receptor (password cifrado).
 *   DELETE /user/imap-config        → elimina la config del usuario.
 *   PATCH  /user/imap-config/active → pausa/activa el escaneo del buzón.
 *   POST   /user/imap-config/test   → prueba una conexión IMAP (login + logout).
 * @module UserImapController
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { firstValueFrom, timeout } from 'rxjs';
import {
  IMAP_PATTERNS,
  SYNC_PATTERNS,
  MICROSERVICE_TOKENS,
  type ICreateImapConfigDto,
  type IImapConfigDto,
  type IImapTestResultDto,
  type ISyncTriggerResult,
  type TcpPayload,
} from '@sgc/shared';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { buildTcpMetadata } from '../auth/tcp-metadata';
import type { AuthenticatedUser } from '../auth/keycloak-jwt.strategy';

/** El test IMAP puede tardar (handshake TLS + login); timeout holgado. */
const TEST_TIMEOUT_MS = 25_000;
/** El escaneo manual conecta y descarga correos: puede tardar. */
const SYNC_TIMEOUT_MS = 60_000;
const TCP_TIMEOUT_MS = 10_000;

@ApiTags('User · IMAP')
@ApiBearerAuth()
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserImapController {
  constructor(
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCore: ClientProxy,
    @Inject(MICROSERVICE_TOKENS.MS_SYNC_CLIENT)
    private readonly msSync: ClientProxy,
  ) {}

  @Get('imap-config')
  async getImapConfig(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IImapConfigDto | null> {
    const payload: TcpPayload<Record<string, never>> = {
      data: {},
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IImapConfigDto | null>(IMAP_PATTERNS.GET_CONFIG, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  @Post('imap-config')
  async saveImapConfig(
    @Body() dto: ICreateImapConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IImapConfigDto> {
    const payload: TcpPayload<ICreateImapConfigDto> = {
      data: dto,
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IImapConfigDto>(IMAP_PATTERNS.SAVE_CONFIG, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  @Delete('imap-config')
  async deleteImapConfig(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    const payload: TcpPayload<Record<string, never>> = {
      data: {},
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<{ deleted: boolean }>(IMAP_PATTERNS.DELETE_CONFIG, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  @Patch('imap-config/active')
  async setActive(
    @Body() body: { isActive: boolean },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IImapConfigDto | null> {
    const payload: TcpPayload<{ isActive: boolean }> = {
      data: { isActive: !!body.isActive },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IImapConfigDto | null>(IMAP_PATTERNS.SET_ACTIVE, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  @Post('imap-config/test')
  async testConnection(
    @Body() dto: ICreateImapConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IImapTestResultDto> {
    const payload: TcpPayload<ICreateImapConfigDto> = {
      data: dto,
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IImapTestResultDto>(IMAP_PATTERNS.TEST_CONNECTION, payload)
        .pipe(timeout(TEST_TIMEOUT_MS)),
    );
  }

  /** Dispara un escaneo IMAP a demanda (sin esperar al cron). */
  @Post('imap-config/sync')
  async triggerSync(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ISyncTriggerResult> {
    const payload: TcpPayload<Record<string, never>> = {
      data: {},
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msSync
        .send<ISyncTriggerResult>(SYNC_PATTERNS.TRIGGER_SYNC, payload)
        .pipe(timeout(SYNC_TIMEOUT_MS)),
    );
  }
}
