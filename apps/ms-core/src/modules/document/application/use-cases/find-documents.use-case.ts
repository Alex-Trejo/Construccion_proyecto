/**
 * @fileoverview Casos de uso — Listar/Detalle/Preview de comprobantes.
 * @module FindDocumentsUseCases
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type IDocumentDto, type IPaginatedDocuments } from '@sgc/shared';

import {
  type DocumentRepositoryPort,
  DOCUMENT_REPOSITORY_PORT,
} from '../../domain/ports/document-repository.port';
import {
  type ObjectStoragePort,
  OBJECT_STORAGE_PORT,
} from '../../../communication/domain/ports/object-storage.port';

@Injectable()
export class FindDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
  ) {}

  async execute(
    ownerId: string | null,
    page: number,
    limit: number,
  ): Promise<IPaginatedDocuments> {
    const [data, total] = await this.documentRepo.findPaginated(
      ownerId,
      page,
      limit,
    );
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }
}

@Injectable()
export class FindDocumentByIdUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
  ) {}

  async execute(id: string, ownerId: string | null): Promise<IDocumentDto> {
    const doc = await this.documentRepo.findById(id, ownerId);
    if (!doc) {
      throw new NotFoundException(`Comprobante ${id} no encontrado.`);
    }
    return doc;
  }
}

@Injectable()
export class GetDocumentPreviewUseCase {
  private readonly expiry: number;

  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly storage: ObjectStoragePort,
    _config: ConfigService,
  ) {
    this.expiry = 300; // 5 min
  }

  async execute(
    id: string,
    ownerId: string | null,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const ref = await this.documentRepo.getStorageRef(id, ownerId);
    if (!ref) {
      throw new NotFoundException(
        `Comprobante ${id} no encontrado o sin archivo asociado.`,
      );
    }
    const url = await this.storage.getPresignedUrl(ref.bucket, ref.key, this.expiry);
    return { url, expiresInSeconds: this.expiry };
  }
}
