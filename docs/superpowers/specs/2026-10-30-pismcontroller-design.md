# Spec: PismController (Crafty Controller + Prism Launcher Hybrid)

## Objective
**PismController** es una suite de orquestación y administración de servidores de Minecraft diseñada para uso local o despliegue en la nube (como instancias VPS de Oracle Cloud Infrastructure - OCI) que fusiona:
1. **La potencia operativa y monitoreo de Crafty Controller**: Control 24/7 de múltiples servidores independientes, panel web responsive estilo "Mission Control", terminal interactiva en tiempo real (bidireccional con xterm.js), métricas en vivo (CPU, RAM, TPS, latencia) y gestión de roles y permisos.
2. **La experiencia de usuario y catálogo de Prism Launcher**: Asistente visual e intuitivo de creación de instancias (Vanilla, Paper, Purpur, Fabric, Forge, NeoForge), gestor integrado de contenidos para buscar e instalar en 1-click **Modpacks** (Modrinth .mrpack / CurseForge zip), **Mods**, **Plugins** y **Datapacks**, con resolución automática de dependencias y actualización en 1-clic.
3. **Herramientas Profesionales sin Fricción**:
   - **Asistente Inteligente de Diagnóstico de Crashes**: Análisis automático de logs de servidor y crash reports para identificar al instante la causa (ej. mods incompatibles, Java incorrecto, mods client-side en servidor como Sodium) ofreciendo solución con un solo clic.
   - **Editor Visual de `server.properties` & Diseñador de MOTD/Favicon en Vivo**: Configuración mediante switches, sliders y tooltips en español, con previsualización exacta de cómo se ve el servidor en la lista multijugador de Minecraft (soporte colores `§` y MiniMessage).
   - **Gestor de Jugadores con Skins en Vivo**: Lista en tiempo real de jugadores conectados con avatares 3D/2D (Minotar/Crafatar) y acciones rápidas (OP, Whitelist, Kick, Ban).
   - **Command Palette (`Ctrl+K`)**: Búsqueda universal rápida para saltar entre servidores, buscar mods y lanzar comandos de inmediato.
   - **Snapshots y Backups**: Creación de copias de seguridad de mundos y carpetas antes de actualizaciones de mods.
4. **Experiencia de Escritorio e Integración con Antigravity IDE**:
   - **Aplicación de Escritorio Nativa (Electron)**: Ventana independiente sin depender del navegador web, minimizable a la bandeja del sistema (System Tray), con notificaciones nativas de Windows/Linux para crashes o alertas de rendimiento.
   - **Integración con Antigravity IDE / VS Code**:
     - **En local**: Botón "Abrir en Antigravity IDE" que lanza el espacio de trabajo del servidor directamente en el editor.
     - **En remoto (VPS / Oracle Cloud)**: **Micro-servidor SFTP embebido** (`ssh2`) con autenticación de cuentas PismController y enjaulado *chroot* por instancia, permitiendo editar `server.properties`, configs de mods, datapacks y scripts de KubeJS directamente desde Antigravity IDE con autoguardado en vivo.

---

## Tech Stack

| Componente | Tecnología | Versión / Detalle |
|---|---|---|
| **Runtime** | Node.js | v24.15+ LTS (con soporte para ESM y TypeScript nativo) |
| **Lenguaje** | TypeScript | v5.x (Strict mode habilitado) |
| **Backend Framework** | Fastify | v5.x (Alto rendimiento, bajo overhead HTTP y WebSockets via `@fastify/websocket`) |
| **Persistencia** | SQLite | `better-sqlite3` (Síncrono, ultrarrápido, cero configuración) |
| **Seguridad & Auth** | Argon2 / JWT | `@fastify/jwt` con cookies HTTP-only para sesiones multi-usuario |
| **Servidor SFTP** | `ssh2` | Servidor SFTP RFC 4253 embebido para Antigravity IDE |
| **Procesos & Subprocess** | Node `child_process` / `events` | Wrapper de supervisión con pipes bidireccionales, terminación en árbol (`tree-kill`), timeout de apagado ordenado (15s) y `pidusage` para métricas |
| **Frontend Framework** | React 19 + Vite | SPA de alto rendimiento |
| **Desktop Shell** | Electron 34+ | Aplicación de escritorio nativa con System Tray y notificaciones |
| **Estilos & UI** | Tailwind CSS + Lucide Icons | Estética industrial limpia NebulaX Studio |
| **Consola Web** | `@xterm/xterm` + `@xterm/addon-fit` | Emulador de terminal ANSI completo para logs y comandos |
| **Testing** | Vitest | Pruebas unitarias rápidas y aislamiento de I/O |

