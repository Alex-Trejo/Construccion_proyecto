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
   * Persiste una nueva entidad Supplier.
   * @param supplier - Entidad de dominio a guardar.
   * @returns La entidad persistida con su ID.
   */
  save(supplier: Supplier): Promise<Supplier>;

  /**
   * Busca un proveedor por su ID.
   * @param id - UUID del proveedor.
   * @returns La entidad encontrada o null si no existe.
   */
  findById(id: string): Promise<Supplier | null>;

  /**
   * Busca un proveedor por su RUC/Cédula.
   * @param taxId - RUC (13 dígitos) o Cédula (10 dígitos).
   * @returns La entidad encontrada o null si no existe.
   */
  findByTaxId(taxId: string): Promise<Supplier | null>;

  /**
   * Retorna todos los proveedores activos.
   * @returns Array de entidades Supplier.
   */
  findAll(): Promise<ReadonlyArray<Supplier>>;

  /**
   * Retorna proveedores paginados.
   * @param page - Número de página (1-indexed).
   * @param limit - Elementos por página.
   * @returns Tupla [items, totalCount].
   */
  findPaginated(page: number, limit: number): Promise<[ReadonlyArray<Supplier>, number]>;

  /**
   * Actualiza una entidad Supplier existente.
   * @param supplier - Entidad con datos actualizados.
   * @returns La entidad actualizada.
   */
  update(supplier: Supplier): Promise<Supplier>;

  /**
   * Desactiva (soft delete) un proveedor.
   * @param id - UUID del proveedor a desactivar.
   */
  deactivate(id: string): Promise<void>;

  /**
   * Verifica si ya existe un proveedor con el taxId dado.
   * @param taxId - RUC o Cédula.
   * @returns true si existe, false si no.
   */
  existsByTaxId(taxId: string): Promise<boolean>;
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
