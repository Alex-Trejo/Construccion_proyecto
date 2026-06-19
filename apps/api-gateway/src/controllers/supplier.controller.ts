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
  Get,
  Inject,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  MICROSERVICE_TOKENS,
  SUPPLIER_PATTERNS,
  type ICreateSupplierDto,
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
  @Roles('Administrador', 'Contador')
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
}