---

## Commands

```bash
# Instalación de dependencias
npm install

# Modo desarrollo (Backend Fastify + Frontend Vite con Hot Reload)
npm run dev

# Ejecutar suite de pruebas unitarias
npm test

# Ejecutar pruebas con reporte de cobertura
npm run test:coverage

# Verificación de tipos y linter
npm run lint

# Compilación para producción (Backend build + Vite build a dist/)
npm run build

# Iniciar servidor en producción
npm start
```

---

## Project Structure (Screaming Architecture)

El código fuente está estructurado de modo que la jerarquía de carpetas "grite" inmediatamente los conceptos del dominio de Minecraft y gestión de servidores, manteniendo la capa de entrega (Web/CLI) como un simple adaptador:

```
pismcontroller/
├── docs/
│   ├── CAPABILITY_MAP.md
│   ├── decisions/                      # ADRs (Architecture Decision Records)
│   │   ├── 0001-screaming-architecture-modular-monolith.md
│   │   └── 0002-content-catalog-provider-abstraction.md
│   └── superpowers/specs/             # Especificaciones detalladas
├── data/                               # Directorio de persistencia en runtime
│   ├── pism.db                         # Base de datos SQLite
│   └── servers/                        # Raíz de instancias de servidores Minecraft
│       ├── srv_01/
│       │   ├── server.properties
│       │   ├── eula.txt
│       │   ├── server.jar
│       │   ├── mods/
│       │   ├── plugins/
│       │   ├── datapacks/
│       │   └── pism-instance.json      # Metadatos del servidor en Pism
├── src/
│   ├── auth-identity/                  # Dominio: Usuarios, roles (Admin, Operator, Viewer), credenciales
│   │   ├── models/
│   │   ├── services/
│   │   └── repositories/
│   ├── java-manager/                   # Dominio: Detección y compatibilidad de JRE/JDKs del SO
│   │   ├── java-detector.ts
│   │   ├── java-compatibility.ts
│   │   └── jvm-flag-presets.ts         # Aikar's Flags optimizados
│   ├── servers/                        # Dominio: Instancias de servidor (CRUD, propiedades, EULA, puertos)
│   │   ├── models/
│   │   ├── services/
│   │   ├── properties-editor/          # Parser y diseñador visual de server.properties y MOTD
│   │   ├── players/                    # Gestor de jugadores y skins (Minotar/Crafatar)
│   │   ├── backups/                    # Gestor de snapshots y backups zip
│   │   └── server-repository.ts
│   ├── content-catalog/                # Dominio: Catálogo Prism (Modrinth, CurseForge, PaperMC, Fabric)
│   │   ├── providers/
│   │   │   ├── modrinth-provider.ts
│   │   │   ├── curseforge-provider.ts   # Opcional vía CURSEFORGE_API_KEY
│   │   │   ├── papermc-provider.ts
│   │   │   └── fabric-provider.ts
│   │   ├── dependency-resolver.ts
│   │   ├── update-checker.ts           # Verificador y actualizador de mods en 1-clic
│   │   └── installer-service.ts
│   ├── process-supervisor/             # Dominio: Supervisión de procesos Java, I/O terminal y métricas
│   │   ├── process-runner.ts
│   │   ├── console-stream.ts
│   │   ├── crash-analyzer/             # Motor inteligente de diagnóstico de logs y causas
│   │   ├── crash-detector.ts
│   │   └── metrics-collector.ts
│   └── delivery/                       # Mecanismo de entrega (Delivery Mechanism)
│       ├── http/                       # Rutas Fastify REST
│       │   ├── auth-routes.ts
│       │   ├── server-routes.ts
│       │   ├── catalog-routes.ts
│       │   ├── diagnostics-routes.ts
│       │   └── java-routes.ts
│       ├── websocket/                  # Canales en tiempo real (consola y métricas)
│       │   └── console-socket.ts
│       ├── sftp/                       # Servidor SFTP para Antigravity IDE
│       │   ├── sftp-server.ts
│       │   ├── sftp-authenticator.ts
│       │   └── virtual-fs-bridge.ts
│       ├── web-dashboard/              # Aplicación React (SPA)
│       │   ├── src/
│       │   │   ├── components/         # Terminal, Header, ServerCard, CommandPalette, MotdDesigner
│       │   │   ├── pages/              # Dashboard, ServerDetail, CatalogExplorer, PlayersView, Settings
│       │   │   └── services/           # Clientes API REST y WebSocket
│       └── desktop/                    # Shell de escritorio nativo Electron
│           ├── main.ts                 # Ciclo de vida de la ventana y proceso principal
│           ├── tray.ts                 # Bandeja del sistema (System Tray) y menú rápido
│           ├── notifications.ts        # Alertas de escritorio para crashes y eventos
│           └── ide-bridge.ts           # Integración y apertura con Antigravity IDE
└── package.json
```

