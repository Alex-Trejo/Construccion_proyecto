/**
 * @fileoverview Caso de uso — Procesar lote de claves de acceso desde TXT.
 *
 * Flujo:
 *   1. Recibe el contenido de un archivo TXT del SRI.
 *   2. Extrae todas las claves de acceso de 49 dígitos (regex).
 *   3. Filtra duplicados y claves ya existentes en BD.
 *   4. Crea registros IncomingInvoice con estado PENDIENTE y origen TXT.
 *
 * Este caso de uso NO descarga los XML. Solo registra las claves
 * para que el FetchAndSanitizeXmlUseCase las procese después.
 *
 * @module ProcessTxtBatchUseCase
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { InvoiceOrigin, InvoiceProcessingStatus } from '@sgc/shared';
import { randomUUID } from 'crypto';

import { IncomingInvoice } from '../../domain/entities/incoming-invoice.entity';
import {
  type IncomingInvoiceRepositoryPort,
  INCOMING_INVOICE_REPOSITORY_PORT,
} from '../../domain/ports/incoming-invoice-repository.port';

/** Resultado del procesamiento del TXT. */
export interface ProcessTxtBatchResult {
  /** Total de claves encontradas en el TXT. */
  readonly totalKeysFound: number;
  /** Claves nuevas registradas (no duplicadas). */
  readonly newKeysRegistered: number;
  /** Claves que ya existían en BD (ignoradas). */
  readonly duplicatesSkipped: number;
  /** Claves con formato inválido (ignoradas). */
  readonly invalidKeysSkipped: number;
  /** Detalle de claves inválidas para feedback al usuario. */
  readonly invalidKeys: ReadonlyArray<string>;
}

@Injectable()
export class ProcessTxtBatchUseCase {
  private readonly logger = new Logger(ProcessTxtBatchUseCase.name);

  constructor(
    @Inject(INCOMING_INVOICE_REPOSITORY_PORT)
    private readonly invoiceRepo: IncomingInvoiceRepositoryPort,
  ) {}

  /**
   * Procesa un archivo TXT y registra las claves de acceso.
   *
   * @param txtContent - Contenido del archivo TXT como string.
   * @returns Resultado con métricas del procesamiento.
   */
  async execute(txtContent: string): Promise<ProcessTxtBatchResult> {
    this.logger.log('Iniciando procesamiento de TXT batch');

    // ── Paso 1: Extraer todas las secuencias de 49 dígitos ────────────────
    const allKeys = this.extractAccessKeys(txtContent);
    this.logger.log(`Claves encontradas en TXT: ${allKeys.length}`);

    // ── Paso 2: Deduplicar dentro del mismo archivo ───────────────────────
    const uniqueKeys = [...new Set(allKeys)];

    // ── Paso 3: Separar válidas de inválidas ──────────────────────────────
    const validKeys: string[] = [];
    const invalidKeys: string[] = [];

    for (const key of uniqueKeys) {
      if (IncomingInvoice.isValidAccessKey(key)) {
        validKeys.push(key);
      } else {
        invalidKeys.push(key);
      }
    }

    // ── Paso 4: Filtrar las que ya existen en BD ──────────────────────────
    const newInvoices: IncomingInvoice[] = [];
    let duplicatesSkipped = 0;

    for (const key of validKeys) {
      const exists = await this.invoiceRepo.existsByClaveAcceso(key);
      if (exists) {
        duplicatesSkipped++;
        continue;
      }

      const invoice = new IncomingInvoice({
        id: randomUUID(),
        claveAcceso: key,
        estado: InvoiceProcessingStatus.PENDIENTE,
        origen: InvoiceOrigin.TXT,
        xmlCrudo: null,
        xmlLimpio: null,
        errorMessage: null,
        intentos: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      newInvoices.push(invoice);
    }

    // ── Paso 5: Persistir en lote ─────────────────────────────────────────
    if (newInvoices.length > 0) {
      await this.invoiceRepo.saveBatch(newInvoices);
    }

    const result: ProcessTxtBatchResult = {
      totalKeysFound: allKeys.length,
      newKeysRegistered: newInvoices.length,
      duplicatesSkipped,
      invalidKeysSkipped: invalidKeys.length,
      invalidKeys,
    };

    this.logger.log(
      `TXT procesado: ${result.newKeysRegistered} nuevas, ` +
      `${result.duplicatesSkipped} duplicadas, ` +
      `${result.invalidKeysSkipped} inválidas`,
    );

    return result;
  }

  /**
   * Extrae todas las secuencias de exactamente 49 dígitos del texto.
   * Soporta múltiples formatos de TXT del SRI (separados por línea,
   * tabulación, coma, etc.).
   */
  private extractAccessKeys(content: string): ReadonlyArray<string> {
    const regex = /\b(\d{49})\b/g;
    const matches: string[] = [];
    let match = regex.exec(content);

    while (match !== null) {
      matches.push(match[1]);
      match = regex.exec(content);
    }

    return matches;
  }
}
