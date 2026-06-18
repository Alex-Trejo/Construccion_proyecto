/**
 * @fileoverview Entidad concreta — Proveedor Persona Natural.
 *
 * Extiende Supplier con campos específicos: nombre, apellido, cédula.
 *
 * @module PersonaNaturalSupplier
 */

import { SupplierType } from '@sgc/shared';
import { Supplier, SupplierProps } from './supplier.entity';

export interface PersonaNaturalProps extends SupplierProps {
  readonly supplierType: SupplierType.PERSONA_NATURAL;
  readonly firstName: string;
  readonly lastName: string;
  readonly cedula: string;
}

export class PersonaNaturalSupplier extends Supplier {
  private readonly naturalProps: PersonaNaturalProps;

  constructor(props: PersonaNaturalProps) {
    super(props);
    this.naturalProps = props;
  }

  public get firstName(): string {
    return this.naturalProps.firstName;
  }

  public get lastName(): string {
    return this.naturalProps.lastName;
  }

  public get cedula(): string {
    return this.naturalProps.cedula;
  }

  /**
   * Nombre de presentación: "APELLIDO NOMBRE"
   */
  public getDisplayName(): string {
    return `${this.naturalProps.lastName.toUpperCase()} ${this.naturalProps.firstName}`;
  }
}
