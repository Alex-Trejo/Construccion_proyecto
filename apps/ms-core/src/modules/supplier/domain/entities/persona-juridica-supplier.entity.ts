/**
 * @fileoverview Entidad concreta — Proveedor Persona Jurídica.
 *
 * Extiende Supplier con campos específicos: razón social, nombre
 * comercial, representante legal.
 *
 * @module PersonaJuridicaSupplier
 */

import { SupplierType } from '@sgc/shared';
import { Supplier, SupplierProps } from './supplier.entity';

export interface PersonaJuridicaProps extends SupplierProps {
  readonly supplierType: SupplierType.PERSONA_JURIDICA;
  readonly businessName: string;
  readonly tradeName: string;
  readonly legalRepresentative: string;
}

export class PersonaJuridicaSupplier extends Supplier {
  private readonly juridicaProps: PersonaJuridicaProps;

  constructor(props: PersonaJuridicaProps) {
    super(props);
    this.juridicaProps = props;
  }

  public get businessName(): string {
    return this.juridicaProps.businessName;
  }

  public get tradeName(): string {
    return this.juridicaProps.tradeName;
  }

  public get legalRepresentative(): string {
    return this.juridicaProps.legalRepresentative;
  }

  /**
   * Nombre de presentación: razón social.
   */
  public getDisplayName(): string {
    return this.juridicaProps.businessName.toUpperCase();
  }
}
