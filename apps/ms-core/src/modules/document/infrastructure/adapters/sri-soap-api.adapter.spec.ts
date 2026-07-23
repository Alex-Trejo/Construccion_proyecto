import { Test, type TestingModule } from '@nestjs/testing';
import { SriSoapApiAdapter } from './sri-soap-api.adapter';
import axios from 'axios';

jest.mock('axios');

describe('SriSoapApiAdapter', () => {
  let adapter: SriSoapApiAdapter;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    mockAxiosInstance = {
      post: jest.fn(),
    };
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [SriSoapApiAdapter],
    }).compile();

    adapter = module.get<SriSoapApiAdapter>(SriSoapApiAdapter);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('fetchAuthorization', () => {
    const claveAcceso = '1234567890123456789012345678901234567890123456789';

    it('should fetch and parse authorization response', async () => {
      const mockRawXml = `
        <autorizacion>
          <estado>AUTORIZADO</estado>
          <numeroAutorizacion>123456</numeroAutorizacion>
          <fechaAutorizacion>2023-01-01T10:00:00</fechaAutorizacion>
          <comprobante><![CDATA[<factura>xml</factura>]]></comprobante>
          <mensajes>
            <mensaje>
              <identificador>1</identificador>
              <mensaje>Ok</mensaje>
              <informacionAdicional></informacionAdicional>
              <tipo>INFO</tipo>
            </mensaje>
          </mensajes>
        </autorizacion>
      `;

      mockAxiosInstance.post.mockResolvedValue({ data: mockRawXml });

      const result = await adapter.fetchAuthorization(claveAcceso);

      expect(result.estado).toBe('AUTORIZADO');
      expect(result.numeroAutorizacion).toBe('123456');
      expect(result.comprobante).toBe('<factura>xml</factura>');
      expect(result.mensajes).toHaveLength(1);
      expect(result.mensajes[0].mensaje).toBe('Ok');
    });

    it('should throw error if missing autorizacion tag', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: `<Response></Response>` });
      await expect(adapter.fetchAuthorization(claveAcceso)).rejects.toThrow(/El SRI no devolvió autorización/);
    });

    it('should retry on transient network errors and succeed', async () => {
      mockAxiosInstance.post
        .mockRejectedValueOnce({ code: 'ENOTFOUND' })
        .mockResolvedValueOnce({
          data: `<autorizacion><estado>AUTORIZADO</estado></autorizacion>`,
        });

      jest.useFakeTimers();
      
      const promise = adapter.fetchAuthorization(claveAcceso);
      jest.runAllTimers();
      const result = await promise;
      
      expect(result.estado).toBe('AUTORIZADO');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });

    it('should fail after max retries for transient errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({ code: 'ECONNRESET' });

      jest.useFakeTimers();
      
      const promise = adapter.fetchAuthorization(claveAcceso);
      for (let i = 0; i < 4; i++) {
        await Promise.resolve(); // flush microtasks
        jest.runAllTimers();
      }
      
      await expect(promise).rejects.toMatchObject({ code: 'ECONNRESET' });
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4);
      
      jest.useRealTimers();
    });

    it('should throw immediately for non-transient errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Business Error 400'));
      await expect(adapter.fetchAuthorization(claveAcceso)).rejects.toThrow('Business Error 400');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1); // No retry
    });

    it('should handle missing estado in response', async () => {
      const mockRawXml = `<autorizacion><otro>AUTORIZADO</otro></autorizacion>`;
      mockAxiosInstance.post.mockResolvedValue({ data: mockRawXml });
      await expect(adapter.fetchAuthorization(claveAcceso)).rejects.toThrow(/Respuesta sin estado/);
    });
  });
});
