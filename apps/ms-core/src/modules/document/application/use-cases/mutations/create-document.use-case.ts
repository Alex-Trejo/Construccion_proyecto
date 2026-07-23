/**
 * @fileoverview Caso de uso — Guardar comprobante revisado.
 *
 * Aplica la regla de UNICIDAD estricta (owner + RUC + número de factura) y
 * persiste el comprobante con sus items e impuestos.
 *
 * @module CreateDocumentUseCase
 */

import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  normalizeInvoiceNumber,
  type ICreateDocumentDto,
  type IDocumentDto,
  type IUpdateDocumentDto,
} from '@sgc/shared';

import {
  type DocumentRepositoryPort,
  DOCUMENT_REPOSITORY_PORT,
} from '../../../domain/ports/document-repository.port';
import { ValidateDocumentUseCase } from '../validations/validate-document.use-case';

@Injectable()
export class CreateDocumentUseCase {
  private readonly logger = new Logger(CreateDocumentUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
    private readonly validateDocument: ValidateDocumentUseCase,
  ) {}

  async execute(
    dto: ICreateDocumentDto,
    ownerId: string | null,
    source = 'MANUAL_UPLOAD',
  ): Promise<IDocumentDto> {
    // Canonizar el N° de factura para que la unicidad (RF05) sea robusta:
    // "001-002-123" y "001002123" del mismo RUC son el MISMO comprobante.
    const numeroFactura = normalizeInvoiceNumber(dto.numeroFactura);
    const normalizedDto: ICreateDocumentDto = { ...dto, numeroFactura };

    const duplicate = await this.documentRepo.existsByNumero(
      ownerId,
      normalizedDto.rucEmisor,
      numeroFactura,
    );
    if (duplicate) {
      throw new ConflictException(
        `Ya existe un comprobante ${numeroFactura} del RUC ${normalizedDto.rucEmisor}.`,
      );
    }

    const saved = await this.documentRepo.save(normalizedDto, ownerId, source);
    this.logger.log(
      `Comprobante guardado: ${saved.numeroFactura} (${saved.rucEmisor})`,
    );

    // Validación automática por pasos (PENDIENTE → VALIDADO/INCONSISTENTE).
    const validated = await this.validateDocument.execute(saved.id, ownerId);
    return validated ?? saved;
  }
}

/** Edita un comprobante ya guardado (corrige montos/ítems) y lo revalida. */
@Injectable()
export class UpdateDocumentUseCase {
  private readonly logger = new Logger(UpdateDocumentUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
    private readonly validateDocument: ValidateDocumentUseCase,
  ) {}

  async execute(
    id: string,
    ownerId: string | null,
    dto: IUpdateDocumentDto,
  ): Promise<IDocumentDto> {
    const updated = await this.documentRepo.updateDocument(id, ownerId, dto);
    if (!updated) {
      throw new NotFoundException(`Comprobante ${id} no encontrado.`);
    }
    this.logger.log(`Comprobante editado: ${updated.numeroFactura}`);
    // El repo reinició el estado a PENDIENTE → se revalida con los datos nuevos.
    const validated = await this.validateDocument.execute(id, ownerId);
    return validated ?? updated;
  }
}
