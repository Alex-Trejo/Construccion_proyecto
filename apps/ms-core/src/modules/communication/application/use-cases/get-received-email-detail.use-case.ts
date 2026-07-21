/**
 * @fileoverview Caso de uso — Obtener detalle de un correo recibido.
 *
 * @module GetReceivedEmailDetailUseCase
 */

import { Injectable, Inject, Logger } from '@nestjs/common';

import {
  type ReceivedEmailRepositoryPort,
  RECEIVED_EMAIL_REPOSITORY_PORT,
} from '../../domain/ports/received-email-repository.port';
import { type ReceivedEmail } from '../../domain/entities/received-email.entity';

@Injectable()
export class GetReceivedEmailDetailUseCase {
  private readonly logger = new Logger(GetReceivedEmailDetailUseCase.name);

  constructor(
    @Inject(RECEIVED_EMAIL_REPOSITORY_PORT)
    private readonly emailRepo: ReceivedEmailRepositoryPort,
  ) {}

  async execute(
    emailId: string,
    ownerId: string | null,
  ): Promise<ReceivedEmail | null> {
    this.logger.debug(`Buscando correo: ${emailId}`);
    return this.emailRepo.findById(emailId, ownerId);
  }
}
