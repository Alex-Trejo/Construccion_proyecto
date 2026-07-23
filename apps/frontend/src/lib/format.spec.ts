import { formatMoney, formatDate, statusTone, statusBarClass } from './format';
import { DocumentStatus } from '@sgc/shared';

describe('format utilities', () => {
  describe('formatMoney', () => {
    it('debe formatear a moneda USD', () => {
      expect(formatMoney(1234.5)).toMatch(/\$1[.,]234[.,]50/); // Dependiendo de locales en node
    });

    it('debe manejar 0 y negativos', () => {
      expect(formatMoney(0)).toMatch(/\$0[.,]00/);
      expect(formatMoney(-10)).toMatch(/\$-10[.,]00/);
    });

    it('debe manejar NaN o Infinity como 0', () => {
      expect(formatMoney(NaN)).toMatch(/\$0[.,]00/);
      expect(formatMoney(Infinity)).toMatch(/\$0[.,]00/);
    });
  });

  describe('formatDate', () => {
    it('debe formatear fecha valida', () => {
      const result = formatDate('2023-01-01T12:00:00Z');
      expect(result).not.toBe('—');
      // No comprobamos formato exacto por diferencias de locale, solo que no falle
    });

    it('debe retornar "—" si la fecha es invalida o nula', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('')).toBe('—');
      expect(formatDate('invalid-date')).toBe('—');
    });
  });

  describe('statusTone y statusBarClass', () => {
    it('debe devolver success para VALIDADO y CONSOLIDADO', () => {
      expect(statusTone(DocumentStatus.VALIDADO)).toBe('success');
      expect(statusBarClass(DocumentStatus.CONSOLIDADO)).toBe('bg-[var(--color-success)]');
    });

    it('debe devolver warning para PENDIENTE y EN_VALIDACION', () => {
      expect(statusTone(DocumentStatus.PENDIENTE)).toBe('warning');
      expect(statusBarClass(DocumentStatus.EN_VALIDACION)).toBe('bg-[var(--color-warning)]');
    });

    it('debe devolver danger para INCONSISTENTE y RECHAZADO', () => {
      expect(statusTone(DocumentStatus.RECHAZADO)).toBe('danger');
      expect(statusBarClass(DocumentStatus.INCONSISTENTE)).toBe('bg-[var(--color-danger)]');
    });

    it('debe devolver neutral para otros', () => {
      expect(statusTone('DESCONOCIDO')).toBe('neutral');
      expect(statusBarClass('DESCONOCIDO')).toBe('bg-primary');
    });
  });
});
