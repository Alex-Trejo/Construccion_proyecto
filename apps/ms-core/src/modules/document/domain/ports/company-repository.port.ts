/**
 * @fileoverview Puerto — Repositorio de Company (Empresa Receptora).
 *
 * Contrato de persistencia para la empresa dueña del sistema que recibe
 * los comprobantes. La implementación concreta vive en Infrastructure.
 *
 * @module CompanyRepositoryPort
 */

import { Company } from '../entities/company.entity';

export interface CompanyRepositoryPort {
  save(company: Company): Promise<Company>;
  findById(id: string): Promise<Company | null>;
  findByTaxId(taxId: string): Promise<Company | null>;
  existsByTaxId(taxId: string): Promise<boolean>;
}

export const COMPANY_REPOSITORY_PORT = Symbol('COMPANY_REPOSITORY_PORT');
