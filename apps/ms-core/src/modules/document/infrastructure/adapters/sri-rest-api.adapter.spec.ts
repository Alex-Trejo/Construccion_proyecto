import { Logger } from '@nestjs/common';
import { SriRestApiAdapter } from './sri-rest-api.adapter';
import { ContributorType, TaxRegime } from '@sgc/shared';
import axios from 'axios';

jest.mock('axios');

describe('SriRestApiAdapter', () => {
  let adapter: SriRestApiAdapter;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
    };
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    adapter = new SriRestApiAdapter();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch contributor and map data correctly', async () => {
    const rawData = {
      nombreCompleto: 'TEST NOMBRE',
      tipoContribuyente: 'PERSONA NATURAL',
      regimen: 'RIMPE EMPRENDEDOR',
      obligadoLlevarContabilidad: 'SI',
      agenteRetencion: 'NO',
      contribuyenteEspecial: 'NO',
    };

    mockAxiosInstance.get.mockResolvedValue({ data: [rawData] });

    const result = await adapter.fetchContributorByRuc('123');

    expect(result).toEqual({
      ruc: '123',
      razonSocial: 'TEST NOMBRE',
      nombreComercial: '',
      estadoContribuyente: '',
      tipoContribuyente: ContributorType.PERSONA_NATURAL,
      claseContribuyente: '',
      regimen: TaxRegime.RIMPE_EMPRENDEDOR,
      obligadoLlevarContabilidad: true,
      agenteRetencion: false,
      contribuyenteEspecial: false,
      resolucionContribuyenteEspecial: null,
      actividadEconomicaPrincipal: '',
      direccionMatriz: '',
    });
  });

  it('should return null if not found', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: [] });

    const result = await adapter.fetchContributorByRuc('123');

    expect(result).toBeNull();
  });

  it('should catch error and throw', async () => {
    mockAxiosInstance.get.mockRejectedValue({
      message: 'Failed',
      response: { status: 403 },
    });

    await expect(adapter.fetchContributorByRuc('123')).rejects.toThrow('Error al consultar catastro');
  });
});
