/**
 * @fileoverview Módulo de Documentos (ms-core).
 *
 * Encapsula toda la lógica de procesamiento de comprobantes del SRI:
 *   - Sanitización XML (firma, CDATA, entities)
 *   - Validación XSD
 *   - APIs SOAP/REST del SRI
 *   - Parsing del XML (fast-xml-parser)
 *   - Repositorio de facturas entrantes (TypeORM)
 *
 * Exporta FetchAndSanitizeXmlUseCase para que CommunicationModule
 * pueda procesar los XMLs recibidos por correo.
 *
 * @module DocumentModule
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { XML_SANITIZER_PORT } from './domain/ports/xml-sanitizer.port';
import { XML_VALIDATOR_PORT } from './domain/ports/xml-validator.port';
import { SRI_SOAP_API_PORT } from './domain/ports/sri-soap-api.port';
import { INCOMING_INVOICE_REPOSITORY_PORT } from './domain/ports/incoming-invoice-repository.port';
import { COMPANY_REPOSITORY_PORT } from './domain/ports/company-repository.port';
import { XML_SRI_PARSER_PORT } from './domain/ports/xml-sri-parser.port';
import { SRI_REST_API_PORT } from './domain/ports/sri-rest-api.port';

import { XmlSanitizerAdapter } from './infrastructure/adapters/xml-sanitizer.adapter';
import { XmlValidatorAdapter } from './infrastructure/adapters/xml-validator.adapter';
import { SriSoapApiAdapter } from './infrastructure/adapters/sri-soap-api.adapter';
import { SriRestApiAdapter } from './infrastructure/adapters/sri-rest-api.adapter';
import { XmlSriParserAdapter } from './infrastructure/adapters/xml-sri-parser.adapter';
import { IncomingInvoiceOrmEntity } from './infrastructure/persistence/incoming-invoice.orm-entity';
import { TypeOrmIncomingInvoiceRepository } from './infrastructure/persistence/typeorm-incoming-invoice.repository';
import { TypeOrmCompanyRepository } from './infrastructure/persistence/typeorm-company.repository';
import { CompanyOrmEntity } from '../supplier/infrastructure/persistence/company.orm-entity';

import { FetchAndSanitizeXmlUseCase } from './application/use-cases/fetch-and-sanitize-xml.use-case';
import { ProcessSriXmlUseCase } from './application/use-cases/process-sri-xml.use-case';
import { AutoProvisionEntitiesUseCase } from './application/use-cases/auto-provision-entities.use-case';

import { SupplierModule } from '../supplier/supplier.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IncomingInvoiceOrmEntity, CompanyOrmEntity]),
    // SupplierModule exporta SUPPLIER_REPOSITORY_PORT (usado por AutoProvision).
    SupplierModule,
  ],
  providers: [
    // ── Infrastructure Adapters ──────────────────────────────────────────
    {
      provide: XML_SANITIZER_PORT,
      useClass: XmlSanitizerAdapter,
    },
    {
      provide: XML_VALIDATOR_PORT,
      useClass: XmlValidatorAdapter,
    },
    {
      provide: SRI_SOAP_API_PORT,
      useClass: SriSoapApiAdapter,
    },
    {
      provide: SRI_REST_API_PORT,
      useClass: SriRestApiAdapter,
    },
    {
      provide: XML_SRI_PARSER_PORT,
      useClass: XmlSriParserAdapter,
    },
    {
      provide: INCOMING_INVOICE_REPOSITORY_PORT,
      useClass: TypeOrmIncomingInvoiceRepository,
    },
    {
      provide: COMPANY_REPOSITORY_PORT,
      useClass: TypeOrmCompanyRepository,
    },

    // ── Use Cases ────────────────────────────────────────────────────────
    FetchAndSanitizeXmlUseCase,
    ProcessSriXmlUseCase,
    AutoProvisionEntitiesUseCase,
  ],
  exports: [
    FetchAndSanitizeXmlUseCase,
    ProcessSriXmlUseCase,
    AutoProvisionEntitiesUseCase,
    XML_SANITIZER_PORT,
    XML_VALIDATOR_PORT,
  ],
})
export class DocumentModule {}
