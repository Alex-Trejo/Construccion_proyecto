/**
 * @fileoverview Controller HTTP — Comunicaciones / Correos Recibidos.
 *
 * Endpoints protegidos con JWT (Keycloak).
 *
 * Rutas:
 *   GET  /communications             → Lista paginada de correos.
 *   GET  /communications/:id         → Detalle de un correo con adjuntos.
 *   GET  /communications/:id/attachments/:attachmentId/download
 *        → Retorna Pre-Signed URL de MinIO (NO el archivo).
 *
 * @module CommunicationController
 */

import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  Logger,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { buildTcpMetadata } from '../../auth/tcp-metadata';
import type { AuthenticatedUser } from '../../auth/keycloak-jwt.strategy';
import { firstValueFrom, timeout } from 'rxjs';
import {
  MICROSERVICE_TOKENS,
  COMMUNICATION_PATTERNS,
  type TcpPayload,
} from '@sgc/shared';

/** Timeout para llamadas TCP al ms-core (ms). */
const TCP_TIMEOUT_MS = 10_000;

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('communications')
@UseGuards(JwtAuthGuard)
export class CommunicationController {
  private readonly logger = new Logger(CommunicationController.name);

  constructor(
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCoreClient: ClientProxy,
  ) {}

  /**
   * GET /communications?page=1&limit=10
   * Lista paginada de correos recibidos (del usuario autenticado).
   */
  @Get()
  async listEmails(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    this.logger.debug(`GET /communications?page=${page}&limit=${limit}`);

    const payload: TcpPayload<{ page: number; limit: number }> = {
      data: { page, limit },
      metadata: buildTcpMetadata(user),
    };

    const result = await firstValueFrom(
      this.msCoreClient
        .send(COMMUNICATION_PATTERNS.LIST_EMAILS, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );

    return result;
  }

  /**
   * GET /communications/:id
   * Detalle de un correo con todos sus adjuntos.
   */
  @Get(':id')
  async getEmailDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') emailId: string,
  ) {
    this.logger.debug(`GET /communications/${emailId}`);

    const payload: TcpPayload<{ emailId: string }> = {
      data: { emailId },
      metadata: buildTcpMetadata(user),
    };

    const result = await firstValueFrom(
      this.msCoreClient
        .send(COMMUNICATION_PATTERNS.GET_EMAIL_DETAIL, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );

    if (!result) {
      throw new NotFoundException(`Correo ${emailId} no encontrado`);
    }

    return result;
  }

  /**
   * GET /communications/:id/attachments/:attachmentId/download
   *
   * Retorna una Pre-Signed URL de MinIO (válida 5 minutos).
   * El frontend debe redirigir al usuario a esta URL para descargar.
   * NO retorna el buffer del archivo.
   */
  @Get(':id/attachments/:attachmentId/download')
  async getAttachmentDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') emailId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    this.logger.debug(
      `GET /communications/${emailId}/attachments/${attachmentId}/download`,
    );

    const payload: TcpPayload<{ emailId: string; attachmentId: string }> = {
      data: { emailId, attachmentId },
      metadata: buildTcpMetadata(user),
    };

    const result = await firstValueFrom(
      this.msCoreClient
        .send(COMMUNICATION_PATTERNS.GET_ATTACHMENT_URL, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );

    if (!result) {
      throw new NotFoundException(
        `Adjunto ${attachmentId} no encontrado en correo ${emailId}`,
      );
    }

    return result;
  }

  /**
   * GET /communications/:id/attachments/:attachmentId/file
   *
   * Transmite el adjunto al navegador SIN exponer MinIO: el gateway obtiene la
   * URL pre-firmada (endpoint interno), la descarga por la red privada y hace
   * de proxy. Autenticado + aislado por dueño.
   */
  @Get(':id/attachments/:attachmentId/file')
  async streamAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') emailId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ): Promise<void> {
    const payload: TcpPayload<{ emailId: string; attachmentId: string }> = {
      data: { emailId, attachmentId },
      metadata: buildTcpMetadata(user),
    };
    const result = await firstValueFrom(
      this.msCoreClient
        .send<{ url: string; filename: string; contentType: string } | null>(
          COMMUNICATION_PATTERNS.GET_ATTACHMENT_URL,
          payload,
        )
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
    if (!result) {
      throw new NotFoundException('Adjunto no encontrado.');
    }

    const upstream = await fetch(result.url);
    if (!upstream.ok || !upstream.body) {
      throw new NotFoundException('Adjunto no disponible.');
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename.replace(/"/g, '')}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  }
}
