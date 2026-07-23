import { Test, type TestingModule } from '@nestjs/testing';
import { SupplierTcpController } from './supplier-tcp.controller';
import { CreateSupplierUseCase } from '../application/use-cases/mutations/create-supplier.use-case';
import { FindAllSuppliersUseCase } from '../application/use-cases/queries/find-all-suppliers.use-case';
import { FindSupplierByIdUseCase } from '../application/use-cases/queries/find-supplier-by-id.use-case';
import { UpdateSupplierUseCase } from '../application/use-cases/mutations/update-supplier.use-case';
import { DeleteSupplierUseCase } from '../application/use-cases/mutations/delete-supplier.use-case';
import { DomainValidationError } from '../domain/errors/domain-validation.error';
import { PersonaNaturalSupplier } from '../domain/entities/persona-natural-supplier.entity';
import { PersonaJuridicaSupplier } from '../domain/entities/persona-juridica-supplier.entity';
import { Ruc } from '../domain/value-objects/ruc.vo';
import { SupplierCode } from '../domain/value-objects/supplier-code.vo';
import { SupplierType } from '@sgc/shared';
import { NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

describe('SupplierTcpController', () => {
  let controller: SupplierTcpController;

  const mockPayload = (data: any = {}) => ({
    data,
    metadata: { userId: 'user-id', role: 'admin' },
  });

  const mockUseCases = {
    createSupplierUseCase: { execute: jest.fn() },
    findAllSuppliersUseCase: { execute: jest.fn() },
    findByIdUseCase: { execute: jest.fn() },
    updateSupplierUseCase: { execute: jest.fn() },
    deleteSupplierUseCase: { execute: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierTcpController],
      providers: [
        { provide: CreateSupplierUseCase, useValue: mockUseCases.createSupplierUseCase },
        { provide: FindAllSuppliersUseCase, useValue: mockUseCases.findAllSuppliersUseCase },
        { provide: FindSupplierByIdUseCase, useValue: mockUseCases.findByIdUseCase },
        { provide: UpdateSupplierUseCase, useValue: mockUseCases.updateSupplierUseCase },
        { provide: DeleteSupplierUseCase, useValue: mockUseCases.deleteSupplierUseCase },
      ],
    }).compile();

    controller = module.get<SupplierTcpController>(SupplierTcpController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const createNaturalSupplier = () => {
    const s = new PersonaNaturalSupplier('owner-1');
    Object.defineProperties(s, {
      id: { get: () => 'sup1' },
      supplierCode: { get: () => new SupplierCode('SUP-123') },
      ruc: { get: () => new Ruc('1790011674001') },
      email: { get: () => 'test@test.com' },
      firstName: { get: () => 'Juan' },
      lastName: { get: () => 'Perez' },
      cedula: { get: () => '1700000000' }
    });
    return s;
  };

  const createJuridicaSupplier = () => {
    const s = new PersonaJuridicaSupplier('owner-1');
    Object.defineProperties(s, {
      id: { get: () => 'sup2' },
      supplierCode: { get: () => new SupplierCode('SUP-124') },
      ruc: { get: () => new Ruc('1790011674001') },
      email: { get: () => 'corp@test.com' },
      businessName: { get: () => 'Corp SA' }
    });
    return s;
  };

  describe('create', () => {
    it('should create and map natural supplier', async () => {
      mockUseCases.createSupplierUseCase.execute.mockResolvedValue(createNaturalSupplier());
      const result = await controller.create(mockPayload({ supplierType: SupplierType.PERSONA_NATURAL }));
      expect(result.id).toBe('sup1');
      expect(result.supplierType).toBe(SupplierType.PERSONA_NATURAL);
    });

    it('should create and map juridica supplier', async () => {
      mockUseCases.createSupplierUseCase.execute.mockResolvedValue(createJuridicaSupplier());
      const result = await controller.create(mockPayload({ supplierType: SupplierType.PERSONA_JURIDICA }));
      expect(result.id).toBe('sup2');
      expect(result.supplierType).toBe(SupplierType.PERSONA_JURIDICA);
    });
  });

  describe('findAll', () => {
    it('should list and map suppliers', async () => {
      mockUseCases.findAllSuppliersUseCase.execute.mockResolvedValue([createNaturalSupplier(), createJuridicaSupplier()]);
      const result = await controller.findAll(mockPayload({}));
      expect(result).toHaveLength(2);
      expect(result[0].supplierType).toBe(SupplierType.PERSONA_NATURAL);
      expect(result[1].supplierType).toBe(SupplierType.PERSONA_JURIDICA);
    });
  });

  describe('findById', () => {
    it('should find by id', async () => {
      mockUseCases.findByIdUseCase.execute.mockResolvedValue(createNaturalSupplier());
      const result = await controller.findById(mockPayload({ id: 'sup1' }));
      expect(result.id).toBe('sup1');
    });
  });

  describe('update', () => {
    it('should update by id', async () => {
      mockUseCases.updateSupplierUseCase.execute.mockResolvedValue(createNaturalSupplier());
      const result = await controller.update(mockPayload({ id: 'sup1', changes: {} }));
      expect(result.id).toBe('sup1');
    });
  });

  describe('deactivate', () => {
    it('should delete by id', async () => {
      mockUseCases.deleteSupplierUseCase.execute.mockResolvedValue({ deleted: 'sup1' });
      const result = await controller.deactivate(mockPayload({ id: 'sup1' }));
      expect(result).toEqual({ deleted: 'sup1' });
    });
  });

  describe('guard and error handling', () => {
    it('should map DomainValidationError to 400 RpcException', async () => {
      mockUseCases.createSupplierUseCase.execute.mockRejectedValue(new DomainValidationError('Invalid RUC'));
      await expect(controller.create(mockPayload({}))).rejects.toMatchObject({
        error: { statusCode: 400, message: 'Invalid RUC' }
      });
    });

    it('should map HttpException to RpcException with same status', async () => {
      mockUseCases.findByIdUseCase.execute.mockRejectedValue(new NotFoundException('Not found'));
      await expect(controller.findById(mockPayload({ id: 'sup1' }))).rejects.toMatchObject({
        error: { statusCode: 404, message: 'Not found' }
      });
    });

    it('should map unknown Error to 500 RpcException', async () => {
      mockUseCases.findAllSuppliersUseCase.execute.mockRejectedValue(new Error('DB failure'));
      await expect(controller.findAll(mockPayload({}))).rejects.toMatchObject({
        error: { statusCode: 500, message: 'Error interno del servidor al procesar el proveedor.' }
      });
    });
  });
});
