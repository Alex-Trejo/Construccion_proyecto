/**
 * @fileoverview Tests unitarios — Value Object SupplierCode.
 *
 * Verifica la generación y reconstrucción de códigos de proveedor:
 *   - Formato: {NAT|JUR}-{taxId}
 *   - Generación determinística desde tipo + taxId.
 *   - Reconstrucción desde la base de datos con validación de formato.
 */

import { SupplierType } from '@sgc/shared';
import { SupplierCode } from './supplier-code.vo';

describe('SupplierCode Value Object', () => {
  // ── Generación ───────────────────────────────────────────────────────
  describe('generate', () => {
    it('debe generar código NAT para PERSONA_NATURAL', () => {
      const code = SupplierCode.generate(
        SupplierType.PERSONA_NATURAL,
        '1710034065',
      );
      expect(code.value).toBe('NAT-1710034065');
    });

    it('debe generar código JUR para PERSONA_JURIDICA', () => {
      const code = SupplierCode.generate(
        SupplierType.PERSONA_JURIDICA,
        '1790012345001',
      );
      expect(code.value).toBe('JUR-1790012345001');
    });

    it('debe limpiar espacios del taxId', () => {
      const code = SupplierCode.generate(
        SupplierType.PERSONA_NATURAL,
        '  1710034065  ',
      );
      expect(code.value).toBe('NAT-1710034065');
    });
  });

  // ── Reconstrucción ───────────────────────────────────────────────────
  describe('fromExisting', () => {
    it('debe reconstruir un código NAT válido', () => {
      const code = SupplierCode.fromExisting('NAT-1710034065');
      expect(code.value).toBe('NAT-1710034065');
    });

    it('debe reconstruir un código JUR válido', () => {
      const code = SupplierCode.fromExisting('JUR-1790012345001');
      expect(code.value).toBe('JUR-1790012345001');
    });

    it('debe rechazar formatos inválidos', () => {
      expect(() => SupplierCode.fromExisting('INVALID-CODE')).toThrow(
        'Código de proveedor inválido',
      );
    });

    it('debe rechazar prefijos no reconocidos', () => {
      expect(() => SupplierCode.fromExisting('XXX-1710034065')).toThrow(
        'Código de proveedor inválido',
      );
    });
  });

  // ── Igualdad por valor ───────────────────────────────────────────────
  describe('equals', () => {
    it('dos códigos con el mismo valor deben ser iguales', () => {
      const a = SupplierCode.generate(SupplierType.PERSONA_NATURAL, '1710034065');
      const b = SupplierCode.generate(SupplierType.PERSONA_NATURAL, '1710034065');
      expect(a.equals(b)).toBe(true);
    });

    it('dos códigos distintos no deben ser iguales', () => {
      const nat = SupplierCode.generate(SupplierType.PERSONA_NATURAL, '1710034065');
      const jur = SupplierCode.generate(SupplierType.PERSONA_JURIDICA, '1790012345001');
      expect(nat.equals(jur)).toBe(false);
    });
  });
});
