# ─────────────────────────────────────────────────────────────────────────────
# Registros A en Route 53 (OPCIONAL).
#
# Solo se crean si manage_route53=true y route53_zone_id está definido.
# Si tu dominio está en otro registrador (Namecheap, Porkbun, Cloudflare…),
# deja manage_route53=false y crea manualmente los 3 registros A (o un wildcard
# *.tudominio) apuntando a la Elastic IP que verás en los outputs.
# ─────────────────────────────────────────────────────────────────────────────

locals {
  dns_names = var.manage_route53 ? {
    app     = var.app_domain
    auth    = var.auth_domain
    grafana = var.grafana_domain
  } : {}
}

resource "aws_route53_record" "a" {
  for_each = local.dns_names

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}
