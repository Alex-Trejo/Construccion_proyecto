import { PersonaNaturalSupplier } from './persona-natural-supplier.entity';
import { SupplierType } from '@sgc/shared';
import { Ruc } from '../value-objects/ruc.vo';
import { SupplierCode } from '../value-objects/supplier-code.vo';

describe('PersonaNaturalSupplier', () => {
  it('should create valid persona natural supplier', () => {
    const props = {
      id: 'sup-1',
      supplierCode: SupplierCode.create('P-001'),
      supplierType: SupplierType.PERSONA_NATURAL,
      ruc: Ruc.create('1791251237001'),
      email: 'test@test.com',
      phone: '123456789',
      address: 'Dir',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      firstName: 'Juan',
      lastName: 'Perez',
      cedula: '1791251237',
    };

    const supplier = new PersonaNaturalSupplier(props);

    expect(supplier.id).toBe('sup-1');
    expect(supplier.getDisplayName()).toBe('Juan Perez');
    expect(supplier.firstName).toBe('Juan');
    expect(supplier.lastName).toBe('Perez');
    expect(supplier.cedula).toBe('1791251237');
  });
});
