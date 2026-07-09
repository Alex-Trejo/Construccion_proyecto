/**
 * @fileoverview Diccionarios de traducción (i18n) — Español / Inglés.
 *
 * Claves planas con notación por punto (`seccion.clave`). El provider
 * ([language-provider]) resuelve la clave según el idioma activo y admite
 * interpolación de variables con la sintaxis `{nombre}`.
 *
 * Idioma por defecto: `es`.
 *
 * @module i18n/dictionaries
 */

export type Lang = 'es' | 'en';

type Dict = Record<string, string>;

const es: Dict = {
  // ── Común / Navegación ──────────────────────────────────────────────
  'common.language': 'Idioma',
  'nav.overview': 'Inicio',
  'nav.suppliers': 'Proveedores',
  'nav.communications': 'Comunicaciones',
  'nav.signOut': 'Cerrar sesión',
  'nav.user': 'Usuario',

  // ── Landing ─────────────────────────────────────────────────────────
  'landing.login': 'Iniciar sesión',
  'landing.goDashboard': 'Ir al Panel',
  'landing.badge': 'SRI · Ecuador',
  'landing.heroTitleA': 'Gestión inteligente de',
  'landing.heroTitleHighlight': 'comprobantes',
  'landing.heroTitleB': 'electrónicos',
  'landing.heroDesc':
    'Automatiza la recepción, validación y almacenamiento de tus comprobantes del SRI. Del correo al almacenamiento en un solo flujo seguro.',
  'landing.getStarted': 'Comenzar →',
  'landing.learnMore': 'Saber más',
  'landing.feat.imap.title': 'Sincronización IMAP',
  'landing.feat.imap.desc': 'Obtén facturas del correo automáticamente',
  'landing.feat.xsd.title': 'Validación XSD',
  'landing.feat.xsd.desc': 'Esquemas oficiales del SRI',
  'landing.feat.storage.title': 'Almacenamiento de objetos',
  'landing.feat.storage.desc': 'Buckets seguros en MinIO',
  'landing.feat.sso.title': 'Keycloak SSO',
  'landing.feat.sso.desc': 'Autenticación empresarial',
  'landing.card.suppliers.title': 'Proveedores',
  'landing.card.suppliers.desc':
    'Registra personas naturales y jurídicas. Códigos de proveedor dinámicos vía Factory Method.',
  'landing.card.communications.title': 'Comunicaciones',
  'landing.card.communications.desc':
    'Revisa los correos recibidos y descarga los adjuntos directo del almacenamiento.',
  'landing.card.pipeline.title': 'Pipeline',
  'landing.card.pipeline.desc':
    'Sanea, valida y procesa el XML del SRI, y aprovisiona entidades automáticamente.',
  'landing.footer': '© {year} SGC — Sistema de Gestión de Comprobantes',

  // ── Overview (Inicio del panel) ─────────────────────────────────────
  'overview.badge': 'Panel',
  'overview.welcome': 'Bienvenido de nuevo, {name} 👋',
  'overview.desc':
    'Gestiona tus proveedores y revisa los comprobantes electrónicos recibidos por el pipeline automatizado del SRI.',
  'overview.card.suppliers.title': 'Proveedores',
  'overview.card.suppliers.desc':
    'Registra personas naturales o jurídicas. El Factory Method del backend genera el código dinámico del proveedor.',
  'overview.card.suppliers.cta': 'Gestionar proveedores →',
  'overview.card.communications.title': 'Comunicaciones',
  'overview.card.communications.desc':
    'Revisa los correos recibidos y descarga los adjuntos directamente del almacenamiento seguro.',
  'overview.card.communications.cta': 'Ver comunicaciones →',

  // ── Proveedores ─────────────────────────────────────────────────────
  'suppliers.badge': 'Proveedores',
  'suppliers.title': 'Registrar un proveedor',
  'suppliers.supplierType': 'Tipo de proveedor',
  'suppliers.opt.juridica': 'Persona Jurídica (empresa)',
  'suppliers.opt.natural': 'Persona Natural (individuo)',
  'suppliers.documentType': 'Tipo de documento',
  'suppliers.opt.cedula': 'Cédula (10 dígitos)',
  'suppliers.opt.ruc': 'RUC (13 dígitos)',
  'suppliers.taxId': 'RUC / Cédula',
  'suppliers.firstName': 'Nombres',
  'suppliers.lastName': 'Apellidos',
  'suppliers.cedula': 'Cédula',
  'suppliers.businessName': 'Razón social',
  'suppliers.tradeName': 'Nombre comercial',
  'suppliers.legalRep': 'Representante legal',
  'suppliers.email': 'Correo electrónico',
  'suppliers.phone': 'Teléfono',
  'suppliers.address': 'Dirección',
  'suppliers.create': 'Crear proveedor',
  'suppliers.creating': 'Creando…',
  'suppliers.listTitle': 'Proveedores registrados',
  'suppliers.loading': 'Cargando…',
  'suppliers.empty': 'Aún no hay proveedores.',
  'suppliers.rucLabel': 'RUC:',
  'suppliers.created': '✅ Creado: {name} — código {code}',
  'suppliers.unexpectedError': 'Error inesperado',
  'suppliers.doc.cedula': 'Cédula',
  'suppliers.doc.ruc': 'RUC',
  'suppliers.err.taxIdNumeric': 'El RUC/Cédula solo puede contener números.',
  'suppliers.err.taxIdLength': 'El {doc} debe tener exactamente {n} dígitos.',
  'suppliers.err.cedula': 'La Cédula debe contener exactamente 10 dígitos numéricos.',
  'suppliers.err.phone': 'El Teléfono solo puede contener números (7 a 10 dígitos).',

  // ── Comunicaciones ──────────────────────────────────────────────────
  'communications.badge': 'Comunicaciones',
  'communications.title': 'Correos recibidos',
  'communications.refresh': '↻ Actualizar',
  'communications.th.from': 'Remitente',
  'communications.th.subject': 'Asunto',
  'communications.th.date': 'Fecha',
  'communications.th.attachments': 'Adjuntos',
  'communications.loading': 'Cargando…',
  'communications.empty': 'Aún no se han recibido correos.',
  'communications.pageInfo': '{total} correos · página {page} de {totalPages}',
  'communications.prev': '← Anterior',
  'communications.next': 'Siguiente →',
  'communications.loadError': 'No se pudieron cargar las comunicaciones.',
  'communications.downloadError': 'No se pudo generar el enlace de descarga.',
  'communications.downloadTitle': 'Descargar {filename}',
};

