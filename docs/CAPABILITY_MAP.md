# Capability Map: PismController

**PismController** es una plataforma moderna para la orquestación y administración de servidores de Minecraft, combinando el control de instancias 24/7 y métricas web de **Crafty Controller** con la facilidad de instalación de modpacks, plugins, mods y datapacks de **Prism Launcher**.

---

## Módulos y Responsabilidades

| Module ID | Responsabilidad | Dependencias |
|---|---|---|
| `auth-identity` | Cuentas locales, roles (*Admin*, *Operator*, *Viewer*), tokens JWT / sesiones seguras, hashing de contraseñas. | — |
| `java-manager` | Detección automática de runtimes Java en el SO (Java 8, 11, 17, 21, 25), validación de compatibilidad con versiones de Minecraft, optimización de flags JVM (Aikar's Flags). | — |
| `server-core` | Dominio de instancias: creación de servidores, persistencia de metadatos, edición de `server.properties`, aceptación automática de EULA, gestión y reserva de puertos. | `java-manager` |
| `content-catalog` | Abstracción de repositorios de contenido (Modrinth API v2, CurseForge Core, PaperMC / Purpur / Velocity, Fabric / Forge / NeoForge). Búsqueda, descarga, resolución de dependencias e instalación de mods, plugins, datapacks y modpacks (.mrpack / zip). | `server-core` |
| `process-supervisor` | Gestión de procesos Java (`child_process`), streaming interactivo de consola stdin/stdout en tiempo real, autorestart, monitoreo de métricas (CPU/RAM) y ping nativo del protocolo Minecraft (TPS, jugadores online, latencia). | `server-core`, `java-manager` |
| `delivery-api` | Servidor HTTP y WebSocket (Fastify) que expone endpoints RESTful y canales de WebSocket para el panel web y herramientas de CLI. | `auth-identity`, `server-core`, `content-catalog`, `process-supervisor` |
| `web-dashboard` | Interfaz de usuario SPA moderna (React + Tailwind CSS + Lucide + Terminal xterm.js). Asistente de creación de servidor, catálogo interactivo de mods/plugins con 1-click install, explorador de archivos, terminal en vivo y gráficos de rendimiento. | `delivery-api` |

---

## Orden de Construcción (Build Order)

```mermaid
flowchart TD
    auth["auth-identity"]
    java["java-manager"]
    server["server-core"]
    catalog["content-catalog"]
    proc["process-supervisor"]
    api["delivery-api"]
    ui["web-dashboard"]

    java --> server
    auth --> api
    server --> catalog
    server --> proc
    java --> proc
    server --> api
    catalog --> api
    proc --> api
    api --> ui
```

1. **Fase 1: Fundaciones de Dominio**
   - `auth-identity` & `java-manager`
   - `server-core`
2. **Fase 2: Ejecución y Contenido**
   - `process-supervisor` (Procesos, consolas, WebSockets)
   - `content-catalog` (Integración Modrinth, PaperMC, CurseForge)
3. **Fase 3: Mecanismo de Entrega**
   - `delivery-api` (Gateway Fastify + WebSockets)
   - `web-dashboard` (UI React / Tailwind / xterm.js)
