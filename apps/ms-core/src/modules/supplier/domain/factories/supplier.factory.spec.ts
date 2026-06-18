/**
 * @fileoverview Tests unitarios — SupplierFactory (Factory Method).
 *
 * Verifica que el patrón Factory Method instancia correctamente las
 * entidades concretas (PersonaNaturalSupplier, PersonaJuridicaSupplier)
 * y genera los value objects (SupplierCode, Ruc) automáticamente.
 */

import { SupplierType } from '@sgc/shared';
import { SupplierFactory } from './supplier.factory';
import { PersonaNaturalSupplier } from '../entities/persona-natural-supplier.entity';
import { PersonaJuridicaSupplier } from '../entities/persona-juridica-supplier.entity';

describe('SupplierFactory', () => {
  // ── Persona Natural ──────────────────────────────────────────────────
  describe('Persona Natural', () => {
    const dto = {
      supplierType: SupplierType.PERSONA_NATURAL as const,
      taxId: '1710034065',
      firstName: 'Juan',
      lastName: 'Pérez',
      cedula: '1710034065',
      email: 'juan@test.com',
      phone: '0991234567',
      address: 'Quito, Ecuador',
    };

    it('debe crear una instancia de PersonaNaturalSupplier', () => {
      const supplier = SupplierFactory.create(dto);
      expect(supplier).toBeInstanceOf(PersonaNaturalSupplier);
    });

    it('debe generar un SupplierCode con prefijo NAT', () => {
      const supplier = SupplierFactory.create(dto);
      expect(supplier.supplierCode.value).toMatch(/^NAT-/);
    });

    it('debe asignar el tipo PERSONA_NATURAL', () => {
      const supplier = SupplierFactory.create(dto);
      expect(supplier.supplierType).toBe(SupplierType.PERSONA_NATURAL);
    });

    it('debe estar activo por defecto', () => {
      const supplier = SupplierFactory.create(dto);
      expect(supplier.isActive).toBe(true);
    });

    it('debe generar un UUID como id', () => {
      const supplier = SupplierFactory.create(dto);
      expect(supplier.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('debe retornar el display name correcto (APELLIDO Nombre)', () => {
      const supplier = SupplierFactory.create(dto) as PersonaNaturalSupplier;
      expect(supplier.getDisplayName()).toBe('PÉREZ Juan');
    });
  });

  // ── Persona Jurídica ─────────────────────────────────────────────────
  describe('Persona Jurídica', () => {
    const dto = {
      supplierType: SupplierType.PERSONA_JURIDICA as const,
      taxId: '1710034065001',
      businessName: 'Constructora ABC S.A.',
      tradeName: 'ABC Construcciones',
      legalRepresentative: 'María López',
      email: 'info@abc.com',
      phone: '022345678',
      address: 'Guayaquil, Ecuador',
    };

    it('debe crear una instancia de PersonaJuridicaSupplier', () => {
      const supplier = SupplierFactory.create(dto);
      expect(supplier).toBeInstanceOf(PersonaJuridicaSupplier);
    });

    it('debe generar un SupplierCode con prefijo JUR', () => {
      const supplier = SupplierFactory.create(dto);
      expect(supplier.supplierCode.value).toMatch(/^JUR-/);
    });

    it('debe asignar el tipo PERSONA_JURIDICA', () => {
      const supplier = SupplierFactory.create(dto);
      expect(supplier.supplierType).toBe(SupplierType.PERSONA_JURIDICA);
    });

    it('debe retornar el display name correcto (razón social en mayúsculas)', () => {
      const supplier = SupplierFactory.create(dto) as PersonaJuridicaSupplier;
      expect(supplier.getDisplayName()).toBe('CONSTRUCTORA ABC S.A.');
    });
  });
});
