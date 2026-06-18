import { PersonaJuridicaSupplier } from './persona-juridica-supplier.entity';
import { SupplierType } from '@sgc/shared';
import { Ruc } from '../value-objects/ruc.vo';
import { SupplierCode } from '../value-objects/supplier-code.vo';

describe('PersonaJuridicaSupplier', () => {
  it('should create valid persona juridica supplier', () => {
    const props = {
      id: 'sup-1',
      supplierCode: SupplierCode.generate(SupplierType.PERSONA_JURIDICA, '1002142659001'),
      supplierType: SupplierType.PERSONA_JURIDICA,
      ruc: Ruc.create('1002142659001'),
      email: 'test@test.com',
      phone: '123456789',
      address: 'Dir',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      businessName: 'EMPRESA SA',
      tradeName: 'EMPRESA',
      legalRepresentative: 'Juan',
    };

    const supplier = new PersonaJuridicaSupplier(props);

    expect(supplier.id).toBe('sup-1');
    expect(supplier.getDisplayName()).toBe('EMPRESA SA');
    expect(supplier.businessName).toBe('EMPRESA SA');
    expect(supplier.tradeName).toBe('EMPRESA');
    expect(supplier.legalRepresentative).toBe('Juan');
  });
});
