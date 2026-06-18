import { Logger } from '@nestjs/common';
import { SriSoapApiAdapter } from './sri-soap-api.adapter';
import axios from 'axios';

jest.mock('axios');

describe('SriSoapApiAdapter', () => {
  let adapter: SriSoapApiAdapter;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      post: jest.fn(),
    };
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    adapter = new SriSoapApiAdapter();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validSoapResponse = `
    <soapenv:Envelope>
      <soapenv:Body>
        <RespuestaAutorizacionComprobante>
          <autorizaciones>
            <autorizacion>
              <estado>AUTORIZADO</estado>
              <numeroAutorizacion>123</numeroAutorizacion>
              <fechaAutorizacion>2026-01-01</fechaAutorizacion>
              <comprobante><![CDATA[<factura></factura>]]></comprobante>
              <mensajes>
                <mensaje>
                  <identificador>1</identificador>
                  <mensaje>Test</mensaje>
                </mensaje>
              </mensajes>
            </autorizacion>
          </autorizaciones>
        </RespuestaAutorizacionComprobante>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  it('should fetch and parse authorization successfully', async () => {
    mockAxiosInstance.post.mockResolvedValue({ data: validSoapResponse });

    const result = await adapter.fetchAuthorization('123');

    expect(result.estado).toBe('AUTORIZADO');
    expect(result.numeroAutorizacion).toBe('123');
    expect(result.fechaAutorizacion).toBe('2026-01-01');
    expect(result.comprobante).toBe('<factura></factura>');
    expect(result.mensajes.length).toBe(1);
    expect(result.mensajes[0].identificador).toBe('1');
    expect(result.mensajes[0].mensaje).toBe('Test');
  });

  it('should throw error if <autorizacion> tag is missing', async () => {
    mockAxiosInstance.post.mockResolvedValue({ data: '<soapenv:Envelope></soapenv:Envelope>' });

    await expect(adapter.fetchAuthorization('123')).rejects.toThrow('No se encontró el tag <autorizacion>');
  });

  it('should throw error if <estado> tag is missing', async () => {
    mockAxiosInstance.post.mockResolvedValue({ data: '<autorizacion></autorizacion>' });

    await expect(adapter.fetchAuthorization('123')).rejects.toThrow('Respuesta sin estado');
  });
});