const en: Dict = {
  // ── Common / Navigation ─────────────────────────────────────────────
  'common.language': 'Language',
  'nav.overview': 'Overview',
  'nav.suppliers': 'Suppliers',
  'nav.communications': 'Communications',
  'nav.signOut': 'Sign out',
  'nav.user': 'User',

  // ── Landing ─────────────────────────────────────────────────────────
  'landing.login': 'Login',
  'landing.goDashboard': 'Go to Dashboard',
  'landing.badge': 'SRI · Ecuador',
  'landing.heroTitleA': 'Smart management of',
  'landing.heroTitleHighlight': 'electronic',
  'landing.heroTitleB': 'receipts',
  'landing.heroDesc':
    'Automate the reception, validation and storage of your SRI vouchers. Email-to-storage in one secure flow.',
  'landing.getStarted': 'Get started →',
  'landing.learnMore': 'Learn more',
  'landing.feat.imap.title': 'IMAP Sync',
  'landing.feat.imap.desc': 'Auto-fetch invoices from email',
  'landing.feat.xsd.title': 'XSD Validation',
  'landing.feat.xsd.desc': 'Official SRI schemas',
  'landing.feat.storage.title': 'Object Storage',
  'landing.feat.storage.desc': 'Secure MinIO buckets',
  'landing.feat.sso.title': 'Keycloak SSO',
  'landing.feat.sso.desc': 'Enterprise authentication',
  'landing.card.suppliers.title': 'Suppliers',
  'landing.card.suppliers.desc':
    'Register natural & legal persons. Dynamic supplier codes via Factory Method.',
  'landing.card.communications.title': 'Communications',
  'landing.card.communications.desc':
    'Browse received emails and download attachments straight from storage.',
  'landing.card.pipeline.title': 'Pipeline',
  'landing.card.pipeline.desc':
    'Sanitize, validate and parse SRI XML, then auto-provision entities.',
  'landing.footer': '© {year} SGC — Sistema de Gestión de Comprobantes',

  // ── Overview ────────────────────────────────────────────────────────
  'overview.badge': 'Dashboard',
  'overview.welcome': 'Welcome back, {name} 👋',
  'overview.desc':
    'Manage your suppliers and review the electronic receipts received through the automated SRI pipeline.',
  'overview.card.suppliers.title': 'Suppliers',
  'overview.card.suppliers.desc':
    'Register natural or legal persons. The backend Factory Method generates the dynamic supplier code.',
  'overview.card.suppliers.cta': 'Manage suppliers →',
  'overview.card.communications.title': 'Communications',
  'overview.card.communications.desc':
    'Browse received emails and download attachments directly from secure object storage.',
  'overview.card.communications.cta': 'View communications →',

  // ── Suppliers ───────────────────────────────────────────────────────
  'suppliers.badge': 'Suppliers',
  'suppliers.title': 'Register a supplier',
  'suppliers.supplierType': 'Supplier type',
  'suppliers.opt.juridica': 'Persona Jurídica (company)',
  'suppliers.opt.natural': 'Persona Natural (individual)',
  'suppliers.documentType': 'Document type',
  'suppliers.opt.cedula': 'Cédula (10 digits)',
  'suppliers.opt.ruc': 'RUC (13 digits)',
  'suppliers.taxId': 'RUC / Cédula',
  'suppliers.firstName': 'First name',
  'suppliers.lastName': 'Last name',
  'suppliers.cedula': 'Cédula',
  'suppliers.businessName': 'Business name',
  'suppliers.tradeName': 'Trade name',
  'suppliers.legalRep': 'Legal representative',
  'suppliers.email': 'Email',
  'suppliers.phone': 'Phone',
  'suppliers.address': 'Address',
  'suppliers.create': 'Create supplier',
  'suppliers.creating': 'Creating…',
  'suppliers.listTitle': 'Registered suppliers',
  'suppliers.loading': 'Loading…',
  'suppliers.empty': 'No suppliers yet.',
  'suppliers.rucLabel': 'RUC:',
  'suppliers.created': '✅ Created: {name} — code {code}',
  'suppliers.unexpectedError': 'Unexpected error',
  'suppliers.doc.cedula': 'Cédula',
  'suppliers.doc.ruc': 'RUC',
  'suppliers.err.taxIdNumeric': 'The RUC/Cédula may only contain digits.',
  'suppliers.err.taxIdLength': 'The {doc} must have exactly {n} digits.',
  'suppliers.err.cedula': 'The Cédula must contain exactly 10 numeric digits.',
  'suppliers.err.phone': 'The Phone may only contain digits (7 to 10).',

  // ── Communications ──────────────────────────────────────────────────
  'communications.badge': 'Communications',
  'communications.title': 'Received emails',
  'communications.refresh': '↻ Refresh',
  'communications.th.from': 'From',
  'communications.th.subject': 'Subject',
  'communications.th.date': 'Date',
  'communications.th.attachments': 'Attachments',
  'communications.loading': 'Loading…',
  'communications.empty': 'No emails received yet.',
  'communications.pageInfo': '{total} emails · page {page} of {totalPages}',
  'communications.prev': '← Prev',
  'communications.next': 'Next →',
  'communications.loadError': 'Failed to load communications.',
  'communications.downloadError': 'Could not generate the download link.',
  'communications.downloadTitle': 'Download {filename}',
};

export const dictionaries: Record<Lang, Dict> = { es, en };
