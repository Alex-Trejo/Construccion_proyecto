output "public_ip" {
  description = "Elastic IP de la instancia. Apunta aquí tus registros DNS (A)."
  value       = aws_eip.app.public_ip
}

output "ssh_command" {
  description = "Comando para conectarte por SSH."
  value       = "ssh ubuntu@${aws_eip.app.public_ip}"
}

output "dns_records_needed" {
  description = "Registros A que debes crear en tu DNS (todos → la Elastic IP)."
  value = {
    "${var.app_domain}"     = aws_eip.app.public_ip
    "${var.auth_domain}"    = aws_eip.app.public_ip
    "${var.grafana_domain}" = aws_eip.app.public_ip
    "tip"                   = "O un único wildcard: *.${var.app_domain} -> ${aws_eip.app.public_ip}"
  }
}

output "urls" {
  description = "URLs finales (una vez configurado el DNS y desplegado)."
  value = {
    app     = "https://${var.app_domain}"
    auth    = "https://${var.auth_domain}"
    grafana = "https://${var.grafana_domain}"
  }
}
