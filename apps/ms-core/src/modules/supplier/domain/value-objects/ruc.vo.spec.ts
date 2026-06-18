/**
 * @fileoverview Tests unitarios — Value Object Ruc.
 *
 * Verifica las reglas de validación del RUC/Cédula ecuatoriano:
 *   - Cédula: 10 dígitos numéricos con dígito verificador (módulo 10).
 *   - RUC: 13 dígitos numéricos, terminados en "001".
 *   - Rechaza formatos inválidos (letras, longitudes incorrectas, dígito verificador malo).
 */

import { Ruc } from './ruc.vo';

describe('Ruc Value Object', () => {
  // ── Cédulas válidas ──────────────────────────────────────────────────
  describe('cédulas válidas', () => {
    it('debe aceptar una cédula de 10 dígitos con dígito verificador correcto', () => {
      // Cédula: 1710034065 — dígito verificador válido
      const ruc = Ruc.create('1710034065');
      expect(ruc.value).toBe('1710034065');
      expect(ruc.isCedula).toBe(true);
      expect(ruc.isRuc).toBe(false);
    });

    it('debe limpiar espacios antes de validar', () => {
      const ruc = Ruc.create('  1710034065  ');
      expect(ruc.value).toBe('1710034065');
    });
  });

  // ── RUC válido ───────────────────────────────────────────────────────
  describe('RUC válido', () => {
    it('debe aceptar un RUC de 13 dígitos terminado en 001', () => {
      const ruc = Ruc.create('1710034065001');
      expect(ruc.value).toBe('1710034065001');
      expect(ruc.isRuc).toBe(true);
      expect(ruc.isCedula).toBe(false);
    });
  });

  // ── Formatos inválidos ───────────────────────────────────────────────
  describe('formatos inválidos', () => {
    it('debe rechazar cadenas con letras', () => {
      expect(() => Ruc.create('17ABC34065')).toThrow('RUC/Cédula inválido');
    });

    it('debe rechazar cadenas de longitud incorrecta (8 dígitos)', () => {
      expect(() => Ruc.create('12345678')).toThrow('RUC/Cédula inválido');
    });

    it('debe rechazar RUC de 13 dígitos que no termina en 001', () => {
      expect(() => Ruc.create('1710034065999')).toThrow(
        'RUC debe terminar en "001"',
      );
    });

    it('debe rechazar cadenas vacías', () => {
      expect(() => Ruc.create('')).toThrow('RUC/Cédula inválido');
    });
  });

  // ── Igualdad por valor ───────────────────────────────────────────────
  describe('igualdad', () => {
    it('dos instancias con el mismo valor deben ser iguales', () => {
      const a = Ruc.create('1710034065');
      const b = Ruc.create('1710034065');
      expect(a.equals(b)).toBe(true);
    });

    it('dos instancias con valor diferente no deben ser iguales', () => {
      const a = Ruc.create('1710034065');
      const b = Ruc.create('1710034065001');
      expect(a.equals(b)).toBe(false);
    });
  });

  // ── toString ─────────────────────────────────────────────────────────
  describe('toString', () => {
    it('debe retornar el valor como string', () => {
      const ruc = Ruc.create('1710034065');
      expect(ruc.toString()).toBe('1710034065');
    });
  });
});
