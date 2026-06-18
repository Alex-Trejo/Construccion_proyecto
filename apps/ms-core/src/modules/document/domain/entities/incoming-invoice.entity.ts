/**
 * @fileoverview Entidad de dominio — IncomingInvoice (Staging de Facturas).
 *
 * Tabla de staging donde se registran las claves de acceso antes de
 * descargar y procesar el XML completo. Actúa como cola de trabajo.
 *
 * Flujo:
 *   1. ProcessTxtBatchUseCase → Crea registros PENDIENTE.
 *   2. FetchAndSanitizeXmlUseCase → Los toma, descarga XML, marca PROCESADO.
 *
 * @module IncomingInvoice
 */

import { InvoiceOrigin, InvoiceProcessingStatus } from '@sgc/shared';

export interface IncomingInvoiceProps {
  readonly id: string;
  readonly claveAcceso: string;
  readonly estado: InvoiceProcessingStatus;
  readonly origen: InvoiceOrigin;
  readonly xmlCrudo: string | null;
  readonly xmlLimpio: string | null;
  readonly errorMessage: string | null;
  readonly intentos: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class IncomingInvoice {
  private props: IncomingInvoiceProps;

  constructor(props: IncomingInvoiceProps) {
    this.props = props;
  }

  public get id(): string {
    return this.props.id;
  }

  public get claveAcceso(): string {
    return this.props.claveAcceso;
  }

  public get estado(): InvoiceProcessingStatus {
    return this.props.estado;
  }

  public get origen(): InvoiceOrigin {
    return this.props.origen;
  }

  public get xmlCrudo(): string | null {
    return this.props.xmlCrudo;
  }

  public get xmlLimpio(): string | null {
    return this.props.xmlLimpio;
  }

  public get errorMessage(): string | null {
    return this.props.errorMessage;
  }

  public get intentos(): number {
    return this.props.intentos;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Marca la factura como procesada con XML limpio. */
  public markAsProcessed(xmlCrudo: string, xmlLimpio: string): void {
    this.props = {
      ...this.props,
      estado: InvoiceProcessingStatus.PROCESADO,
      xmlCrudo,
      xmlLimpio,
      errorMessage: null,
      updatedAt: new Date(),
    };
  }

  /** Marca la factura como fallida con mensaje de error. */
  public markAsError(errorMessage: string): void {
    this.props = {
      ...this.props,
      estado: InvoiceProcessingStatus.ERROR,
      errorMessage,
      intentos: this.props.intentos + 1,
      updatedAt: new Date(),
    };
  }

  /** Resetea a pendiente para reintentar. */
  public resetToPending(): void {
    this.props = {
      ...this.props,
      estado: InvoiceProcessingStatus.PENDIENTE,
      errorMessage: null,
      updatedAt: new Date(),
    };
  }

  /** Valida que la clave de acceso tenga 49 dígitos numéricos. */
  public static isValidAccessKey(key: string): boolean {
    return /^\d{49}$/.test(key.trim());
  }
}
