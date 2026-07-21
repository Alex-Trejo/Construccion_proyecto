-- ─────────────────────────────────────────────────────────────────────────────
-- Init de PostgreSQL — Base de datos dedicada para Keycloak.
--
-- Este script SOLO se ejecuta cuando el volumen de datos de Postgres está
-- VACÍO (primer arranque). Crea la base `keycloak` que Keycloak usa para
-- persistir su estado (realm, clientes, usuarios, secretos).
--
-- Si el volumen ya existe (despliegue en curso), crea la base a mano una vez:
--   docker exec sgc-postgres psql -U <POSTGRES_USER> -c "CREATE DATABASE keycloak;"
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
