/**
 * @fileoverview Puerto de repositorio — SupplierRepositoryPort.
 *
 * Define el contrato que DEBE implementar cualquier adaptador de
 * persistencia (TypeORM, Prisma, etc.) para el módulo de Proveedores.
 *
 * Principio de Inversión de Dependencias (DIP):
 *   - La capa de Domain define esta interfaz (puerto).
 *   - La capa de Infrastructure implementa el adaptador concreto.
 *   - La capa de Application depende solo del puerto, nunca del adaptador.
 *
 * @module SupplierRepositoryPort
 */

import { Supplier } from '../entities/supplier.entity';

/**
 * Contrato de persistencia para la entidad Supplier.
 * Todas las operaciones retornan Promises para soportar I/O asíncrono.
 */
export interface SupplierRepositoryPort {
  /**
   * Persiste una entidad Supplier (el dueño se toma de `supplier.ownerId`).
   */
  save(supplier: Supplier): Promise<Supplier>;

  /**
   * Busca un proveedor por ID, restringido al dueño (aislamiento).
   * @param ownerId - Dueño (userId). null = registros del sistema.
   */
  findById(id: string, ownerId: string | null): Promise<Supplier | null>;

  /**
   * Busca un proveedor por RUC/Cédula, restringido al dueño.
   */
  findByTaxId(taxId: string, ownerId: string | null): Promise<Supplier | null>;

  /**
   * Retorna los proveedores activos del dueño.
   */
  findAll(ownerId: string | null): Promise<ReadonlyArray<Supplier>>;

  /**
   * Retorna proveedores paginados del dueño.
   */
  findPaginated(
    page: number,
    limit: number,
    ownerId: string | null,
  ): Promise<[ReadonlyArray<Supplier>, number]>;

  /**
   * Actualiza un proveedor existente (el dueño se valida en el caso de uso).
   */
  update(supplier: Supplier): Promise<Supplier>;

  /**
   * Desactiva (soft delete) un proveedor del dueño.
   */
  deactivate(id: string, ownerId: string | null): Promise<void>;

  /**
   * Verifica si el dueño ya tiene un proveedor con el taxId dado.
   */
  existsByTaxId(taxId: string, ownerId: string | null): Promise<boolean>;
}

/**
 * Token de inyección para NestJS.
 * Se usa en providers para vincular el puerto con su implementación:
 *
 * ```ts
 * {
 *   provide: SUPPLIER_REPOSITORY_PORT,
 *   useClass: TypeOrmSupplierRepository,
 * }
 * ```
 */
export const SUPPLIER_REPOSITORY_PORT = Symbol('SUPPLIER_REPOSITORY_PORT');
