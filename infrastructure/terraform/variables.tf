# ─────────────────────────────────────────────────────────────────────────────
# Variables de entrada. Rellena terraform.tfvars (copia de terraform.tfvars.example).
# ─────────────────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "Región de AWS."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefijo para nombrar los recursos."
  type        = string
  default     = "facturlink"
}

variable "instance_type" {
  description = "Tipo de instancia EC2. t3.large (8GB) recomendado; t3.medium (4GB) mínimo."
  type        = string
  default     = "t3.large"
}

variable "volume_size_gb" {
  description = "Tamaño del disco raíz (EBS gp3) en GB."
  type        = number
  default     = 30
}

variable "ssh_public_key_path" {
  description = "Ruta a tu clave pública SSH (ej. ~/.ssh/id_ed25519.pub). Se usará para acceder por SSH."
  type        = string
}

variable "admin_ssh_cidr" {
  description = "CIDR autorizado para SSH (tu IP pública / 32). Ej: 200.1.2.3/32. Averíguala en https://ifconfig.me"
  type        = string
}

variable "repo_url" {
  description = "URL del repositorio Git a clonar en la instancia."
  type        = string
  default     = "https://github.com/Alex-Trejo/Construccion_proyecto.git"
}

# ── Dominios (para outputs y DNS opcional) ────────────────────────────────────
variable "app_domain" {
  description = "Dominio de la app. Ej: facturlink.xyz"
  type        = string
}

variable "auth_domain" {
  description = "Subdominio de Keycloak. Ej: auth.facturlink.xyz"
  type        = string
}

variable "grafana_domain" {
  description = "Subdominio de Grafana. Ej: grafana.facturlink.xyz"
  type        = string
}

# ── Route 53 (opcional) ───────────────────────────────────────────────────────
# Si gestionas el DNS con Route 53, pon manage_route53=true y el zone_id de tu
# hosted zone; Terraform creará los registros A. Si usas otro DNS (Namecheap,
# Porkbun…), déjalo en false y apunta los registros A manualmente a la EIP.
variable "manage_route53" {
  description = "Crear los registros A en Route 53."
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "ID de la hosted zone de Route 53 (si manage_route53=true)."
  type        = string
  default     = ""
}
