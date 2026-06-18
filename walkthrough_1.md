# Walkthrough — Fase 1: Entorno Local y Fail-Fast

## Archivos Generados

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | [docker-compose.yml](file:///c:/Users/trejo/Desktop/S9/construccion/Parcial%20II/Proyecto/docker-compose.yml) | 6 servicios: PostgreSQL 16, Keycloak 24, MinIO, Prometheus, Loki, Grafana |
| 2 | [.env.example](file:///c:/Users/trejo/Desktop/S9/construccion/Parcial%20II/Proyecto/.env.example) | 35+ variables documentadas por sección, sin valores reales |
| 3 | [config.validation.ts](file:///c:/Users/trejo/Desktop/S9/construccion/Parcial%20II/Proyecto/apps/ms-core/src/config/config.validation.ts) | Esquema Joi — todo `.required()`, cero `.default()` |
| 4 | [app.module.ts](file:///c:/Users/trejo/Desktop/S9/construccion/Parcial%20II/Proyecto/apps/ms-core/src/app.module.ts) | Módulo raíz con ConfigModule + validación Joi |
| 5 | [main.ts](file:///c:/Users/trejo/Desktop/S9/construccion/Parcial%20II/Proyecto/apps/ms-core/src/main.ts) | Bootstrap híbrido (HTTP + TCP) con Fail-Fast |
| 6 | [prometheus.yml](file:///c:/Users/trejo/Desktop/S9/construccion/Parcial%20II/Proyecto/infrastructure/prometheus/prometheus.yml) | Scrape config para Keycloak y Loki |
| 7 | [datasources.yml](file:///c:/Users/trejo/Desktop/S9/construccion/Parcial%20II/Proyecto/infrastructure/grafana/provisioning/datasources/datasources.yml) | Auto-provisioning de Prometheus y Loki en Grafana |

## Estructura Creada

```
Proyecto/
├── .env.example
├── docker-compose.yml
├── apps/
│   └── ms-core/
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           └── config/
│               └── config.validation.ts
└── infrastructure/
    ├── prometheus/
    │   └── prometheus.yml
    └── grafana/
        └── provisioning/
            └── datasources/
                └── datasources.yml
```

## Decisiones Arquitectónicas

### 1. Docker Compose — 6 Servicios con Health Checks
Cada servicio tiene `healthcheck` con `test`, `interval`, `timeout`, `retries` y `start_period`. Grafana usa `depends_on` con `condition: service_healthy` para esperar a Prometheus y Loki.

### 2. Fail-Fast en 3 Capas
La validación de variables de entorno opera en 3 niveles de defensa:

1. **Capa 1 — Joi Schema** (`config.validation.ts`): Valida tipo, formato y presencia de TODAS las variables. `abortEarly: false` reporta todos los errores a la vez.
2. **Capa 2 — ConfigModule** (`app.module.ts`): Ejecuta la validación Joi durante `NestFactory.create()`. Si falla, lanza excepción.
3. **Capa 3 — getOrThrow** (`main.ts`): Cada acceso a una variable usa `configService.getOrThrow<T>()`, que lanza si la variable no existe en runtime.

### 3. Bootstrap Híbrido (HTTP + TCP)
- **HTTP** en `MS_CORE_HTTP_PORT`: Para health checks (`/health`), readiness probes de Kubernetes, y futura exposición de métricas a Prometheus.
- **TCP** en `MS_CORE_TCP_HOST:MS_CORE_TCP_PORT`: Canal de comunicación con el API Gateway vía `@nestjs/microservices`.

### 4. Stack PLG Pre-cableado
- Prometheus scrapeará automáticamente a Keycloak (`/metrics`) y Loki.
- Grafana arranca con datasources de Prometheus y Loki preconfigurados (provisioning YAML).
- Los targets de las apps NestJS están comentados y listos para descomentar en fases posteriores.

## Próximos Pasos

Las fases 2-9 están pendientes en el [task tracker](file:///C:/Users/trejo/.gemini/antigravity/brain/71d1f06c-3783-45e4-8a06-52b942323f91/task.md). La siguiente fase lógica sería:

- **Fase 2**: Root `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
- **Fase 3**: Paquete `@sgc/shared` con interfaces, enums y message patterns
