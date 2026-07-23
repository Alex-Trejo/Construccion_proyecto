import { Repository, SelectQueryBuilder } from 'typeorm';
import { DashboardMetricsUseCase, ExportDocumentsUseCase } from './reports.use-cases';
import { DocumentOrmEntity } from '../../../infrastructure/persistence/document.orm-entity';
import { type DocumentRepositoryPort } from '../../../domain/ports/document-repository.port';
import { DocumentStatus } from '@sgc/shared';

describe('Reports Use Cases', () => {
  describe('DashboardMetricsUseCase', () => {
    let useCase: DashboardMetricsUseCase;
    let repoMock: jest.Mocked<Repository<DocumentOrmEntity>>;
    let queryBuilderMock: jest.Mocked<SelectQueryBuilder<DocumentOrmEntity>>;

    beforeEach(() => {
      queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getRawMany: jest.fn(),
      } as unknown as jest.Mocked<SelectQueryBuilder<DocumentOrmEntity>>;

      repoMock = {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      } as unknown as jest.Mocked<Repository<DocumentOrmEntity>>;

      useCase = new DashboardMetricsUseCase(repoMock);
    });

    it('debe retornar metricas agrupadas sin filtros', async () => {
      queryBuilderMock.getRawOne.mockResolvedValue({ cantidad: '10', total: '150.5' });
      queryBuilderMock.getRawMany
        .mockResolvedValueOnce([{ estado: DocumentStatus.VALIDADO, cantidad: '10', total: '150.5' }]) // porEstado
        .mockResolvedValueOnce([{ mes: '2023-01', cantidad: '10', total: '150.5' }]); // porMes

      const result = await useCase.execute('owner-123');

      expect(repoMock.createQueryBuilder).toHaveBeenCalledTimes(3); // 3 queries separadas
      expect(queryBuilderMock.where).toHaveBeenCalledWith('1=1');
      expect(result.totalGastado).toBe(150.5);
      expect(result.totalComprobantes).toBe(10);
      expect(result.porEstado).toHaveLength(1);
      expect(result.porMes).toHaveLength(1);
    });
  });

  describe('ExportDocumentsUseCase', () => {
    let useCase: ExportDocumentsUseCase;
    let repoMock: jest.Mocked<DocumentRepositoryPort>;

    beforeEach(() => {
      repoMock = {
        findForExport: jest.fn(),
      } as unknown as jest.Mocked<DocumentRepositoryPort>;
      useCase = new ExportDocumentsUseCase(repoMock);
    });

    it('debe delegar la llamada a findForExport', async () => {
      repoMock.findForExport.mockResolvedValue([]);
      
      await useCase.execute('owner-123', { desde: '2023-01-01' });

      expect(repoMock.findForExport).toHaveBeenCalledWith('owner-123', { desde: '2023-01-01' });
    });
  });
});
