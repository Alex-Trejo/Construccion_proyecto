import { normalizeInvoiceNumber } from './invoice-number';

describe('normalizeInvoiceNumber', () => {
  it('should format 15 digits correctly', () => {
    expect(normalizeInvoiceNumber('001002000000123')).toBe('001-002-000000123');
  });

  it('should remove non-digits', () => {
    expect(normalizeInvoiceNumber('001-002-000000123')).toBe('001-002-000000123');
    expect(normalizeInvoiceNumber(' 001_002#000000123 a ')).toBe('001-002-000000123');
  });

  it('should pad partial numbers with > 6 and < 15 digits', () => {
    // 001 002 123 => 9 digits
    expect(normalizeInvoiceNumber('001002123')).toBe('001-002-000000123');
    // 001 002 01234 => 10 digits
    expect(normalizeInvoiceNumber('00100201234')).toBe('001-002-000001234');
  });

  it('should return just digits if < 6 digits or > 15', () => {
    expect(normalizeInvoiceNumber('12345')).toBe('12345');
    expect(normalizeInvoiceNumber('1234567890123456')).toBe('1234567890123456');
  });

  it('should handle null, undefined and empty strings', () => {
    expect(normalizeInvoiceNumber(null as any)).toBe('');
    expect(normalizeInvoiceNumber(undefined)).toBe('');
    expect(normalizeInvoiceNumber('')).toBe('');
    expect(normalizeInvoiceNumber('   ')).toBe('');
    expect(normalizeInvoiceNumber('abc')).toBe('');
  });
});
