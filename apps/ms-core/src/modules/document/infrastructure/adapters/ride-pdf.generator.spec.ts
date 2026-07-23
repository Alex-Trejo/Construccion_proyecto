import { Test, type TestingModule } from '@nestjs/testing';
import { RidePdfGenerator, type RideData } from './ride-pdf.generator';

describe('RidePdfGenerator', () => {
  let generator: RidePdfGenerator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RidePdfGenerator],
    }).compile();

    generator = module.get<RidePdfGenerator>(RidePdfGenerator);
  });

  it('should be defined', () => {
    expect(generator).toBeDefined();
  });

  it('should generate a PDF buffer with full data', async () => {
    const data: RideData = {
      documentType: 'FACTURA',
      numeroFactura: '001-001-000000001',
      rucEmisor: '1790011674001',
      razonSocialEmisor: 'Empresa Test',
      fechaEmision: '2023-01-01',
      claveAcceso: '1234567890123456789012345678901234567890123456789',
      subtotal: 100,
      iva: 12,
      total: 112,
      items: [
        { descripcion: 'Item 1', cantidad: 2, precioUnitario: 50, total: 100 },
        { descripcion: 'Item 2', cantidad: 1, precioUnitario: 0, total: 0 },
      ],
    };

    const pdfBuffer = await generator.generate(data);
    
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // Verificamos que contenga la cabecera PDF válida
    expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('should generate a PDF buffer with minimal data (no items)', async () => {
    const data: RideData = {
      documentType: 'NOTA DE CRÉDITO',
      numeroFactura: '001-001-000000002',
      rucEmisor: '1790011674001',
      razonSocialEmisor: null,
      fechaEmision: null,
      claveAcceso: null,
      subtotal: 0,
      iva: 0,
      total: 0,
      items: [],
    };

    const pdfBuffer = await generator.generate(data);
    
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
  });
});
