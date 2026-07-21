/**
 * @fileoverview Controller HTTP — Proveedores.
 *
 * Proxy del api-gateway hacia ms-core (TCP). Las peticiones REST del
 * frontend se traducen a MessagePatterns y se reenvían a ms-core, donde
 * el Factory Method genera la entidad concreta y el código dinámico.
 *
 * Rutas (protegidas con JWT):
 *   POST /suppliers   → crea un proveedor (PERSONA_NATURAL | PERSONA_JURIDICA)
 *   GET  /suppliers   → lista proveedores activos
 *
 * @module SupplierController
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { firstValueFrom, timeout } from 'rxjs';
import {
  MICROSERVICE_TOKENS,
  SUPPLIER_PATTERNS,
  type ICreateSupplierDto,
  type IUpdateSupplierDto,
  type ISupplier,
  type TcpPayload,
} from '@sgc/shared';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { buildTcpMetadata } from '../auth/tcp-metadata';
import type { AuthenticatedUser } from '../auth/keycloak-jwt.strategy';

/** Timeout para llamadas TCP al ms-core (ms). */
const TCP_TIMEOUT_MS = 10_000;

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupplierController {
  private readonly logger = new Logger(SupplierController.name);

  constructor(
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCoreClient: ClientProxy,
  ) {}

  /** POST /suppliers — crea un proveedor vía Factory Method en ms-core. */
  @Post()
  @Roles('Administrador', 'Asistente')
  async create(
    @Body() dto: ICreateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ISupplier> {
    this.logger.debug(`POST /suppliers (${dto.supplierType} / ${dto.taxId})`);

    const payload: TcpPayload<ICreateSupplierDto> = {
      data: dto,
      metadata: buildTcpMetadata(user),
    };

    return firstValueFrom(
      this.msCoreClient
        .send<ISupplier>(SUPPLIER_PATTERNS.CREATE, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** GET /suppliers — lista proveedores del usuario autenticado. */
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReadonlyArray<ISupplier>> {
    this.logger.debug('GET /suppliers');

    const payload: TcpPayload<Record<string, never>> = {
      data: {},
      metadata: buildTcpMetadata(user),
    };

    return firstValueFrom(
      this.msCoreClient
        .send<ReadonlyArray<ISupplier>>(SUPPLIER_PATTERNS.FIND_ALL, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** GET /suppliers/:id — detalle de un proveedor del usuario. */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ISupplier> {
    const payload: TcpPayload<{ id: string }> = {
      data: { id },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCoreClient
        .send<ISupplier>(SUPPLIER_PATTERNS.FIND_BY_ID, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** PUT /suppliers/:id — actualiza un proveedor del usuario. */
  @Put(':id')
  @Roles('Administrador', 'Asistente')
  async update(
    @Param('id') id: string,
    @Body() changes: IUpdateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ISupplier> {
    const payload: TcpPayload<{ id: string; changes: IUpdateSupplierDto }> = {
      data: { id, changes },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCoreClient
        .send<ISupplier>(SUPPLIER_PATTERNS.UPDATE, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** DELETE /suppliers/:id — desactiva (soft delete) un proveedor del usuario. */
  @Delete(':id')
  @Roles('Administrador', 'Asistente')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: string }> {
    const payload: TcpPayload<{ id: string }> = {
      data: { id },
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCoreClient
        .send<{ deleted: string }>(SUPPLIER_PATTERNS.DEACTIVATE, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }
}
