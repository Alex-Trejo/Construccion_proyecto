import { Company } from './company.entity';
import { Ruc } from '../../../supplier/domain/value-objects/ruc.vo';
import { TaxRegime } from '@sgc/shared';

describe('Company Entity', () => {
  it('should create a valid Company entity', () => {
    const props = {
      id: 'company-1',
      ruc: Ruc.create('1002142659001'),
      razonSocial: 'CIA LTDA',
      nombreComercial: 'CIA',
      direccion: 'Dir',
      obligadoLlevarContabilidad: true,
      regimen: TaxRegime.GENERAL,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const company = new Company(props);

    expect(company.id).toBe('company-1');
    expect(company.ruc.value).toBe('1002142659001');
    expect(company.razonSocial).toBe('CIA LTDA');
  });
});
