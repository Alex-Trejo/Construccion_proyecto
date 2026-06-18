/**
 * @fileoverview Entidad de dominio abstracta — Supplier (Proveedor).
 *
 * Clase base que encapsula la lógica común a todo proveedor.
 * Las clases hijas (PersonaNaturalSupplier, PersonaJuridicaSupplier)
 * implementan los detalles específicos de cada tipo.
 *
 * Principios SOLID:
 *   - SRP: Solo contiene lógica de dominio del proveedor.
 *   - OCP: Nuevos tipos de proveedor se crean extendiendo esta clase.
 *   - LSP: Las subclases son intercambiables donde se use Supplier.
 *
 * @module Supplier
 */

import { SupplierType } from '@sgc/shared';
import { Ruc } from '../value-objects/ruc.vo';
import { SupplierCode } from '../value-objects/supplier-code.vo';

export interface SupplierProps {
  readonly id: string;
  readonly supplierCode: SupplierCode;
  readonly supplierType: SupplierType;
  readonly ruc: Ruc;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export abstract class Supplier {
  protected readonly props: SupplierProps;

  protected constructor(props: SupplierProps) {
    this.props = props;
  }

  public get id(): string {
    return this.props.id;
  }

  public get supplierCode(): SupplierCode {
    return this.props.supplierCode;
  }

  public get supplierType(): SupplierType {
    return this.props.supplierType;
  }

  public get ruc(): Ruc {
    return this.props.ruc;
  }

  public get email(): string {
    return this.props.email;
  }

  public get phone(): string {
    return this.props.phone;
  }

  public get address(): string {
    return this.props.address;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Retorna el nombre de presentación del proveedor.
   * Cada subclase implementa su propia lógica.
   */
  public abstract getDisplayName(): string;
}
