import { IncomingInvoice } from './incoming-invoice.entity';
import { InvoiceOrigin, InvoiceProcessingStatus } from '@sgc/shared';

describe('IncomingInvoice Entity', () => {
  it('should create a valid IncomingInvoice', () => {
    const props = {
      id: 'inv-1',
      claveAcceso: '1'.repeat(49),
      estado: InvoiceProcessingStatus.PENDIENTE,
      origen: InvoiceOrigin.TXT,
      xmlCrudo: null,
      xmlLimpio: null,
      errorMessage: null,
      intentos: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const invoice = new IncomingInvoice(props);

    expect(invoice.id).toBe('inv-1');
    expect(invoice.claveAcceso).toBe('1'.repeat(49));
    expect(invoice.estado).toBe(InvoiceProcessingStatus.PENDIENTE);
  });

  it('should validate access key correctly', () => {
    expect(IncomingInvoice.isValidAccessKey('1'.repeat(49))).toBe(true);
    expect(IncomingInvoice.isValidAccessKey('1'.repeat(48))).toBe(false);
    expect(IncomingInvoice.isValidAccessKey('1'.repeat(50))).toBe(false);
    expect(IncomingInvoice.isValidAccessKey('A'.repeat(49))).toBe(false);
  });

  it('should mark as processed', () => {
    const invoice = new IncomingInvoice({
      id: 'inv-1',
      claveAcceso: '1'.repeat(49),
      estado: InvoiceProcessingStatus.PENDIENTE,
      origen: InvoiceOrigin.TXT,
      xmlCrudo: null,
      xmlLimpio: null,
      errorMessage: null,
      intentos: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    invoice.markAsProcessed('<crudo>', '<limpio>');

    expect(invoice.estado).toBe(InvoiceProcessingStatus.PROCESADO);
    expect(invoice.xmlCrudo).toBe('<crudo>');
    expect(invoice.xmlLimpio).toBe('<limpio>');
    expect(invoice.errorMessage).toBeNull();
  });

  it('should mark as error', () => {
    const invoice = new IncomingInvoice({
      id: 'inv-1',
      claveAcceso: '1'.repeat(49),
      estado: InvoiceProcessingStatus.PENDIENTE,
      origen: InvoiceOrigin.TXT,
      xmlCrudo: null,
      xmlLimpio: null,
      errorMessage: null,
      intentos: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    invoice.markAsError('Test error');

    expect(invoice.estado).toBe(InvoiceProcessingStatus.ERROR);
    expect(invoice.errorMessage).toBe('Test error');
    expect(invoice.intentos).toBe(1);
  });

  it('should increment attempts and stay pending if marked for retry', () => {
    const invoice = new IncomingInvoice({
      id: 'inv-1',
      claveAcceso: '1'.repeat(49),
      estado: InvoiceProcessingStatus.PENDIENTE,
      origen: InvoiceOrigin.TXT,
      xmlCrudo: null,
      xmlLimpio: null,
      errorMessage: null,
      intentos: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    invoice.markForRetry('Temp error');

    expect(invoice.estado).toBe(InvoiceProcessingStatus.PENDIENTE);
    expect(invoice.errorMessage).toBe('Temp error');
    expect(invoice.intentos).toBe(1);
  });
});
