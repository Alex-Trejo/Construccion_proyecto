/**
 * @fileoverview Caso de uso — Guardar comprobante revisado.
 *
 * Aplica la regla de UNICIDAD estricta (owner + RUC + número de factura) y
 * persiste el comprobante con sus items e impuestos.
 *
 * @module CreateDocumentUseCase
 */

import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { type ICreateDocumentDto, type IDocumentDto } from '@sgc/shared';

import {
  type DocumentRepositoryPort,
  DOCUMENT_REPOSITORY_PORT,
} from '../../domain/ports/document-repository.port';

@Injectable()
export class CreateDocumentUseCase {
  private readonly logger = new Logger(CreateDocumentUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
  ) {}

  async execute(
    dto: ICreateDocumentDto,
    ownerId: string | null,
    source = 'MANUAL_UPLOAD',
  ): Promise<IDocumentDto> {
    const duplicate = await this.documentRepo.existsByNumero(
      ownerId,
      dto.rucEmisor,
      dto.numeroFactura,
    );
    if (duplicate) {
      throw new ConflictException(
        `Ya existe un comprobante ${dto.numeroFactura} del RUC ${dto.rucEmisor}.`,
      );
    }

    const saved = await this.documentRepo.save(dto, ownerId, source);
    this.logger.log(
      `Comprobante guardado: ${saved.numeroFactura} (${saved.rucEmisor})`,
    );
    return saved;
  }
}
