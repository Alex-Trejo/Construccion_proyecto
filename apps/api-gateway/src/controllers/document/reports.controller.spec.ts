import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { ReportsController } from './reports.controller';
import { MICROSERVICE_TOKENS, DOCUMENT_PATTERNS } from '@sgc/shared';
import { of } from 'rxjs';

describe('ReportsController', () => {
  let controller: ReportsController;
  let msCoreMock: jest.Mocked<ClientProxy>;

  const mockUser = {
    userId: 'user-123',
    username: 'test',
    email: 'test@test.com',
    roles: ['Administrador'],
  } as any;

  beforeEach(async () => {
    msCoreMock = {
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: MICROSERVICE_TOKENS.MS_CORE_CLIENT,
          useValue: msCoreMock,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  describe('metrics', () => {
    it('debe enviar peticion de metricas al ms-core', async () => {
      msCoreMock.send.mockReturnValue(of({ totalGastado: 100 }));

      const result = await controller.metrics(mockUser, '2023-01-01', '2023-12-31', '01');

      expect(msCoreMock.send).toHaveBeenCalledWith(
        DOCUMENT_PATTERNS.METRICS,
        expect.objectContaining({
          data: { desde: '2023-01-01', hasta: '2023-12-31', documentType: '01' },
          metadata: expect.objectContaining({ userId: 'user-123' }),
        })
      );
      expect(result).toEqual({ totalGastado: 100 });
    });
  });
});
