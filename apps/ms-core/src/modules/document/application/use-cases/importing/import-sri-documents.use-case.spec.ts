import { ImportSriDocumentsUseCase } from './import-sri-documents.use-case';
import { type IncomingInvoiceRepositoryPort } from '../../../domain/ports/incoming-invoice-repository.port';
import { type SriSoapApiPort } from '../../../domain/ports/sri-soap-api.port';
import { type XmlSriParserPort } from '../../../domain/ports/xml-sri-parser.port';
import { FetchAndSanitizeXmlUseCase } from '../processing/fetch-and-sanitize-xml.use-case';
import { PersistParsedDocumentUseCase } from '../processing/persist-parsed-document.use-case';
import { InvoiceProcessingStatus } from '@sgc/shared';
import { IncomingInvoice } from '../../../domain/entities/incoming-invoice.entity';

describe('ImportSriDocumentsUseCase', () => {
  let useCase: ImportSriDocumentsUseCase;
  let invoiceRepoMock: jest.Mocked<IncomingInvoiceRepositoryPort>;
  let sriSoapMock: jest.Mocked<SriSoapApiPort>;
  let xmlParserMock: jest.Mocked<XmlSriParserPort>;
  let fetchAndSanitizeMock: jest.Mocked<FetchAndSanitizeXmlUseCase>;
  let persistParsedMock: jest.Mocked<PersistParsedDocumentUseCase>;

  const mockOwnerId = 'owner-123';

  beforeEach(() => {
    invoiceRepoMock = {
      save: jest.fn(),
      findByEstado: jest.fn(),
      findByOwnerAndEstado: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IncomingInvoiceRepositoryPort>;

    sriSoapMock = {
      fetchAuthorization: jest.fn(),
      fetchInvoiceXml: jest.fn(),
    } as unknown as jest.Mocked<SriSoapApiPort>;

    xmlParserMock = {
      parse: jest.fn(),
    } as unknown as jest.Mocked<XmlSriParserPort>;

    fetchAndSanitizeMock = {
      sanitizeAndValidateXml: jest.fn(),
    } as unknown as jest.Mocked<FetchAndSanitizeXmlUseCase>;

    persistParsedMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<PersistParsedDocumentUseCase>;

    useCase = new ImportSriDocumentsUseCase(
      invoiceRepoMock,
      sriSoapMock,
      xmlParserMock,
      fetchAndSanitizeMock,
      persistParsedMock,
    );
  });

  describe('processPending', () => {
    it('debe procesar exitosamente una clave de acceso', async () => {
      const mockInvoice = new IncomingInvoice({
        id: '1',
        ownerId: mockOwnerId,
        claveAcceso: 'CLAVE1',
        estado: InvoiceProcessingStatus.PENDIENTE,
        origen: 'TXT',
        xmlCrudo: null,
        xmlLimpio: null,
        errorMessage: null,
        intentos: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      invoiceRepoMock.findByEstado.mockResolvedValue([mockInvoice]);
      
      sriSoapMock.fetchAuthorization.mockResolvedValue({
        estado: 'AUTORIZADO',
        comprobante: '<xml>bruto</xml>',
      });

      fetchAndSanitizeMock.sanitizeAndValidateXml.mockResolvedValue({
        xmlLimpio: '<xml>limpio</xml>',
      });

      const parsedMock = { rucEmisor: '123' } as any;
      xmlParserMock.parse.mockResolvedValue(parsedMock);

      await useCase.processPending(mockOwnerId);

      expect(sriSoapMock.fetchAuthorization).toHaveBeenCalledWith('CLAVE1');
      expect(xmlParserMock.parse).toHaveBeenCalledWith('<xml>limpio</xml>');
      expect(persistParsedMock.execute).toHaveBeenCalledWith(
        parsedMock,
        '<xml>limpio</xml>',
        mockOwnerId,
        'MANUAL_TXT',
      );
      expect(mockInvoice.estado).toBe(InvoiceProcessingStatus.PROCESADO);
      expect(invoiceRepoMock.update).toHaveBeenCalledWith(mockInvoice);
    });

    it('debe marcar como error si SRI no autoriza', async () => {
      const mockInvoice = new IncomingInvoice({
        id: '1',
        ownerId: mockOwnerId,
        claveAcceso: 'CLAVE1',
        estado: InvoiceProcessingStatus.PENDIENTE,
        origen: 'TXT',
        xmlCrudo: null,
        xmlLimpio: null,
        errorMessage: null,
        intentos: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      invoiceRepoMock.findByEstado.mockResolvedValue([mockInvoice]);
      
      sriSoapMock.fetchAuthorization.mockResolvedValue({
        estado: 'NO AUTORIZADO',
        comprobante: null,
      });

      await useCase.processPending(mockOwnerId);

      expect(mockInvoice.estado).toBe(InvoiceProcessingStatus.ERROR);
      expect(mockInvoice.errorMessage).toContain('not_authorized');
      expect(invoiceRepoMock.update).toHaveBeenCalledWith(mockInvoice);
      expect(xmlParserMock.parse).not.toHaveBeenCalled();
    });
  });

  describe('retryFailed', () => {
    it('debe reintentar solo errores de red (transitorios)', async () => {
      const networkErrorInvoice = new IncomingInvoice({
        id: '1',
        ownerId: mockOwnerId,
        claveAcceso: 'CLAVE1',
        estado: InvoiceProcessingStatus.ERROR,
        origen: 'TXT',
        xmlCrudo: null,
        xmlLimpio: null,
        errorMessage: 'network_error: Timeout',
        intentos: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const notAuthInvoice = new IncomingInvoice({
        id: '2',
        ownerId: mockOwnerId,
        claveAcceso: 'CLAVE2',
        estado: InvoiceProcessingStatus.ERROR,
        origen: 'TXT',
        xmlCrudo: null,
        xmlLimpio: null,
        errorMessage: 'not_authorized: SRI: NO AUTORIZADO',
        intentos: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      invoiceRepoMock.findByOwnerAndEstado.mockResolvedValue([
        networkErrorInvoice,
        notAuthInvoice,
      ]);
      
      // Para el proceso, devuelve la entidad reseteada a PENDIENTE
      invoiceRepoMock.findByEstado.mockResolvedValue([networkErrorInvoice]);
      sriSoapMock.fetchAuthorization.mockResolvedValue({ estado: 'NO AUTORIZADO', comprobante: null }); // Para q no crashee en el mock

      const result = await useCase.retryFailed(mockOwnerId);

      expect(result.retried).toBe(1);
      expect(networkErrorInvoice.estado).toBe(InvoiceProcessingStatus.ERROR); // Luego del retry falla de nuevo en el mock
      // Asegurar que notAuthInvoice no se reintentó (su update se llama para network, no auth)
      expect(invoiceRepoMock.update).toHaveBeenCalledWith(
        expect.objectContaining({ claveAcceso: 'CLAVE1' }),
      );
    });
  });
});
