# 🎮 PismController

> **El orquestador de servidores de Minecraft definitivo: El control 24/7 y la potencia de Crafty Controller unidos a la sencillez y catálogo de Prism Launcher.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 ¿Qué es PismController?

**PismController** nace para resolver el mayor dolor de cabeza de los administradores y jugadores de Minecraft:
- Administrar servidores en herramientas como Crafty Controller o paneles clásicos requiere buscar manualmente los archivos `.jar`, descargar plugins o mods en páginas externas, subirlos por FTP/gestor de archivos y lidiar con versiones incompatibles de Java.
- **PismController** integra la revolucionaria experiencia de **Prism Launcher** directamente dentro de un panel de control para servidores:
  - 🚀 **Despliegue Instantáneo**: Crea servidores Vanilla, Paper, Purpur, Fabric, Forge o NeoForge con un asistente visual.
  - 📦 **Catálogo de Contenido Integrado**: Busca e instala **Modpacks**, **Mods**, **Plugins** y **Datapacks** directamente desde **Modrinth**, **CurseForge** y **PaperMC** en un solo clic, con resolución automática de dependencias y actualización en 1-clic.
  - ☕ **Gestión Inteligente de Java**: Detecta automáticamente los runtimes instalados (Java 8, 11, 17, 21, 25) y selecciona la versión exacta requerida por la versión de Minecraft elegida, aplicando banderas JVM optimizadas (*Aikar's Flags*).
  - 🩺 **Diagnóstico Inteligente de Crashes**: Analiza automáticamente logs de errores y crash reports identificando la causa (Java incorrecto, mods incompatibles, mods de cliente instalados en el servidor) y ofrece solución en 1-clic.
  - 🎨 **Editor Visual de `server.properties` y MOTD en Vivo**: Olvídate de editar archivos de texto a ciegas: switches visuales, sliders y previsualización exacta de la tarjeta del servidor multijugador.
  - 👥 **Gestor de Jugadores con Skins**: Visualiza avatares en tiempo real y ejecuta acciones rápidas (OP, Kick, Ban, Whitelist).
  - 🖥️ **Terminal Interactiva en Vivo**: Consola VT100 (xterm.js) con comandos interactivos en tiempo real vía WebSockets y filtros inteligentes de logs.
  - ⚡ **Command Palette (`Ctrl+K`)**: Búsqueda global instantánea para saltar entre servidores, mods y comandos.
  - ☁️ **Optimizado para Oracle Cloud / VPS**: Diseñado tanto para desarrollo local como para operar como daemon 24/7 en servidores Linux (Oracle Cloud Infrastructure, Ubuntu, Debian).

---

## 🏛️ Arquitectura (Screaming Architecture)

Siguiendo los estándares de ingeniería de **NebulaX Studio**, el núcleo del sistema es 100% independiente del framework web y la interfaz de usuario:

```
src/
├── auth-identity/       # Cuentas, roles y sesiones
├── java-manager/        # Detección y compatibilidad de runtimes Java
├── servers/             # Dominio de instancias, configs y puertos
├── content-catalog/     # Proveedores (Modrinth, CurseForge, PaperMC) e instalador
├── process-supervisor/  # Ejecución de procesos Java, I/O terminal y métricas
└── delivery/            # Mecanismo de entrega: Fastify API + Panel React
```

Consulta los documentos de arquitectura:
- [Mapa de Capacidades](docs/CAPABILITY_MAP.md)
- [Especificación Técnica Completa](docs/superpowers/specs/2026-10-30-pismcontroller-design.md)
- [ADR-001: Screaming Architecture y Monolito Modular](docs/decisions/0001-screaming-architecture-modular-monolith.md)
- [ADR-002: Abstracción de Proveedores para el Catálogo](docs/decisions/0002-content-catalog-provider-abstraction.md)

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js**: v20.0+ (probado en v24.15)
- **Java**: Java 17, 21 o 25 instalado en el sistema

### Instalación y Ejecución
```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd pismcontroller

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm run dev
```

El panel estará disponible en `http://localhost:3000`.

### 🔑 Credenciales Iniciales
Al arrancar por primera vez, el sistema inicializa una cuenta de administrador por defecto:
- **Usuario:** `admin`
- **Contraseña:** `admin`

> [!IMPORTANT]
> **Cambio Obligatorio:** En el primer inicio de sesión, el panel solicitará automáticamente actualizar la contraseña por razones de seguridad.

---

## ☁️ Despliegue en VPS y Oracle Cloud (OCI)

Para operar PismController en un VPS en la nube (como instancias Ubuntu/Debian en Oracle Cloud Infrastructure), asegúrate de abrir los puertos de red necesarios:

### 1. Puertos Requeridos
| Puerto | Protocolo | Servicio |
|---|---|---|
| `3000` | TCP | Panel Web y WebSocket de PismController |
| `25565` | TCP / UDP | Puerto por defecto de servidores de Minecraft |

### 2. Reglas de Ingreso en Oracle Cloud (OCI)
En la consola de Oracle Cloud:
1. Ve a **Networking** > **Virtual Cloud Networks (VCN)** > Tu VCN > **Security Lists**.
2. Añade las siguientes **Ingress Rules** (Reglas de Ingreso):
   - **CIDR:** `0.0.0.0/0` | **Protocol:** TCP | **Destination Port Range:** `3000, 25565`
   - **CIDR:** `0.0.0.0/0` | **Protocol:** UDP | **Destination Port Range:** `25565` (requerido para consultas Bedrock/Geyser y ping UDP)

### 3. Firewall en el Sistema Operativo (Ubuntu/Debian)
```bash
# Si usas UFW:
sudo ufw allow 3000/tcp
sudo ufw allow 25565/tcp
sudo ufw allow 25565/udp
sudo ufw reload

# Si usas iptables nativo de Oracle Linux / Ubuntu OCI:
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 25565 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 25565 -j ACCEPT
sudo netfilter-persistent save
```

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
