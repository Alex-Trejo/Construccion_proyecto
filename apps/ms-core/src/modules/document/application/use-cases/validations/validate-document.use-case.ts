/**
 * @fileoverview Casos de uso — Validación y transición de estado de comprobantes.
 *
 * Implementa el flujo del ERS por pasos:
 *   PENDIENTE → EN_VALIDACION → VALIDADO | INCONSISTENTE → (revalidar) …
 *   VALIDADO → CONSOLIDADO
 *
 * @module validate-document.use-cases
 */

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentStatus, type IDocumentDto } from '@sgc/shared';

import {
  type DocumentRepositoryPort,
  DOCUMENT_REPOSITORY_PORT,
} from '../../../domain/ports/document-repository.port';
import { DocumentValidationService } from '../../../domain/services/document-validation.service';
import { assertTransition } from '../../../domain/value-objects/document-status.rules';

/** Estados desde los que tiene sentido (re)validar. */
const VALIDATABLE = [DocumentStatus.PENDIENTE, DocumentStatus.INCONSISTENTE];

@Injectable()
export class ValidateDocumentUseCase {
  private readonly logger = new Logger(ValidateDocumentUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
    private readonly validation: DocumentValidationService,
  ) {}

  /**
   * Valida un comprobante: PENDIENTE/INCONSISTENTE → EN_VALIDACION →
   * VALIDADO | INCONSISTENTE (con observaciones). Idempotente.
   */
  async execute(id: string, ownerId: string | null): Promise<IDocumentDto | null> {
    const doc = await this.documentRepo.findById(id, ownerId);
    if (!doc) return null;
    if (!VALIDATABLE.includes(doc.estado)) return doc;

    // Paso 1: → EN_VALIDACION
    assertTransition(doc.estado, DocumentStatus.EN_VALIDACION);
    await this.documentRepo.updateStatus(id, ownerId, DocumentStatus.EN_VALIDACION, null);

    // Paso 2: evaluar reglas
    const outcome = this.validation.evaluate({
      subtotal: doc.subtotal,
      iva: doc.iva,
      total: doc.total,
      items: doc.items.map((i) => ({ total: i.total })),
    });

    // Paso 3: → VALIDADO | INCONSISTENTE
    assertTransition(DocumentStatus.EN_VALIDACION, outcome.status);
    const observaciones = outcome.issues.length > 0 ? outcome.issues.join(' ') : null;
    const updated = await this.documentRepo.updateStatus(
      id,
      ownerId,
      outcome.status,
      observaciones,
    );

    this.logger.log(
      `Validación ${doc.numeroFactura}: ${doc.estado} → ${outcome.status}` +
        (observaciones ? ` (${outcome.issues.length} observación/es)` : ''),
    );
    return updated;
  }
}

/** Resultado del proceso de validación masiva. */
export interface ValidatePendingResult {
  readonly validated: number;
  readonly validados: number;
  readonly inconsistentes: number;
}

@Injectable()
export class ValidatePendingDocumentsUseCase {
  private readonly logger = new Logger(ValidatePendingDocumentsUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
    private readonly validateDocument: ValidateDocumentUseCase,
  ) {}

  /** Valida todos los comprobantes PENDIENTE/INCONSISTENTE del dueño. */
  async execute(ownerId: string | null): Promise<ValidatePendingResult> {
    const docs = await this.documentRepo.findByStatuses(ownerId, VALIDATABLE);
    let validados = 0;
    let inconsistentes = 0;

    for (const doc of docs) {
      const updated = await this.validateDocument.execute(doc.id, ownerId);
      if (updated?.estado === DocumentStatus.VALIDADO) validados++;
      else if (updated?.estado === DocumentStatus.INCONSISTENTE) inconsistentes++;
    }

    this.logger.log(
      `Validación masiva owner=${ownerId}: ${validados} validados, ${inconsistentes} inconsistentes`,
    );
    return { validated: docs.length, validados, inconsistentes };
  }
}

@Injectable()
export class AdvanceDocumentStatusUseCase {
  private readonly logger = new Logger(AdvanceDocumentStatusUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
  ) {}

  /**
   * Avanza el estado de un comprobante validando la transición permitida.
   * Usado para VALIDADO → CONSOLIDADO.
   */
  async execute(
    id: string,
    ownerId: string | null,
    target: DocumentStatus,
  ): Promise<IDocumentDto> {
    const doc = await this.documentRepo.findById(id, ownerId);
    if (!doc) {
      throw new NotFoundException(`Comprobante ${id} no encontrado.`);
    }
    assertTransition(doc.estado, target);
    const updated = await this.documentRepo.updateStatus(
      id,
      ownerId,
      target,
      doc.observaciones,
    );
    this.logger.log(`Estado ${doc.numeroFactura}: ${doc.estado} → ${target}`);
    return updated as IDocumentDto;
  }
}