---

## Code Style & Conventions

- **SOLID & Clean Architecture**: Los servicios del dominio nunca importan nada de Fastify o React.
- **Tipado Estricto**: `strict: true` en `tsconfig.json`. Prohibido el uso de `any`.
- **Nombres de variables y funciones**: En inglés descriptivo (`getServerById`, `downloadModpack`). Mensajes al usuario en español.
- **Manejo de Errores Tipado**: Uso de clases de error de dominio (`ServerNotFoundError`, `JavaVersionIncompatibleError`, `ModDownloadError`).

### Ejemplo de Diseño de Dominio:
```typescript
export interface IContentProvider {
  readonly id: string;
  readonly name: string;
  search(query: CatalogSearchQuery): Promise<CatalogSearchResult>;
  getVersions(projectId: string, gameVersion: string, loader?: string): Promise<ContentVersion[]>;
  downloadArtifact(versionId: string, destinationDir: string): Promise<InstalledContentResult>;
}

export class ContentInstallerService {
  constructor(private readonly providers: Map<string, IContentProvider>) {}

  async install(instance: ServerInstance, request: InstallContentRequest): Promise<void> {
    const provider = this.providers.get(request.providerId);
    if (!provider) {
      throw new ProviderNotFoundError(`Proveedor no registrado: ${request.providerId}`);
    }
    // Lógica de descarga y resolución de dependencias
  }
}
```

---

## Testing Strategy

- **Vitest**: Test runner principal.
- **Pruebas Unitarias de Dominio**:
  - `java-manager`: Mockear salidas de `java -version` para verificar detección de Java 8, 17, 21 y 25.
  - `servers`: Validación de parser y serializador de `server.properties` y gestión de puertos.
  - `content-catalog`: Mockear respuestas JSON de Modrinth y PaperMC para probar resolución de dependencias y selección de versiones compatibles.
  - `process-supervisor`: Mockear streams de `child_process` para asegurar que las entradas y salidas de la consola se emiten adecuadamente por los eventos.
- **Cobertura Objetivo**: Mínimo 80% en los módulos de lógica de negocio (`servers`, `content-catalog`, `java-manager`).

---

## Boundaries

