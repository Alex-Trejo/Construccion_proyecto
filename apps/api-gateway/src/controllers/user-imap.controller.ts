/**
 * @fileoverview Controller HTTP — Configuración IMAP del usuario.
 *   POST /user/imap-config → guarda el correo receptor (password cifrado en ms-core).
 * @module UserImapController
 */

import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { firstValueFrom, timeout } from 'rxjs';
import {
  IMAP_PATTERNS,
  MICROSERVICE_TOKENS,
  type ICreateImapConfigDto,
  type IImapConfigDto,
  type TcpPayload,
} from '@sgc/shared';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { buildTcpMetadata } from '../auth/tcp-metadata';
import type { AuthenticatedUser } from '../auth/keycloak-jwt.strategy';

@ApiTags('User · IMAP')
@ApiBearerAuth()
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserImapController {
  constructor(
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCore: ClientProxy,
  ) {}

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
        .pipe(timeout(10_000)),
    );
  }
}
