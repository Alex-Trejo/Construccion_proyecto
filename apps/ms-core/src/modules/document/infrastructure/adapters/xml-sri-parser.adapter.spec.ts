import { Logger } from '@nestjs/common';
import { XmlSriParserAdapter } from './xml-sri-parser.adapter';
import { DocumentType } from '@sgc/shared';

describe('XmlSriParserAdapter', () => {
  let adapter: XmlSriParserAdapter;

  beforeEach(() => {
    adapter = new XmlSriParserAdapter();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  describe('validate', () => {
    it('should return true for valid sri xml', async () => {
      const xml = '<factura><infoTributaria><claveAcceso>123</claveAcceso></infoTributaria></factura>';
      const result = await adapter.validate(xml);
      expect(result).toBe(true);
    });

    it('should return false for invalid xml', async () => {
      const xml = '<factura><infoTributaria></infoTributaria></factura>';
      const result = await adapter.validate(xml);
      expect(result).toBe(false);
    });

    it('should catch parser error and return false', async () => {
      // Simulate parser error by invalid xml structure that causes crash (though fast-xml-parser usually doesn't crash on bad xml)
      const xml = 'invalid<<';
      const result = await adapter.validate(xml);
      expect(result).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse factura correctly', async () => {
      const xml = `
        <factura>
          <infoTributaria>
            <claveAcceso>123</claveAcceso>
            <codDoc>01</codDoc>
            <ruc>179</ruc>
            <razonSocial>Emisor</razonSocial>
            <dirMatriz>Dir</dirMatriz>
          </infoTributaria>
          <infoFactura>
            <fechaEmision>2026-01-01</fechaEmision>
            <totalSinImpuestos>10.00</totalSinImpuestos>
            <importeTotal>11.20</importeTotal>
            <identificacionComprador>000</identificacionComprador>
            <razonSocialComprador>Comprador</razonSocialComprador>
            <totalConImpuestos>
              <totalImpuesto><valor>1.20</valor></totalImpuesto>
            </totalConImpuestos>
          </infoFactura>
          <detalles>
            <detalle>
              <descripcion>Item 1</descripcion>
              <cantidad>1</cantidad>
              <precioUnitario>10</precioUnitario>
              <descuento>0</descuento>
              <precioTotalSinImpuesto>10</precioTotalSinImpuesto>
            </detalle>
          </detalles>
        </factura>
      `;

      const result = await adapter.parse(xml);

      expect(result.accessKey).toBe('123');
      expect(result.documentType).toBe(DocumentType.FACTURA);
      expect(result.issuerTaxId).toBe('179');
      expect(result.issuerName).toBe('Emisor');
      expect(result.totalAmount).toBe(11.2);
      expect(result.taxAmount).toBe(1.2);
      expect(result.buyerTaxId).toBe('000');
      expect(result.buyerName).toBe('Comprador');
      expect(result.items.length).toBe(1);
      expect(result.items[0].description).toBe('Item 1');
    });

    it('should throw error if no valid root found', async () => {
      const xml = '<test></test>';
      await expect(adapter.parse(xml)).rejects.toThrow('XML del SRI inválido');
    });
  });
});
