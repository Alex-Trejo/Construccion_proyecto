# Infraestructura AWS (Terraform) — SGC / FacturLink

Provisiona **1 EC2** (Ubuntu 22.04, `t3.large`) con **Elastic IP** y un **Security Group**
seguro, e instala Docker para levantar el stack con `docker-compose.prod.yml`.
El TLS lo emite **Caddy** automáticamente (Let's Encrypt) para los 3 subdominios.

## Qué crea

| Recurso | Detalle |
|---|---|
| `aws_instance` | EC2 `t3.large`, EBS gp3 30 GB cifrado, cloud-init con Docker + repo clonado |
| `aws_eip` | IP pública fija (para el DNS) |
| `aws_security_group` | 22 (solo tu IP) · 80/443 (público) · egress abierto (IMAP/SRI/OpenAI salientes) |
| `aws_key_pair` | Tu clave SSH |
| `aws_route53_record` | (Opcional) registros A si usas Route 53 |

## Requisitos previos

1. **Terraform ≥ 1.5** y **AWS CLI** configurado (`aws configure`) con credenciales que tengan permisos EC2/EIP (y Route 53 si aplica).
2. Una **clave SSH**: `ssh-keygen -t ed25519` (usa la `.pub` en `ssh_public_key_path`).
3. Tu **IP pública** (https://ifconfig.me) para `admin_ssh_cidr`.
4. Un **dominio** (barato: Porkbun `.xyz` ~$1-3, o Namecheap `.com` ~$10).

## Uso

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars   # editar con tus valores

terraform init
terraform plan
terraform apply            # crea la EC2 + EIP + SG (~1-2 min)
```

`terraform apply` imprime los **outputs**: la Elastic IP, el comando SSH y los
registros DNS que necesitas.

### Configurar el DNS (1 dominio, 3 nombres)

Apunta a la **Elastic IP** (de los outputs) uno de estos:
- Un **wildcard**: `*.tudominio.xyz  →  <EIP>`, **o**
- Tres registros A: `tudominio.xyz`, `auth.tudominio.xyz`, `grafana.tudominio.xyz` → `<EIP>`.

*(Si usas Route 53: pon `manage_route53=true` y `route53_zone_id` en `terraform.tfvars` y Terraform los crea.)*

### Levantar el stack (en la instancia)

```bash
ssh ubuntu@<EIP>
cd /opt/facturlink
cp .env.production.example .env
nano .env          # dominios + SECRETOS nuevos (ver ../../DEPLOY.md)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

En ~3-5 min tendrás (con TLS válido):
- `https://tudominio.xyz` — la app
- `https://auth.tudominio.xyz` — Keycloak (configura redirect URIs, ver DEPLOY.md)
- `https://grafana.tudominio.xyz` — métricas + logs (login de Grafana)

## Destruir todo

```bash
terraform destroy
```

## Notas

- El `.env`, el `terraform.tfstate` y `terraform.tfvars` **no se commitean** (ver `.gitignore`).
- Keycloak corre en modo `start-dev` (H2) para simplificar; para una prod estricta,
  migra a `start` con Postgres externo.
- Las `NEXT_PUBLIC_*` son de build: si cambian, `docker compose ... up -d --build` del frontend.
- Checklist de **rotación de secretos** y config de Keycloak: ver `DEPLOY.md`.
