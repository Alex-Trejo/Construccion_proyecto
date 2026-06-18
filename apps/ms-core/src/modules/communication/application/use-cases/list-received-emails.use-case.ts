/**
 * @fileoverview Caso de uso — Listar correos recibidos (paginado).
 *
 * @module ListReceivedEmailsUseCase
 */

import { Injectable, Inject, Logger } from '@nestjs/common';

import {
  type ReceivedEmailRepositoryPort,
  type PaginatedEmails,
  type PaginationParams,
  RECEIVED_EMAIL_REPOSITORY_PORT,
} from '../../domain/ports/received-email-repository.port';

@Injectable()
export class ListReceivedEmailsUseCase {
  private readonly logger = new Logger(ListReceivedEmailsUseCase.name);

  constructor(
    @Inject(RECEIVED_EMAIL_REPOSITORY_PORT)
    private readonly emailRepo: ReceivedEmailRepositoryPort,
  ) {}

  async execute(params: PaginationParams): Promise<PaginatedEmails> {
    this.logger.debug(`Listando correos: page=${params.page}, limit=${params.limit}`);
    return this.emailRepo.findPaginated(params);
  }
}
