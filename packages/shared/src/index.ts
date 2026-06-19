/**
 * @fileoverview Barrel export del paquete @sgc/shared.
 *
 * Uso desde cualquier app del monorepo:
 * ```ts
 * import {
 *   SupplierType,
 *   DocumentStatus,
 *   SUPPLIER_PATTERNS,
 *   type ISupplier,
 *   type TcpResponse,
 * } from '@sgc/shared';
 * ```
 *
 * @module @sgc/shared
 */

// ── Enums ────────────────────────────────────────────────────────────────────
export { DocumentStatus } from './enums/document-status.enum';
export { DocumentType } from './enums/document-type.enum';
export { SupplierType } from './enums/supplier-type.enum';
export {
  InvoiceOrigin,
  InvoiceProcessingStatus,
  ContributorType,
  TaxRegime,
} from './enums/invoice.enum';

// ── Interfaces ───────────────────────────────────────────────────────────────
export type {
  IBaseSupplier,
  IPersonaNaturalSupplier,
  IPersonaJuridicaSupplier,
  ISupplier,
} from './interfaces/supplier.interface';

export type { IDocument } from './interfaces/document.interface';
export { DocumentSource } from './interfaces/document.interface';

// ── DTOs ─────────────────────────────────────────────────────────────────────
export type {
  ICreateSupplierBaseDto,
  ICreatePersonaNaturalDto,
  ICreatePersonaJuridicaDto,
  ICreateSupplierDto,
} from './dtos/create-supplier.dto';

export type { IUploadDocumentDto } from './dtos/upload-document.dto';
export type { IUpdateSupplierDto } from './dtos/update-supplier.dto';

export type {
  ICreateDocumentItemDto,
  ICreateDocumentTaxDto,
  ICreateDocumentDto,
  IDocumentItemDto,
  IDocumentTaxDto,
  IDocumentDto,
  IOcrResultDto,
  IPaginatedDocuments,
} from './dtos/document.dto';

export type {
  ICreateImapConfigDto,
  IImapConfigDto,
  IImapActiveConfig,
} from './dtos/imap-config.dto';

export type {
  IMetricByEstado,
  IMetricByMes,
  IDashboardMetrics,
} from './dtos/report.dto';

export type {
  IUserDto,
  ICreateUserDto,
  IAssignRolesDto,
  IRoleDto,
  ICreateRoleDto,
} from './dtos/user.dto';

// ── Constants ────────────────────────────────────────────────────────────────
export {
  SUPPLIER_PATTERNS,
  DOCUMENT_PATTERNS,
  SYNC_PATTERNS,
  COMMUNICATION_PATTERNS,
  IDENTITY_PATTERNS,
  IMAP_PATTERNS,
  MICROSERVICE_TOKENS,
} from './constants/message-patterns.constants';

// ── Types (TCP Communication) ────────────────────────────────────────────────
export type {
  TcpPayload,
  TcpResponse,
  TcpRequestMetadata,
  TcpErrorDetail,
  PaginatedResponse,
  PaginationMeta,
} from './types/tcp-messages.types';
