/**
 * @fileoverview Controller HTTP — Comprobantes (Documents).
 *
 * Proxy del gateway hacia ms-core. Incluye OCR (multipart), carga masiva TXT,
 * guardado, listado, detalle y preview. Todas las rutas propagan el userId
 * del JWT (aislamiento).
 *
 * @module DocumentController
 */

import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Workbook } from 'exceljs';
import type { Response } from 'express';
import { firstValueFrom, timeout } from 'rxjs';
import {
  DOCUMENT_PATTERNS,
  MICROSERVICE_TOKENS,
  type IDashboardFilters,
  type ICreateDocumentDto,
  type IUpdateDocumentDto,
  type IDocumentDto,
  type IImportErrorDto,
  type IOcrResultDto,
  type IPaginatedDocuments,
  type TcpPayload,
} from '@sgc/shared';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { buildTcpMetadata } from '../auth/tcp-metadata';
import type { AuthenticatedUser } from '../auth/keycloak-jwt.strategy';

const TCP_TIMEOUT_MS = 10_000;
const OCR_TIMEOUT_MS = 45_000; // OpenAI Vision puede tardar

// Límites de subida (anti-DoS): rechaza archivos gigantes antes de procesarlos.
const IMAGE_UPLOAD_LIMITS = { limits: { fileSize: 8 * 1024 * 1024 } }; // 8 MB (foto)
const TXT_UPLOAD_LIMITS = { limits: { fileSize: 5 * 1024 * 1024 } }; // 5 MB (TXT SRI)

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCore: ClientProxy,
  ) {}

  /** POST /documents/physical — sube imagen, ejecuta OCR y devuelve datos. */
  @Post('physical')
  @Roles('Administrador', 'Asistente')
  @Throttle({ default: { ttl: 60_000, limit: 8 } }) // OCR (OpenAI $): máx 8/min
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_LIMITS))
  async physical(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IOcrResultDto> {
    if (!file) {
      throw new BadRequestException('Falta el archivo (campo "file").');
    }
    this.logger.debug(`POST /documents/physical (${file.originalname})`);

    const payload: TcpPayload<{
      contentBase64: string;
      filename: string;
      contentType: string;
    }> = {
      data: {
        contentBase64: file.buffer.toString('base64'),
        filename: file.originalname,
        contentType: file.mimetype,
      },
      metadata: buildTcpMetadata(user),
    };

    return firstValueFrom(
      this.msCore
        .send<IOcrResultDto>(DOCUMENT_PATTERNS.PROCESS_PHYSICAL, payload)
        .pipe(timeout(OCR_TIMEOUT_MS)),
    );
  }

  /** POST /documents/bulk-txt — carga masiva del TXT del SRI. */
  @Post('bulk-txt')
  @Roles('Administrador', 'Asistente')
  @Throttle({ default: { ttl: 60_000, limit: 4 } }) // carga SRI pesada: máx 4/min
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', TXT_UPLOAD_LIMITS))
  async bulkTxt(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo TXT (campo "file").');
    }
    const payload: TcpPayload<{ txtContent: string }> = {
      data: { txtContent: file.buffer.toString('utf-8') },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send(DOCUMENT_PATTERNS.UPLOAD_BATCH_TXT, payload)
        .pipe(timeout(20_000)),
    );
  }

  /** POST /documents — guarda un comprobante revisado (unicidad RUC + Nº). */
  @Post()
  @Roles('Administrador', 'Asistente')
  async create(
    @Body() dto: ICreateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IDocumentDto> {
    const payload: TcpPayload<ICreateDocumentDto> = {
      data: dto,
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IDocumentDto>(DOCUMENT_PATTERNS.CREATE, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** PUT /documents/:id — edita un comprobante y lo revalida. */
  @Put(':id')
  @Roles('Administrador', 'Asistente')
  async edit(
    @Param('id') id: string,
    @Body() dto: IUpdateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IDocumentDto> {
    const payload: TcpPayload<{ id: string; dto: IUpdateDocumentDto }> = {
      data: { id, dto },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IDocumentDto>(DOCUMENT_PATTERNS.EDIT, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** GET /documents?page&limit — listado paginado del usuario. */
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<IPaginatedDocuments> {
    const payload: TcpPayload<{ page: number; limit: number }> = {
      data: { page, limit },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IPaginatedDocuments>(DOCUMENT_PATTERNS.FIND_ALL, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** GET /documents/export — descarga XLSX de los comprobantes del usuario. */
  @Get('export')
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('documentType') documentType?: string,
  ): Promise<void> {
    const filters: IDashboardFilters = {
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
      ...(documentType ? { documentType } : {}),
    };
    const payload: TcpPayload<IDashboardFilters> = {
      data: filters,
      metadata: buildTcpMetadata(user),
    };
    const rows = await firstValueFrom(
      this.msCore
        .send<IDocumentDto[]>(DOCUMENT_PATTERNS.EXPORT, payload)
        .pipe(timeout(20_000)),
    );

    const wb = new Workbook();
    const ws = wb.addWorksheet('Comprobantes');
    ws.columns = [
      { header: 'Tipo', key: 'documentType', width: 16 },
      { header: 'RUC Emisor', key: 'rucEmisor', width: 16 },
      { header: 'Razón Social', key: 'razonSocialEmisor', width: 32 },
      { header: 'N° Factura', key: 'numeroFactura', width: 20 },
      { header: 'Fecha', key: 'fechaEmision', width: 14 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'IVA', key: 'iva', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Estado', key: 'estado', width: 16 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="comprobantes.xlsx"',
    );
    await wb.xlsx.write(res);
    res.end();
  }

  /** GET /documents/import-errors — claves que el SRI rechazó al importar. */
  @Get('import-errors')
  async importErrors(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IImportErrorDto[]> {
    const payload: TcpPayload<Record<string, never>> = {
      data: {},
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IImportErrorDto[]>(DOCUMENT_PATTERNS.LIST_IMPORT_ERRORS, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** POST /documents/validate-pending — valida los PENDIENTE/INCONSISTENTE. */
  @Post('validate-pending')
  @Roles('Administrador', 'Asistente')
  async validatePending(@CurrentUser() user: AuthenticatedUser) {
    const payload: TcpPayload<Record<string, never>> = {
      data: {},
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send(DOCUMENT_PATTERNS.VALIDATE_PENDING, payload)
        .pipe(timeout(30_000)),
    );
  }

  /** POST /documents/retry-imports — reintenta las claves en ERROR. */
  @Post('retry-imports')
  @Roles('Administrador', 'Asistente')
  async retryImports(@CurrentUser() user: AuthenticatedUser) {
    const payload: TcpPayload<Record<string, never>> = {
      data: {},
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send(DOCUMENT_PATTERNS.RETRY_IMPORTS, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** POST /documents/:id/consolidate — VALIDADO → CONSOLIDADO. */
  @Post(':id/consolidate')
  @Roles('Administrador', 'Contador')
  async consolidate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IDocumentDto | null> {
    return this.setStatus(id, 'consolidate', user);
  }

  /** POST /documents/:id/revalidate — re-ejecuta la validación. */
  @Post(':id/revalidate')
  @Roles('Administrador', 'Asistente')
  async revalidate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IDocumentDto | null> {
    return this.setStatus(id, 'revalidate', user);
  }

  private async setStatus(
    id: string,
    action: 'consolidate' | 'revalidate',
    user: AuthenticatedUser,
  ): Promise<IDocumentDto | null> {
    const payload: TcpPayload<{ id: string; action: 'consolidate' | 'revalidate' }> = {
      data: { id, action },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IDocumentDto | null>(DOCUMENT_PATTERNS.SET_STATUS, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** GET /documents/:id — detalle con items e impuestos. */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IDocumentDto> {
    const payload: TcpPayload<{ id: string }> = {
      data: { id },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IDocumentDto>(DOCUMENT_PATTERNS.FIND_BY_ID, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** GET /documents/:id/preview — Pre-Signed URL del archivo original. */
  @Get(':id/preview')
  async preview(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const payload: TcpPayload<{ id: string }> = {
      data: { id },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<{ url: string; expiresInSeconds: number }>(
          DOCUMENT_PATTERNS.PREVIEW,
          payload,
        )
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /**
   * GET /documents/:id/file — transmite el archivo (RIDE PDF / imagen) al
   * navegador SIN exponer MinIO. El gateway obtiene la URL pre-firmada
   * (endpoint INTERNO de MinIO), la descarga por la red privada y hace de
   * proxy. Autenticado + aislado por dueño (ms-core valida el owner).
   */
  @Get(':id/file')
  async file(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const payload: TcpPayload<{ id: string }> = {
      data: { id },
      metadata: buildTcpMetadata(user),
    };
    const { url } = await firstValueFrom(
      this.msCore
        .send<{ url: string; expiresInSeconds: number }>(
          DOCUMENT_PATTERNS.PREVIEW,
          payload,
        )
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );

    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) {
      throw new NotFoundException('Archivo no disponible.');
    }
    const contentType =
      upstream.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  }
}
