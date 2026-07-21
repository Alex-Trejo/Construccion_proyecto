# ─────────────────────────────────────────────────────────────────────────────
# EC2 (Ubuntu 22.04) + EBS gp3 + Elastic IP, en la VPC/subred por defecto.
# Levanta el stack con docker-compose vía cloud-init (user_data.sh.tftpl).
# ─────────────────────────────────────────────────────────────────────────────

# AMI oficial de Ubuntu 22.04 (Canonical).
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# VPC y subred por defecto (simplifica; no crea red nueva).
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Par de claves SSH a partir de tu clave pública local.
resource "aws_key_pair" "this" {
  key_name   = "${var.project_name}-key"
  public_key = file(var.ssh_public_key_path)
}

# Instancia EC2.
resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.app.id]
  key_name                    = aws_key_pair.this.key_name
  associate_public_ip_address = true

  root_block_device {
    volume_type = "gp3"
    volume_size = var.volume_size_gb
    encrypted   = true
  }

  # cloud-init: instala Docker + compose y clona el repo.
  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    repo_url = var.repo_url
  })

  tags = {
    Name    = "${var.project_name}-app"
    Project = var.project_name
  }
}

# IP pública fija para el DNS.
resource "aws_eip" "app" {
  domain = "vpc"
  tags   = { Name = "${var.project_name}-eip" }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
