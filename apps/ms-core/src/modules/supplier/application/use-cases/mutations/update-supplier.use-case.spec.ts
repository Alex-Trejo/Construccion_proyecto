import { NotFoundException } from '@nestjs/common';
import { SupplierType, type IUpdateSupplierDto } from '@sgc/shared';
import { UpdateSupplierUseCase } from '../mutations/update-supplier.use-case';
import { type SupplierRepositoryPort } from '../../../domain/ports/supplier-repository.port';
import { PersonaNaturalSupplier } from '../../../domain/entities/persona-natural-supplier.entity';
import { PersonaJuridicaSupplier } from '../../../domain/entities/persona-juridica-supplier.entity';

describe('UpdateSupplierUseCase', () => {
  let useCase: UpdateSupplierUseCase;
  let supplierRepoMock: jest.Mocked<SupplierRepositoryPort>;

  const mockOwnerId = 'owner-123';
  const mockSupplierId = 'supp-123';

  beforeEach(() => {
    supplierRepoMock = {
      findById: jest.fn(),
      findByRuc: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SupplierRepositoryPort>;

    useCase = new UpdateSupplierUseCase(supplierRepoMock);
  });

  describe('execute', () => {
    it('debe actualizar y retornar una Persona Natural exitosamente', async () => {
      const existingNatural = new PersonaNaturalSupplier({
        id: mockSupplierId,
        ownerId: mockOwnerId,
        supplierCode: 'P-123',
        ruc: '1712345678001',
        supplierType: SupplierType.PERSONA_NATURAL,
        email: 'test@test.com',
        phone: '0999999999',
        address: 'Quito',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        firstName: 'Juan',
        lastName: 'Pérez',
        cedula: '1712345678',
      });

      const updateDto: IUpdateSupplierDto = {
        email: 'new@test.com',
        phone: '0988888888',
        firstName: 'Juan Carlos',
      };

      supplierRepoMock.findById.mockResolvedValue(existingNatural);
      supplierRepoMock.update.mockImplementation(async (supplier) => supplier);

      const result = await useCase.execute(mockSupplierId, mockOwnerId, updateDto);

      expect(supplierRepoMock.findById).toHaveBeenCalledWith(mockSupplierId, mockOwnerId);
      expect(supplierRepoMock.update).toHaveBeenCalled();

      // Verificamos que sea instancia de PersonaNaturalSupplier y los campos se actualizaron
      expect(result).toBeInstanceOf(PersonaNaturalSupplier);
      expect(result.email).toBe(updateDto.email);
      expect(result.phone).toBe(updateDto.phone);
      expect((result as PersonaNaturalSupplier).firstName).toBe(updateDto.firstName);
      // Los campos no actualizados deben mantenerse
      expect((result as PersonaNaturalSupplier).lastName).toBe(existingNatural.lastName);
    });

    it('debe actualizar y retornar una Persona Jurídica exitosamente', async () => {
      const existingJuridica = new PersonaJuridicaSupplier({
        id: mockSupplierId,
        ownerId: mockOwnerId,
        supplierCode: 'P-456',
        ruc: '0992345678001',
        supplierType: SupplierType.PERSONA_JURIDICA,
        email: 'empresa@test.com',
        phone: '022222222',
        address: 'Guayaquil',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        businessName: 'Empresa S.A.',
        tradeName: 'Empresa SA',
        legalRepresentative: 'Representante X',
      });

      const updateDto: IUpdateSupplierDto = {
        tradeName: 'Empresa S.A. Nueva',
        address: 'Nuevo Guayaquil',
      };

      supplierRepoMock.findById.mockResolvedValue(existingJuridica);
      supplierRepoMock.update.mockImplementation(async (supplier) => supplier);

      const result = await useCase.execute(mockSupplierId, mockOwnerId, updateDto);

      expect(supplierRepoMock.findById).toHaveBeenCalledWith(mockSupplierId, mockOwnerId);
      expect(supplierRepoMock.update).toHaveBeenCalled();

      expect(result).toBeInstanceOf(PersonaJuridicaSupplier);
      expect(result.address).toBe(updateDto.address);
      expect((result as PersonaJuridicaSupplier).tradeName).toBe(updateDto.tradeName);
      expect((result as PersonaJuridicaSupplier).businessName).toBe(existingJuridica.businessName);
    });

    it('debe lanzar NotFoundException si el proveedor no existe', async () => {
      supplierRepoMock.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(mockSupplierId, mockOwnerId, {}),
      ).rejects.toThrow(NotFoundException);
      
      expect(supplierRepoMock.findById).toHaveBeenCalledWith(mockSupplierId, mockOwnerId);
      expect(supplierRepoMock.update).not.toHaveBeenCalled();
    });
  });
});
