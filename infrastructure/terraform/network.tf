# ─────────────────────────────────────────────────────────────────────────────
# Security Group (firewall a nivel de red, antes del host).
#
#   Inbound:  22 (SSH, solo tu IP) · 80 y 443 (HTTP/HTTPS, público → Caddy)
#   Outbound: TODO permitido → cubre IMAP:993, SRI:443, OpenAI:443, Let's Encrypt
#
# Postgres/Keycloak/MinIO/Grafana NO se exponen: aunque Docker publique sus
# puertos en el host, este SG los bloquea desde internet.
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_security_group" "app" {
  name        = "${var.project_name}-sg"
  description = "SGC/FacturLink: SSH restringido, HTTP/HTTPS público, egress abierto."
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH (solo tu IP)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_ssh_cidr]
  }

  ingress {
    description = "HTTP (redirección + reto ACME de Let's Encrypt)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS (la app, vía Caddy)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress abierto: necesario para leer correo (IMAP 993 saliente), consultar el
  # SRI (443), OpenAI (443) y renovar certificados. Nada de esto requiere puertos
  # de ENTRADA.
  egress {
    description = "Salida a internet (IMAP, SRI, OpenAI, ACME, updates)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-sg" }
}
