import { Logger } from '@nestjs/common';
import { SupplierTcpController } from './supplier-tcp.controller';
import { SupplierType } from '@sgc/shared';

describe('SupplierTcpController', () => {
  let controller: SupplierTcpController;
  let createSupplierUseCaseMock: any;
  let findAllSuppliersUseCaseMock: any;

  beforeEach(() => {
    createSupplierUseCaseMock = { execute: jest.fn() };
    findAllSuppliersUseCaseMock = { execute: jest.fn() };

    controller = new SupplierTcpController(
      createSupplierUseCaseMock,
      findAllSuppliersUseCaseMock,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  it('should create a supplier', async () => {
    const mockSupplier = {
      id: '1',
      supplierCode: { value: 'S-001' },
      ruc: { value: '1791251237001' },
      email: 'a@a.com',
      phone: '123',
      address: 'dir',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      constructor: { name: 'PersonaNaturalSupplier' }, // Mocking instance check
      firstName: 'Juan',
      lastName: 'Perez',
      cedula: '1791251237',
    };

    // Replace the real instanceof check logic
    (controller as any).toISupplier = jest.fn().mockReturnValue(mockSupplier);
    createSupplierUseCaseMock.execute.mockResolvedValue(mockSupplier);

    const payload = { data: { taxId: '123' } as any, metadata: { correlationId: '1' } as any };
    const result = await controller.create(payload);

    expect(result).toBe(mockSupplier);
    expect(createSupplierUseCaseMock.execute).toHaveBeenCalled();
  });

  it('should find all suppliers', async () => {
    const mockSupplier = {
      id: '1',
      supplierCode: { value: 'S-001' },
      ruc: { value: '1791251237001' },
      email: 'a@a.com',
      phone: '123',
      address: 'dir',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (controller as any).toISupplier = jest.fn().mockReturnValue(mockSupplier);
    findAllSuppliersUseCaseMock.execute.mockResolvedValue([mockSupplier]);

    const payload = { data: {}, metadata: { userId: 'user-1' } as any };
    const result = await controller.findAll(payload);

    expect(result.length).toBe(1);
    expect(findAllSuppliersUseCaseMock.execute).toHaveBeenCalled();
  });
});
