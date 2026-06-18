/**
 * @fileoverview Controller TCP — Consultas de comunicaciones.
 *
 * Recibe mensajes TCP del api-gateway para consultar correos
 * recibidos y generar URLs de descarga.
 *
 * @module CommunicationTcpController
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { COMMUNICATION_PATTERNS, type TcpPayload } from '@sgc/shared';

import { ListReceivedEmailsUseCase } from '../use-cases/list-received-emails.use-case';
import { GetReceivedEmailDetailUseCase } from '../use-cases/get-received-email-detail.use-case';
import { GetAttachmentDownloadUrlUseCase } from '../use-cases/get-attachment-download-url.use-case';

/** Parámetros de paginación del gateway. */
interface ListEmailsPayload {
  readonly page: number;
  readonly limit: number;
}

/** Parámetros de detalle del gateway. */
interface GetEmailDetailPayload {
  readonly emailId: string;
}

/** Parámetros de descarga del gateway. */
interface GetAttachmentUrlPayload {
  readonly emailId: string;
  readonly attachmentId: string;
}

@Controller()
export class CommunicationTcpController {
  private readonly logger = new Logger(CommunicationTcpController.name);

  constructor(
    private readonly listEmailsUseCase: ListReceivedEmailsUseCase,
    private readonly getEmailDetailUseCase: GetReceivedEmailDetailUseCase,
    private readonly getAttachmentUrlUseCase: GetAttachmentDownloadUrlUseCase,
  ) {}

  @MessagePattern(COMMUNICATION_PATTERNS.LIST_EMAILS)
  async listEmails(payload: TcpPayload<ListEmailsPayload>) {
    this.logger.debug('TCP: LIST_EMAILS');
    return this.listEmailsUseCase.execute({
      page: payload.data.page,
      limit: payload.data.limit,
    });
  }

  @MessagePattern(COMMUNICATION_PATTERNS.GET_EMAIL_DETAIL)
  async getEmailDetail(payload: TcpPayload<GetEmailDetailPayload>) {
    this.logger.debug(`TCP: GET_EMAIL_DETAIL ${payload.data.emailId}`);
    return this.getEmailDetailUseCase.execute(payload.data.emailId);
  }

  @MessagePattern(COMMUNICATION_PATTERNS.GET_ATTACHMENT_URL)
  async getAttachmentUrl(payload: TcpPayload<GetAttachmentUrlPayload>) {
    this.logger.debug(
      `TCP: GET_ATTACHMENT_URL ${payload.data.emailId}/${payload.data.attachmentId}`,
    );
    return this.getAttachmentUrlUseCase.execute(
      payload.data.emailId,
      payload.data.attachmentId,
    );
  }
}
