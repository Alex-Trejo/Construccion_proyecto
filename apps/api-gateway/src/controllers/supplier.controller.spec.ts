import { Test, TestingModule } from '@nestjs/testing';
import { SupplierController } from './supplier.controller';
import { MICROSERVICE_TOKENS, SupplierType } from '@sgc/shared';
import { of } from 'rxjs';

describe('SupplierController', () => {
  let controller: SupplierController;
  let clientProxyMock: any;

  beforeEach(async () => {
    clientProxyMock = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierController],
      providers: [
        {
          provide: MICROSERVICE_TOKENS.MS_CORE_CLIENT,
          useValue: clientProxyMock,
        },
      ],
    }).compile();

    controller = module.get<SupplierController>(SupplierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should forward create request to ms-core', async () => {
      const dto = {
        supplierType: SupplierType.PERSONA_NATURAL,
        taxId: '123',
        email: 'test@test.com',
        phone: '123',
        address: '123',
        firstName: 'John',
        lastName: 'Doe',
        cedula: '123',
      };

      const expectedResponse = { id: '1', ...dto };
      clientProxyMock.send.mockReturnValue(of(expectedResponse));

      const mockUser = { userId: 'user-123' } as any;
      const result = await controller.create(dto as any, mockUser);

      expect(result).toEqual(expectedResponse);
      expect(clientProxyMock.send).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should forward findAll request to ms-core', async () => {
      const expectedResponse = [{ id: '1' }, { id: '2' }];
      clientProxyMock.send.mockReturnValue(of(expectedResponse));

      const mockUser = { userId: 'user-123' } as any;
      const result = await controller.findAll(mockUser);

      expect(result).toEqual(expectedResponse);
      expect(clientProxyMock.send).toHaveBeenCalled();
    });
  });
});
