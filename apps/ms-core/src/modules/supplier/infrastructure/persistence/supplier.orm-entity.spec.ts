import { SupplierOrmEntity } from './supplier.orm-entity';

describe('SupplierOrmEntity', () => {
  it('should be defined', () => {
    const supplier = new SupplierOrmEntity();
    supplier.id = 'sup-1';
    supplier.supplierCode = 'S-001';
    supplier.supplierType = 'PERSONA_NATURAL';
    supplier.ruc = '1791251237001';
    supplier.razonSocial = 'Perez Juan';
    supplier.nombreComercial = null;
    supplier.firstName = 'Juan';
    supplier.lastName = 'Perez';
    supplier.cedula = '1791251237';
    supplier.legalRepresentative = null;
    supplier.email = 'juan@test.com';
    supplier.phone = '123';
    supplier.address = 'Dir';
    supplier.obligadoContabilidad = false;
    supplier.regimen = 'GENERAL';
    supplier.isActive = true;

    expect(supplier).toBeDefined();
    expect(supplier.id).toBe('sup-1');
    expect(supplier.ruc).toBe('1791251237001');
  });
});
