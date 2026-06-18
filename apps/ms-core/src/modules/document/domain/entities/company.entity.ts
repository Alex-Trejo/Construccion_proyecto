/**
 * @fileoverview Entidad de dominio — Company (Empresa Receptora).
 *
 * Representa la empresa que RECIBE los comprobantes (el contribuyente
 * dueño de este sistema). Sus datos se obtienen del catastro del SRI.
 *
 * @module Company
 */

import { TaxRegime } from '@sgc/shared';
import { Ruc } from '../../../supplier/domain/value-objects/ruc.vo';

export interface CompanyProps {
  readonly id: string;
  readonly ruc: Ruc;
  readonly razonSocial: string;
  readonly nombreComercial: string;
  readonly direccion: string;
  readonly obligadoLlevarContabilidad: boolean;
  readonly regimen: TaxRegime;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Company {
  private readonly props: CompanyProps;

  constructor(props: CompanyProps) {
    this.props = props;
  }

  public get id(): string {
    return this.props.id;
  }

  public get ruc(): Ruc {
    return this.props.ruc;
  }

  public get razonSocial(): string {
    return this.props.razonSocial;
  }

  public get nombreComercial(): string {
    return this.props.nombreComercial;
  }

  public get direccion(): string {
    return this.props.direccion;
  }

  public get obligadoLlevarContabilidad(): boolean {
    return this.props.obligadoLlevarContabilidad;
  }

  public get regimen(): TaxRegime {
    return this.props.regimen;
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
}
