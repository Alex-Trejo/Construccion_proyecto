# Esquemas XSD — SRI Ecuador

## Estructura organizada

```
infrastructure/xsd/
├── xmldsig-core-schema.xsd          ← Firma digital W3C (requerido por todos los XSD)
├── factura/
│   ├── factura_V1.0.0.xsd
│   ├── factura_V1.1.0.xsd
│   ├── factura_V2.0.0.xsd
│   ├── factura_V2.1.0.xsd           ← Versión activa
│   └── xmldsig-core-schema.xsd
├── nota-credito/
│   ├── NotaCredito_V1.0.0.xsd
│   ├── NotaCredito_V1.1.0.xsd       ← Versión activa
│   └── xmldsig-core-schema.xsd
├── nota-debito/
│   ├── NotaDebito_V1.0.0.xsd        ← Versión activa
│   └── xmldsig-core-schema.xsd
├── comprobante-retencion/
│   ├── ComprobanteRetencion_V1.0.0.xsd
│   ├── ComprobanteRetencion_V2.0.0.xsd ← Versión activa
│   └── xmldsig-core-schema.xsd
├── guia-remision/
│   ├── GuiaRemision_V1.0.0.xsd
│   ├── GuiaRemision_V1.1.0.xsd      ← Versión activa
│   └── xmldsig-core-schema.xsd
└── liquidacion-compra/
    ├── LiquidacionCompra_V1.0.0.xsd
    ├── LiquidacionCompra_V1.1.0.xsd  ← Versión activa
    └── xmldsig-core-schema.xsd
```

## Configuración

Variable de entorno en `.env`:
```
XSD_SCHEMAS_PATH=./infrastructure/xsd
```

## ⚠️ Sobre la firma digital (xmldsig-core-schema.xsd)

Todos los XSD del SRI importan el esquema de firma digital XML:
```xml
<xsd:import namespace="http://www.w3.org/2000/09/xmldsig#"
            schemaLocation="xmldsig-core-schema.xsd"/>
```

Por eso, `xmldsig-core-schema.xsd` **debe estar en la misma carpeta** que
cada XSD del SRI. La validación XSD fallará sin este archivo.

## Flujo de sanitización (2 pasos)

1. `sanitizeKeepSignature()` → Limpia BOM, CDATA, entities, **MANTIENE** `<ds:Signature>`
2. Validar contra XSD → El esquema espera el nodo `<ds:Signature>`
3. `sanitize()` → Limpia todo **incluyendo** `<ds:Signature>` para parsear datos fiscales

## Detección automática del XSD

El sistema detecta el tipo de comprobante por la etiqueta raíz del XML:

| Etiqueta XML | XSD usado |
|-------------|-----------|
| `<factura>` | `factura/factura_V2.1.0.xsd` |
| `<notaCredito>` | `nota-credito/NotaCredito_V1.1.0.xsd` |
| `<notaDebito>` | `nota-debito/NotaDebito_V1.0.0.xsd` |
| `<comprobanteRetencion>` | `comprobante-retencion/ComprobanteRetencion_V2.0.0.xsd` |
| `<guiaRemision>` | `guia-remision/GuiaRemision_V1.1.0.xsd` |
| `<liquidacionCompra>` | `liquidacion-compra/LiquidacionCompra_V1.1.0.xsd` |
