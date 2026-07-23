# Project Architecture: SGC Monorepo

## General Constraints
1. **Monorepo Structure**: This project uses Turborepo with `apps/` (`api-gateway`, `ms-core`, `ms-sync`, `frontend`) and `packages/` (`shared`).
2. **Strict Multi-Tenancy**: The `api-gateway` extracts `userId` from Keycloak's JWT and injects it into `TcpPayload.metadata`. Microservices (`ms-core`, `ms-sync`) MUST NEVER trust user input for the owner ID; they must always read it from `metadata.userId`.
3. **Shared Contracts (`packages/shared`)**: All DTOs, Enums (e.g., `DocumentStatus`), `TcpPayload` types, and Message Patterns (`DOCUMENT_PATTERNS`) MUST be defined in `packages/shared`. Never duplicate types across microservices.
4. **Clean Architecture (`ms-core`)**: `ms-core` strictly separates Presentation (TCP controllers), Application (Use Cases), and Infrastructure (Adapters/Ports). Do not mix business logic into controllers.
5. **Fail-Fast**: Configuration is strictly validated with Joi. Missing env vars must crash the app on startup.

## Frontend (Next.js 16 App Router)
1. **Routing & Auth**: The app uses NextAuth (`app/api/auth/[...nextauth]`) paired with `proxy.ts` (middleware) to protect the `/dashboard` route.
2. **Styling**: The UI follows a **Neo-Brutalist** design aesthetic using raw CSS v4 (`@theme`) and utility classes (e.g., `.brutal-card`, `.brutal-input`). **Do not use Tailwind CSS in runtime or add Tailwind classes** unless standard to the brutalist preset.
3. **Forms & Validations**: Forms employ strict validation (e.g., checking RUC vs Cédula exact lengths dynamically) and use fail-fast UI techniques (stripping non-numeric inputs instantly via `onChange`).
4. **Internationalization (i18n)**: Features must support i18n out-of-the-box using the custom `useTranslation` hook and `LanguageProvider`.

## DevOps & Infrastructure
1. **CI/CD**: Managed via GitHub Actions (`ci.yml`, `cd.yml`).
2. **Infrastructure**: Currently manual (Click-Ops) on AWS. There is a Terraform scaffold in `/infrastructure/terraform`, but it is NOT applied yet. Do not assume Terraform state is active.
