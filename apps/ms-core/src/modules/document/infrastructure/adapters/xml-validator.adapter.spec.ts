import { Test, type TestingModule } from '@nestjs/testing';
import { XmlValidatorAdapter } from './xml-validator.adapter';
import * as fs from 'fs/promises';

describe('XmlValidatorAdapter', () => {
  let adapter: XmlValidatorAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XmlValidatorAdapter],
    }).compile();

    adapter = module.get<XmlValidatorAdapter>(XmlValidatorAdapter);
    
    // Reseteamos el estado interno (cache y warnedFallback) antes de cada prueba
    (adapter as any).libxmljsCache = undefined;
    (adapter as any).warnedFallback = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('validateAgainstXsd (Fallback Básico)', () => {
    beforeEach(() => {
      // Forzamos que la carga de libxmljs2 falle
      jest.spyOn(adapter as any, 'loadLibxmljs').mockResolvedValue(null);
    });

    it('should pass structural validation for valid xml', async () => {
      const xml = `<?xml version="1.0"?>
        <factura>
          <infoTributaria>
            <ruc>1234567890001</ruc>
            <claveAcceso>111</claveAcceso>
          </infoTributaria>
        </factura>`;
      
      const result = await adapter.validateAgainstXsd(xml, 'fake.xsd');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail structural validation if tags are missing', async () => {
      const xml = `<factura><infoTributaria></infoTributaria></factura>`; // missing ruc, claveAcceso
      
      const result = await adapter.validateAgainstXsd(xml, 'fake.xsd');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tag obligatorio faltante: <ruc>');
      expect(result.errors).toContain('Tag obligatorio faltante: <claveAcceso>');
    });

    it('should warn only once for fallback', async () => {
      const xml = `<?xml><factura><infoTributaria><ruc><claveAcceso>`;
      
      const loggerWarnSpy = jest.spyOn((adapter as any).logger, 'warn');
      
      await adapter.validateAgainstXsd(xml, 'fake.xsd'); // first call
      await adapter.validateAgainstXsd(xml, 'fake.xsd'); // second call
      
      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateAgainstXsd (libxmljs2)', () => {
    const mockLibxmljs = {
      parseXml: jest.fn(),
    };

    beforeEach(() => {
      jest.spyOn(adapter as any, 'loadLibxmljs').mockResolvedValue(mockLibxmljs);
      jest.spyOn(fs, 'readFile').mockResolvedValue('xsd content');
    });

    it('should pass validation using libxmljs2', async () => {
      const mockXmlDoc = {
        validate: jest.fn().mockReturnValue(true),
        validationErrors: [],
      };
      const mockXsdDoc = {};

      mockLibxmljs.parseXml
        .mockReturnValueOnce(mockXsdDoc) // for xsd
        .mockReturnValueOnce(mockXmlDoc); // for xml

      const result = await adapter.validateAgainstXsd('xml content', 'fake.xsd');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockLibxmljs.parseXml).toHaveBeenCalledTimes(2);
    });

    it('should fail validation using libxmljs2', async () => {
      const mockXmlDoc = {
        validate: jest.fn().mockReturnValue(false),
        validationErrors: [
          { line: 10, message: 'Invalid tag' }
        ],
      };
      const mockXsdDoc = {};

      mockLibxmljs.parseXml
        .mockReturnValueOnce(mockXsdDoc)
        .mockReturnValueOnce(mockXmlDoc);

      const result = await adapter.validateAgainstXsd('xml content', 'fake.xsd');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Línea 10: Invalid tag');
    });
  });

  describe('Error handling', () => {
    it('should catch unhandled errors and return false', async () => {
      jest.spyOn(adapter as any, 'loadLibxmljs').mockRejectedValue(new Error('Unexpected error'));
      
      const result = await adapter.validateAgainstXsd('xml', 'fake.xsd');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unexpected error');
    });
  });

  describe('Dynamic loading of libxmljs', () => {
    it('should return null when import fails', async () => {
      const mod = await (adapter as any).loadLibxmljs();
      expect(mod).toBeNull();
    });
  });
});
