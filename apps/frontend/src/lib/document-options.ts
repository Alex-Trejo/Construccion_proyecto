/**
 * @fileoverview Opciones de selección derivadas de los enums de documentos.
 * @module document-options
 */

import { DocumentType } from '@sgc/shared';

/** Todos los tipos de documento del SRI, para poblar selects. */
export const DOCUMENT_TYPE_OPTIONS: ReadonlyArray<DocumentType> =
  Object.values(DocumentType);
