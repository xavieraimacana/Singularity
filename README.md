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
  - 📦 **Catálogo de Contenido Integrado**: Busca e instala **Modpacks**, **Mods**, **Plugins** y **Datapacks** directamente desde **Modrinth**, **CurseForge** y **PaperMC** en un solo clic, con resolución automática de dependencias.
  - ☕ **Gestión Inteligente de Java**: Detecta automáticamente los runtimes instalados (Java 8, 11, 17, 21, 25) y selecciona la versión exacta requerida por la versión de Minecraft elegida, aplicando banderas JVM optimizadas (*Aikar's Flags*).
  - 🖥️ **Terminal Interactiva en Vivo**: Consola VT100 (xterm.js) con comandos interactivos en tiempo real vía WebSockets.
  - 👥 **Multi-usuario y Roles**: Control de acceso con roles *Admin*, *Operator* y *Viewer*.
  - 📊 **Métricas en Tiempo Real**: Gráficos de CPU, consumo de memoria RAM, TPS del servidor y jugadores conectados.

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

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
