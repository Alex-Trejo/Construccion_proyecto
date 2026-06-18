import { Logger } from '@nestjs/common';
import { FetchAndSanitizeXmlUseCase } from './fetch-and-sanitize-xml.use-case';
import { InvoiceProcessingStatus } from '@sgc/shared';
import { ConfigService } from '@nestjs/config';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

jest.mock('path', () => ({
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p),
}));

describe('FetchAndSanitizeXmlUseCase', () => {
  let useCase: FetchAndSanitizeXmlUseCase;
  let invoiceRepoMock: any;
  let sriSoapMock: any;
  let xmlSanitizerMock: any;
  let xmlValidatorMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    invoiceRepoMock = {
      findByEstado: jest.fn(),
      update: jest.fn(),
    };
    sriSoapMock = {
      fetchAuthorization: jest.fn(),
    };
    xmlSanitizerMock = {
      sanitizeKeepSignature: jest.fn(),
      sanitize: jest.fn(),
    };
    xmlValidatorMock = {
      validateAgainstXsd: jest.fn(),
    };
    configServiceMock = {
      get: jest.fn().mockReturnValue('/mock/xsd/path'),
    };

    useCase = new FetchAndSanitizeXmlUseCase(
      invoiceRepoMock,
      sriSoapMock,
      xmlSanitizerMock,
      xmlValidatorMock,
      configServiceMock,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should process pending invoices successfully', async () => {
      const mockInvoice = {
        claveAcceso: '123',
        markAsError: jest.fn(),
        markAsProcessed: jest.fn(),
      };
      invoiceRepoMock.findByEstado.mockResolvedValue([mockInvoice]);
      sriSoapMock.fetchAuthorization.mockResolvedValue({
        estado: 'AUTORIZADO',
        comprobante: '<factura><test/></factura>',
      });
      xmlSanitizerMock.sanitizeKeepSignature.mockReturnValue('<factura><test/></factura>');
      xmlSanitizerMock.sanitize.mockReturnValue('<factura><test/></factura>');
      xmlValidatorMock.validateAgainstXsd.mockResolvedValue({ isValid: true });

      const result = await useCase.execute();

      expect(result.totalProcessed).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(mockInvoice.markAsProcessed).toHaveBeenCalled();
      expect(invoiceRepoMock.update).toHaveBeenCalledWith(mockInvoice);
    });

    it('should mark as error if SRI authorization is not AUTORIZADO', async () => {
      const mockInvoice = {
        claveAcceso: '123',
        markAsError: jest.fn(),
        markAsProcessed: jest.fn(),
      };
      invoiceRepoMock.findByEstado.mockResolvedValue([mockInvoice]);
      sriSoapMock.fetchAuthorization.mockResolvedValue({
        estado: 'EN PROCESO',
      });

      const result = await useCase.execute();

      expect(result.errorCount).toBe(1);
      expect(mockInvoice.markAsError).toHaveBeenCalledWith(expect.stringContaining('EN PROCESO'));
      expect(invoiceRepoMock.update).toHaveBeenCalledWith(mockInvoice);
    });
  });

  describe('sanitizeAndValidateXml', () => {
    it('should return error if validation fails', async () => {
      const rawXml = '<factura><test/></factura>';
      xmlSanitizerMock.sanitizeKeepSignature.mockReturnValue(rawXml);
      xmlValidatorMock.validateAgainstXsd.mockResolvedValue({
        isValid: false,
        errors: ['Tag missing'],
      });

      const result = await useCase.sanitizeAndValidateXml(rawXml);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Validación XSD fallida');
    });

    it('should catch unhandled errors in sanitize', async () => {
      xmlSanitizerMock.sanitizeKeepSignature.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = await useCase.sanitizeAndValidateXml('<xml/>');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Parse error');
    });
  });
});
