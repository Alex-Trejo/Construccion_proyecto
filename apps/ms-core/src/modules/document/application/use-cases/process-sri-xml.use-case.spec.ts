import { Logger } from '@nestjs/common';
import { ProcessSriXmlUseCase } from './process-sri-xml.use-case';

describe('ProcessSriXmlUseCase', () => {
  let useCase: ProcessSriXmlUseCase;
  let xmlParserMock: any;
  let fetchAndSanitizeMock: any;
  let autoProvisionMock: any;

  beforeEach(() => {
    xmlParserMock = {
      validate: jest.fn(),
      parse: jest.fn(),
    };
    fetchAndSanitizeMock = {
      sanitizeAndValidateXml: jest.fn(),
    };
    autoProvisionMock = {
      execute: jest.fn(),
    };

    useCase = new ProcessSriXmlUseCase(xmlParserMock, fetchAndSanitizeMock, autoProvisionMock);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return error if sanitize and validate fails', async () => {
    fetchAndSanitizeMock.sanitizeAndValidateXml.mockResolvedValue({
      success: false,
      errorMessage: 'Invalid XSD',
    });

    const result = await useCase.execute('<xml/>', 'test.xml');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Invalid XSD');
  });

  it('should return error if xmlParser validate fails', async () => {
    fetchAndSanitizeMock.sanitizeAndValidateXml.mockResolvedValue({
      success: true,
      xmlLimpio: '<clean/>',
    });
    xmlParserMock.validate.mockResolvedValue(false);

    const result = await useCase.execute('<xml/>', 'test.xml');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('estructura XML válida');
  });

  it('should parse xml successfully and provision entities', async () => {
    const mockParsedDoc = { accessKey: '123', issuerName: 'Test', totalAmount: 10 };

    fetchAndSanitizeMock.sanitizeAndValidateXml.mockResolvedValue({
      success: true,
      xmlLimpio: '<clean/>',
    });
    xmlParserMock.validate.mockResolvedValue(true);
    xmlParserMock.parse.mockResolvedValue(mockParsedDoc);
    autoProvisionMock.execute.mockResolvedValue({ supplierCreated: true, supplierRuc: '123' });

    const result = await useCase.execute('<xml/>', 'test.xml');

    expect(result.success).toBe(true);
    expect(result.parsedDocument).toEqual(mockParsedDoc);
    expect(autoProvisionMock.execute).toHaveBeenCalledWith(mockParsedDoc, '<clean/>', null, 'IMAP_SYNC');
  });

  it('should not fail process if auto provision throws error', async () => {
    const mockParsedDoc = { accessKey: '123', issuerName: 'Test', totalAmount: 10 };

    fetchAndSanitizeMock.sanitizeAndValidateXml.mockResolvedValue({
      success: true,
      xmlLimpio: '<clean/>',
    });
    xmlParserMock.validate.mockResolvedValue(true);
    xmlParserMock.parse.mockResolvedValue(mockParsedDoc);
    autoProvisionMock.execute.mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('<xml/>', 'test.xml');

    expect(result.success).toBe(true);
    expect(result.parsedDocument).toEqual(mockParsedDoc);
  });
});
