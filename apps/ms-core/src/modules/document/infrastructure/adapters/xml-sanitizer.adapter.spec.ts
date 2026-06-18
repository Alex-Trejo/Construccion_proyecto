import { XmlSanitizerAdapter } from './xml-sanitizer.adapter';

describe('XmlSanitizerAdapter', () => {
  let adapter: XmlSanitizerAdapter;

  beforeEach(() => {
    adapter = new XmlSanitizerAdapter();
  });

  describe('sanitizeKeepSignature', () => {
    it('should remove BOM and unwrap CDATA without removing signature', () => {
      const rawXml = '\ufeff<![CDATA[<factura><ds:Signature>test</ds:Signature></factura>]]>';
      
      const result = adapter.sanitizeKeepSignature(rawXml);

      expect(result).toContain('<factura><ds:Signature>test</ds:Signature></factura>');
      expect(result).not.toContain('<![CDATA[');
      expect(result).not.toContain('\ufeff');
    });

    it('should add xml declaration if missing', () => {
      const rawXml = '<factura></factura>';
      
      const result = adapter.sanitizeKeepSignature(rawXml);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<factura></factura>');
    });
  });

  describe('sanitize', () => {
    it('should remove BOM, unwrap CDATA AND remove signature', () => {
      const rawXml = '\ufeff<![CDATA[<factura><ds:Signature>test</ds:Signature></factura>]]>';
      
      const result = adapter.sanitize(rawXml);

      expect(result).toContain('<factura></factura>');
      expect(result).not.toContain('<ds:Signature>');
      expect(result).not.toContain('<![CDATA[');
      expect(result).not.toContain('\ufeff');
    });

    it('should decode html entities', () => {
      const rawXml = '<factura>&amp;lt;test&amp;gt;</factura>';
      
      const result = adapter.sanitize(rawXml);

      expect(result).toContain('<factura><test></factura>');
    });
  });
});
