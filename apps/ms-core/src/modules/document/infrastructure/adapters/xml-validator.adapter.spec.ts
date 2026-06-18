import { XmlValidatorAdapter } from './xml-validator.adapter';
import { Logger } from '@nestjs/common';

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('<xsd/>'),
}));

describe('XmlValidatorAdapter', () => {
  let adapter: XmlValidatorAdapter;

  beforeEach(() => {
    adapter = new XmlValidatorAdapter();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  describe('validateAgainstXsd fallback', () => {
    it('should use fallback structural validation if libxmljs2 is not available and valid', async () => {
      // Force fallback by mocking loadLibxmljs
      jest.spyOn(adapter as any, 'loadLibxmljs').mockResolvedValue(null);

      // It's not available in the test env naturally (unless installed, so we enforce it)
      const validXml = '<?xml version="1.0"?><factura><infoTributaria></infoTributaria><ruc></ruc><claveAcceso></claveAcceso></factura>';
      
      const result = await adapter.validateAgainstXsd(validXml, 'path.xsd');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail structural validation if tags are missing', async () => {
      jest.spyOn(adapter as any, 'loadLibxmljs').mockResolvedValue(null);
      const invalidXml = '<?xml version="1.0"?><factura><infoTributaria/><ruc/></factura>';
      
      const result = await adapter.validateAgainstXsd(invalidXml, 'path.xsd');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tag obligatorio faltante: <claveAcceso>');
    });

    it('should fail structural validation if not sri document', async () => {
      jest.spyOn(adapter as any, 'loadLibxmljs').mockResolvedValue(null);
      const invalidXml = '<other></other>';
      
      const result = await adapter.validateAgainstXsd(invalidXml, 'path.xsd');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido no parece ser un XML de comprobante del SRI.');
    });
  });
});
