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
import { randomUUID } from 'node:crypto';
import {
  MICROSERVICE_TOKENS,
  SUPPLIER_PATTERNS,
  type ICreateSupplierDto,
  type ISupplier,
  type TcpPayload,
  type TcpRequestMetadata,
} from '@sgc/shared';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** Timeout para llamadas TCP al ms-core (ms). */
const TCP_TIMEOUT_MS = 10_000;

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SupplierController {
  private readonly logger = new Logger(SupplierController.name);

  constructor(
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCoreClient: ClientProxy,
  ) {}

  private buildMetadata(): TcpRequestMetadata {
    return {
      correlationId: randomUUID(),
      userId: 'anonymous',
      timestamp: new Date().toISOString(),
    };
  }

  /** POST /suppliers — crea un proveedor vía Factory Method en ms-core. */
  @Post()
  async create(@Body() dto: ICreateSupplierDto): Promise<ISupplier> {
    this.logger.debug(`POST /suppliers (${dto.supplierType} / ${dto.taxId})`);

    const payload: TcpPayload<ICreateSupplierDto> = {
      data: dto,
      metadata: this.buildMetadata(),
    };

    return firstValueFrom(
      this.msCoreClient
        .send<ISupplier>(SUPPLIER_PATTERNS.CREATE, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }

  /** GET /suppliers — lista proveedores activos. */
  @Get()
  async findAll(): Promise<ReadonlyArray<ISupplier>> {
    this.logger.debug('GET /suppliers');

    const payload: TcpPayload<Record<string, never>> = {
      data: {},
      metadata: this.buildMetadata(),
    };

    return firstValueFrom(
      this.msCoreClient
        .send<ReadonlyArray<ISupplier>>(SUPPLIER_PATTERNS.FIND_ALL, payload)
        .pipe(timeout(TCP_TIMEOUT_MS)),
    );
  }
}
