#!/usr/bin/env bash
# ==============================================================================
# 🌌 SINGULARITY | NebulaX Studio
# Script de Despliegue Automatizado para Oracle Cloud VPS (CasaOS + Coolify)
# ==============================================================================

set -e

echo -e "\033[1;36m"
echo "  🌌 ========================================================== 🌌"
echo "        SINGULARITY - MINECRAFT SERVER MISSION CONTROL           "
echo "         NebulaX Studio | Despliegue en Oracle Cloud VPS         "
echo "  🌌 ========================================================== 🌌"
echo -e "\033[0m"

# 1. Comprobación de Privilegios
if [ "$EUID" -ne 0 ]; then
  echo -e "\033[1;33m[!] Por favor, ejecuta este script como root o con sudo:\033[0m"
  echo "    sudo bash scripts/deploy-oracle.sh"
  exit 1
fi

# 2. Verificación de Docker
echo -e "\033[1;34m[*] Verificando entorno Docker en la máquina...\033[0m"
if ! command -v docker &> /dev/null; then
  echo -e "\033[1;31m[X] Docker no está instalado.\033[0m Instalando Docker Engine..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
  systemctl enable --now docker
fi

# 3. Configuración del Firewall del Sistema Operativo (UFW / iptables)
echo -e "\033[1;34m[*] Configurando reglas de firewall para Singularity...\033[0m"
if command -v ufw &> /dev/null; then
  ufw allow 3000/tcp comment "Singularity Web Dashboard & API"
  ufw allow 2022/tcp comment "Singularity SFTP Server (Antigravity IDE)"
  ufw allow 25565:25585/tcp comment "Minecraft Java Game Servers"
  ufw allow 25565:25585/udp comment "Minecraft Bedrock/Voicechat UDP"
  echo -e "\033[1;32m[✓] Reglas de UFW aplicadas con éxito.\033[0m"
fi

# Oracle Cloud iptables fix (Oracle Linux / Ubuntu en Oracle Cloud a veces bloquea puertos por defecto en iptables)
if command -v iptables &> /dev/null; then
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 2022 -j ACCEPT 2>/dev/null || true
  iptables -I INPUT 6 -m state --state NEW -p tcp --match multiport --dports 25565:25585 -j ACCEPT 2>/dev/null || true
  iptables -I INPUT 6 -m state --state NEW -p udp --match multiport --dports 25565:25585 -j ACCEPT 2>/dev/null || true
fi

# 4. Generación de Secretos de Producción
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo -e "\033[1;34m[*] Generando archivo .env con secreto JWT criptográfico...\033[0m"
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  cat <<EOF > "$ENV_FILE"
PORT=3000
HOST=0.0.0.0
SINGULARITY_SFTP_PORT=2022
SINGULARITY_SFTP_HOST=0.0.0.0
SINGULARITY_ADMIN_USER=admin
SINGULARITY_ADMIN_PASSWORD=singularity
SINGULARITY_JWT_SECRET=$JWT_SECRET
SINGULARITY_SERVERS_DIR=/app/data/servers
SINGULARITY_DB_PATH=/app/data/singularity.db
EOF
  chmod 600 "$ENV_FILE"
  echo -e "\033[1;32m[✓] Archivo .env generado de forma segura.\033[0m"
fi

# 5. Despliegue con Docker Compose
echo -e "\033[1;34m[*] Levantando contenedor de Singularity con Docker Compose...\033[0m"
docker compose up -d --build

echo ""
echo -e "\033[1;32m==============================================================================\033[0m"
echo -e "\033[1;32m  🎉 ¡SINGULARITY HA SIDO DESPLEGADO EXITOSAMENTE EN TU SERVIDOR! 🎉\033[0m"
echo -e "\033[1;32m==============================================================================\033[0m"
echo ""
echo -e "\033[1;37mAcceso al Dashboard Web:\033[0m"
echo -e "  🌐 URL:      \033[1;36mhttp://$(curl -s ifconfig.me || echo 'IP-DE-TU-VPS'):3000\033[0m"
echo -e "  👤 Usuario:  \033[1;33madmin\033[0m"
echo -e "  🔑 Clave:    \033[1;33msingularity\033[0m  (Se te pedirá cambiarla en el primer login)"
echo ""
echo -e "\033[1;37mAcceso SFTP (Antigravity IDE & VS Code):\033[0m"
echo -e "  🔒 Host:     \033[1;36m$(curl -s ifconfig.me || echo 'IP-DE-TU-VPS')\033[0m"
echo -e "  🔌 Puerto:   \033[1;36m2022\033[0m"
echo -e "  👤 Usuario:  \033[1;33mtus credenciales de Singularity\033[0m"
echo ""
echo -e "\033[1;33m⚠️  RECORDATORIO CRÍTICO PARA ORACLE CLOUD INFRASTRUCTURE (OCI):\033[0m"
echo "  Debes agregar las siguientes Reglas de Entrada (Ingress Rules) en la"
echo "  Security List de tu Virtual Cloud Network (VCN) en la consola web de Oracle:"
echo "    - Protocolo TCP, Puerto de destino: 3000       (Dashboard Web)"
echo "    - Protocolo TCP, Puerto de destino: 2022       (SFTP Antigravity)"
echo "    - Protocolo TCP/UDP, Puertos:       25565-25585(Servidores Minecraft)"
echo "=============================================================================="