- **Siempre hacer (Always):**
  - Sanitizar y validar todos los parámetros de entrada con esquemas estrictos.
  - Comprobar que los puertos seleccionados (ej. 25565) estén libres antes de iniciar un servidor.
  - Respetar la compatibilidad de Java (evitar que un servidor de MC 1.21.x arranque con Java 8 o 17).
  - Mantener la consola y métricas operando en segundo plano de manera no bloqueante.
  - Emplear terminación en árbol de procesos (`tree-kill` en Windows / Process Groups en Linux) con un timeout de 15s tras `/stop` antes de enviar `SIGKILL`, garantizando que launchers de Fabric/Forge no dejen instancias Java huérfanas reteniendo puertos o archivos `session.lock`.
  - Habilitar Modrinth y PaperMC como proveedores por defecto; requerir `CURSEFORGE_API_KEY` para activar CurseForge sin romper el inicio de la app si no está presente.
  - Detección precisa de jugadores combinando Server List Ping (SLP) con regex parsing del flujo stdout para eventos de conexión/desconexión y comandos administrativos.
- **Consultar primero (Ask First):**
  - Modificar esquemas de base de datos existentes.
  - Añadir dependencias npm que superen 5MB.
- **Nunca hacer (Never):**
  - Hardcodear rutas absolutas locales (`C:\Users\...`).
  - Mezclar código de interfaz de usuario dentro de los servicios de dominio.
  - Exponer contraseñas o tokens en los logs de consola.

---

## Success Criteria

1. **Creación de Instancia en 3 Clics**:
   - Crear un servidor seleccionando versión (ej. 1.21.4) y loader (Paper / Fabric / Vanilla), autodescargando el `.jar` oficial y generando las configuraciones básicas y EULA.
2. **Catálogo Integrado Prism**:
   - Buscar un mod o plugin en Modrinth/PaperMC desde la UI y que se instale directamente en la carpeta de la instancia correspondiente con 1 solo clic.
3. **Consola en Vivo & Control**:
   - Iniciar, detener y enviar comandos (`op`, `whitelist`, `gamemode`) a la consola a través de la terminal web en tiempo real.
4. **Métricas en Vivo (Mission Control)**:
   - Visualización de estado (ONLINE/OFFLINE), gráficos fluidos de RAM, CPU, latencia y conteo de jugadores.
5. **Multi-usuario Seguro**:
   - Login con contraseña, rol de administrador para crear/borrar servidores y rol de operador/visor para gestionar consola.
6. **Diagnóstico Inteligente de Crashes**:
   - Detección automática en logs de errores comunes (Java incompatible, mod client-side en servidor, falta de RAM) con propuesta de solución en 1-clic.
7. **Editor Visual de `server.properties` & Diseñador de MOTD**:
   - Configuración mediante interruptores y sliders intuitivos con previsualización en vivo de cómo se verá el servidor en el menú multijugador de Minecraft.
8. **Gestor de Jugadores con Skins**:
   - Visualización de avatares de jugadores conectados en tiempo real mediante API de skins y botones de acción rápida (Kick, Ban, Op, Whitelist).
9. **Command Palette (`Ctrl+K`)**:
   - Búsqueda global instantánea accesible mediante atajo de teclado para navegar servidores, comandos y catálogo.
10. **Despliegue Nativo para Oracle Cloud / Linux VPS**:
    - Backend headless configurable con `HOST=0.0.0.0` y `PORT=3000`, paths normalizados y compatibilidad completa con Linux (Ubuntu/Debian) y Windows.
11. **Aplicación de Escritorio Nativa**:
    - Ejecutar PismController como cliente de escritorio independiente (Electron) con soporte para System Tray y notificaciones de sistema para eventos y crashes.
12. **Integración de Archivos con Antigravity IDE**:
    - Botón "Abrir en Antigravity IDE" para servidores locales y servidor SFTP seguro embebido (`ssh2`, puerto por defecto 2022) para editar archivos de servidores remotos con guardado instantáneo en vivo.
