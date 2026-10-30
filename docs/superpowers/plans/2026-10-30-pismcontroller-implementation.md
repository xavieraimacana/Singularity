# PismController Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir **PismController**, una suite modular para orquestación de servidores de Minecraft que fusiona el control 24/7 y consola web de **Crafty Controller** con el catálogo integrado de mods/plugins/modpacks, analizador de crashes y configurador visual de **Prism Launcher**.

**Architecture:** Screaming Architecture Modular Monolith en TypeScript. Lógica de dominio pura (`java-manager`, `servers`, `process-supervisor`, `crash-analyzer`, `content-catalog`, `auth-identity`) 100% independiente del framework web Fastify y de la interfaz React. Diseñado para ejecución local o en VPS Linux de Oracle Cloud (OCI).

**Tech Stack:** Node.js 24+, TypeScript 5+, Fastify 5, `@fastify/websocket`, `better-sqlite3`, Vite, React 19, Tailwind CSS, `@xterm/xterm`, Lucide Icons, Vitest.

## Global Constraints
- TypeScript en modo estricto (`strict: true`), prohibido `any`.
- Screaming Architecture: ningún archivo de dominio importa Fastify, WebSockets ni React.
- Manejo asíncrono no bloqueante para I/O de consola, métricas y descargas concurrentes.
- Mensajes y documentación en español; nombres de código, clases y funciones en inglés.
- Conventional Commits en español (`feat: ...`, `fix: ...`, `test: ...`).

---

### Task 1: Scaffolding del Proyecto y Entorno de Desarrollo

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Produces: Estructura base del monorepo, configuración de TypeScript y suite de pruebas Vitest operativa.

- [ ] **Step 1: Crear archivo .gitignore**
  Ignorar `node_modules/`, `dist/`, `data/servers/`, `data/pism.db`, `.env`.

- [ ] **Step 2: Crear package.json con scripts de compilación, test y desarrollo**
  Definir scripts `dev`, `dev:desktop`, `build`, `build:desktop`, `test`, `test:coverage`, `lint`. Dependencias clave: `fastify`, `@fastify/websocket`, `@fastify/cors`, `@fastify/jwt`, `better-sqlite3`, `pidusage`, `tree-kill`, `ssh2`, `dotenv`, `zod`. Dependencias dev: `typescript`, `vitest`, `electron`, `@types/node`, `@types/better-sqlite3`, `@types/ssh2`.

- [ ] **Step 3: Crear tsconfig.json y vitest.config.ts**
  Configurar target ES2022, moduleResolution NodeNext, strict mode. Generar `.env.example` con `PORT=3000`, `HOST=0.0.0.0`, `SFTP_PORT=2022`, `JWT_SECRET=`, `CURSEFORGE_API_KEY=` (opcional), `DEFAULT_ADMIN_USER=admin`, `DEFAULT_ADMIN_PASSWORD=admin`.

- [ ] **Step 4: Instalar dependencias iniciales**
  Ejecutar `npm install`.

- [ ] **Step 5: Verificar que Vitest corre correctamente**
  Ejecutar `npm test`.

- [ ] **Step 6: Commit**
  ```bash
  git add package.json tsconfig.json tsconfig.server.json vitest.config.ts .gitignore .env.example
  git commit -m "chore: inicializar estructura de proyecto, typescript y vitest"
  ```

---

### Task 2: Módulo Java Manager (`src/java-manager`)

**Files:**
- Create: `src/java-manager/models/java-runtime.ts`
- Create: `src/java-manager/services/java-detector.ts`
- Create: `src/java-manager/services/java-compatibility.ts`
- Create: `src/java-manager/services/jvm-flag-presets.ts`
- Test: `tests/java-manager/java-manager.test.ts`

**Interfaces:**
- Produces:
  - `detectJavaRuntimes(): Promise<JavaRuntime[]>`
  - `getCompatibleJavaRuntime(mcVersion: string, runtimes: JavaRuntime[]): JavaRuntime | null`
  - `generateAikarFlags(memoryMb: number, jarPath: string): string[]`

- [ ] **Step 1: Escribir tests que fallen para detección de Java y resolución de compatibilidad**
  Testear que MC 1.21.x requiere Java 21+, MC 1.17 requiere Java 17+, y versiones legacy Java 8. Testear parsing de strings de `java -version`.
- [ ] **Step 2: Ejecutar test y verificar fallo**
  Run: `npx vitest run tests/java-manager/java-manager.test.ts`
- [ ] **Step 3: Implementar JavaDetector y JavaCompatibility**
  Escanear variables de entorno `JAVA_HOME`, `PATH`, y directorios estándar del sistema en Windows (`C:\Program Files\Java`, Eclipse Adoptium, etc.) y Linux (`/usr/lib/jvm`).
- [ ] **Step 4: Implementar generador de banderas JVM optimizadas (Aikar's Flags)**
  Generar argumentos para G1GC, MaxGCPauseMillis, etc.
- [ ] **Step 5: Ejecutar test y verificar que pasan**
  Run: `npx vitest run tests/java-manager/java-manager.test.ts`
- [ ] **Step 6: Commit**
  ```bash
  git add src/java-manager/ tests/java-manager/
  git commit -m "feat(java-manager): implementar deteccion de java, compatibilidad y banderas aikar"
  ```

---

### Task 3: Dominio de Instancias de Servidor y Editor de Propiedades (`src/servers`)

**Files:**
- Create: `src/servers/models/server-instance.ts`
- Create: `src/servers/models/server-properties.ts`
- Create: `src/servers/services/properties-parser.ts`
- Create: `src/servers/services/motd-designer.ts`
- Create: `src/servers/services/port-allocator.ts`
- Create: `src/servers/services/server-lifecycle.ts`
- Test: `tests/servers/properties-parser.test.ts`
- Test: `tests/servers/server-lifecycle.test.ts`

**Interfaces:**
- Produces:
  - `parseProperties(raw: string): ServerProperties`
  - `serializeProperties(props: ServerProperties): string`
  - `formatMotdPreview(motd: string): MotdPreviewResult`
  - `ServerLifecycleService` (createInstance, updateConfig, acceptEula)

- [ ] **Step 1: Escribir tests para parsing y serialización de `server.properties` y validación de EULA**
  Comprobar que preserva comentarios, parsea booleanos (`pvp=true`), enteros (`max-players=20`), y serializa de vuelta correctamente.
- [ ] **Step 2: Ejecutar test y verificar fallo**
  Run: `npx vitest run tests/servers/properties-parser.test.ts`
- [ ] **Step 3: Implementar PropertiesParser y MotdDesigner**
  Parser robusto sin dependencias de terceros; diseñador MOTD que traduce códigos `§` y códigos RGB a HTML preview.
- [ ] **Step 4: Implementar ServerLifecycleService y PortAllocator**
  Creación de estructura en disco (`data/servers/<id>/`), auto-creación de `eula.txt`, verificación de disponibilidad de puertos socket.
- [ ] **Step 5: Ejecutar test y verificar éxito**
  Run: `npx vitest run tests/servers/`
- [ ] **Step 6: Commit**
  ```bash
  git add src/servers/ tests/servers/
  git commit -m "feat(servers): implementar gestion de instancias, parsing de propiedades y motd"
  ```

---

### Task 4: Motor de Diagnóstico Inteligente de Crashes (`src/process-supervisor/crash-analyzer`)

**Files:**
- Create: `src/process-supervisor/crash-analyzer/models/crash-report.ts`
- Create: `src/process-supervisor/crash-analyzer/crash-rules.ts`
- Create: `src/process-supervisor/crash-analyzer/crash-analyzer.ts`
- Test: `tests/process-supervisor/crash-analyzer.test.ts`

**Interfaces:**
- Produces:
  - `CrashAnalyzer.analyze(logChunk: string): DiagnosticResult | null`
  - Reglas de detección: Java mismatch, Client-side mod on server, OutOfMemory, Missing dependency, Corrupted world.

- [ ] **Step 1: Escribir tests con logs de crash reales de Minecraft**
  Probar error `UnsupportedClassVersionError` (Java incorrecto), error `java.lang.OutOfMemoryError`, y mod de cliente como `rubidium` o `sodium` en servidor dedicado.
- [ ] **Step 2: Ejecutar test y verificar fallo**
  Run: `npx vitest run tests/process-supervisor/crash-analyzer.test.ts`
- [ ] **Step 3: Implementar CrashRules y CrashAnalyzer**
  Patrones Regex de alta precisión, títulos en español, explicaciones amigables y acciones recomendadas automáticas.
- [ ] **Step 4: Ejecutar test y comprobar que pasan**
  Run: `npx vitest run tests/process-supervisor/crash-analyzer.test.ts`
- [ ] **Step 5: Commit**
  ```bash
  git add src/process-supervisor/crash-analyzer/ tests/process-supervisor/crash-analyzer.test.ts
  git commit -m "feat(diagnostics): implementar motor de diagnostico automatico de crashes"
  ```

---

### Task 5: Supervisor de Procesos y Terminal Interactiva (`src/process-supervisor`)

**Files:**
- Create: `src/process-supervisor/models/process-state.ts`
- Create: `src/process-supervisor/services/console-buffer.ts`
- Create: `src/process-supervisor/services/process-runner.ts`
- Create: `src/process-supervisor/services/minecraft-ping.ts`
- Test: `tests/process-supervisor/process-runner.test.ts`

**Interfaces:**
- Produces:
  - `ProcessRunner.start(instance: ServerInstance): Promise<void>`
  - `ProcessRunner.stop(instanceId: string): Promise<void>`
  - `ProcessRunner.sendCommand(instanceId: string, command: string): void`
  - `ProcessRunner.getBuffer(instanceId: string): string[]`
  - Eventos de EventEmitter: `console-line`, `status-change`, `crash-detected`.

- [ ] **Step 1: Escribir tests para ProcessRunner y ConsoleBuffer**
  Buffer circular de 2000 líneas para memoria acotada. Mockear `child_process.spawn`.
- [ ] **Step 2: Ejecutar test y verificar fallo**
- [ ] **Step 3: Implementar ConsoleBuffer y ProcessRunner**
  Manejo limpio de pipes stdin/stdout, terminación elegante con comando `/stop` y timeout de seguridad de 15s antes de forzar `kill` mediante `tree-kill` (en Windows) o Process Groups (en Linux), evitando procesos Java huérfanos que retengan puertos o bloqueen `session.lock`. Recolección de métricas de proceso vía `pidusage`.
- [ ] **Step 4: Implementar MinecraftPing y Parser de Eventos de Jugadores**
  Lectura ligera de estado (SLP) combinada con parser regex sobre stdout (`joined the game` / `left the game`) para lista exacta de jugadores conectados en tiempo real.
- [ ] **Step 5: Ejecutar test y verificar éxito**
  Run: `npx vitest run tests/process-supervisor/`
- [ ] **Step 6: Commit**
  ```bash
  git add src/process-supervisor/ tests/process-supervisor/
  git commit -m "feat(process-supervisor): implementar ejecucion de servidores, buffer de consola y ping"
  ```

---

### Task 6: Catálogo de Contenidos y Descarga de Modpacks/Plugins (`src/content-catalog`)

**Files:**
- Create: `src/content-catalog/models/catalog-item.ts`
- Create: `src/content-catalog/providers/content-provider.interface.ts`
- Create: `src/content-catalog/providers/modrinth-provider.ts`
- Create: `src/content-catalog/providers/papermc-provider.ts`
- Create: `src/content-catalog/providers/curseforge-provider.ts`
- Create: `src/content-catalog/services/content-installer.ts`
- Test: `tests/content-catalog/modrinth-provider.test.ts`
- Test: `tests/content-catalog/papermc-provider.test.ts`
- Test: `tests/content-catalog/curseforge-provider.test.ts`

**Interfaces:**
- Produces:
  - `IContentProvider` (search, getVersions, download)
  - `ModrinthProvider`: Búsqueda de mods, plugins, modpacks y datapacks compatibles con versión y loader (activo por defecto).
  - `PaperMcProvider`: Obtención de jars oficiales de Paper, Purpur y Velocity (activo por defecto).
  - `CurseForgeProvider`: Habilitado de forma opcional si `CURSEFORGE_API_KEY` está presente.
  - `ContentInstaller`: Colocación adecuada en `mods/`, `plugins/`, `datapacks/` o raíz.

- [ ] **Step 1: Escribir tests unitarios mockeando fetch HTTP para Modrinth y PaperMC**
- [ ] **Step 2: Ejecutar test y verificar fallo**
- [ ] **Step 3: Implementar ModrinthProvider, PaperMcProvider y CurseForgeProvider**
  Endpoints oficiales de Modrinth v2 (`/v2/search`, `/v2/project/{id}/version`) y PaperMC API v2 (`/v2/projects/paper/version_group/...`). CurseForgeProvider maneja la presencia/ausencia de `CURSEFORGE_API_KEY` de forma segura.
- [ ] **Step 4: Implementar ContentInstaller**
  Descarga con stream a archivo temporal, verificación de integridad y traslado atómico al destino.
- [ ] **Step 5: Ejecutar test y verificar éxito**
  Run: `npx vitest run tests/content-catalog/`
- [ ] **Step 6: Commit**
  ```bash
  git add src/content-catalog/ tests/content-catalog/
  git commit -m "feat(content-catalog): implementar proveedores modrinth y papermc e instalador de contenido"
  ```

---

### Task 7: Módulo de Autenticación, Roles y Base de Datos (`src/auth-identity`)

**Files:**
- Create: `src/auth-identity/models/user.ts`
- Create: `src/auth-identity/database/db-client.ts`
- Create: `src/auth-identity/repositories/user-repository.ts`
- Create: `src/auth-identity/services/auth-service.ts`
- Test: `tests/auth-identity/auth-service.test.ts`

**Interfaces:**
- Produces:
  - `User` (`id`, `username`, `passwordHash`, `role: ADMIN | OPERATOR | VIEWER`)
  - `AuthService.login(username, password)`
  - `AuthService.registerInitialAdmin(username, password)`
  - `AuthService.verifyToken(token)`

- [ ] **Step 1: Escribir tests unitarios para autenticación y roles**
- [ ] **Step 2: Ejecutar test y verificar fallo**
- [ ] **Step 3: Implementar SQLite DbClient y UserRepository**
  Creación automática de tabla `users` e inicialización de usuario Admin por defecto (`admin` / `admin` o vía variables de entorno) con flag `mustChangePassword: true` que fuerza cambio obligatorio de credenciales en el primer login. Hashing seguro con `node:crypto` (scrypt / PBKDF2).
- [ ] **Step 4: Implementar AuthService**
- [ ] **Step 5: Ejecutar test y verificar éxito**
  Run: `npx vitest run tests/auth-identity/`
- [ ] **Step 6: Commit**
  ```bash
  git add src/auth-identity/ tests/auth-identity/
  git commit -m "feat(auth): implementar persistencia sqlite, roles y autenticacion"
  ```

---

### Task 8: Servidor Fastify REST & WebSocket API (`src/delivery`)

**Files:**
- Create: `src/delivery/http/server.ts`
- Create: `src/delivery/http/routes/auth-routes.ts`
- Create: `src/delivery/http/routes/server-routes.ts`
- Create: `src/delivery/http/routes/catalog-routes.ts`
- Create: `src/delivery/http/routes/java-routes.ts`
- Create: `src/delivery/websocket/console-socket.ts`
- Test: `tests/delivery/server-api.test.ts`

**Interfaces:**
- Produces:
  - API HTTP en `http://0.0.0.0:3000/api/*`
  - WebSocket en `ws://0.0.0.0:3000/ws/servers/:id/console`

- [ ] **Step 1: Escribir test de integración usando `fastify.inject()`**
  Comprobar login, listar servidores, crear servidor y recibir respuesta JSON.
- [ ] **Step 2: Ejecutar test y verificar fallo**
- [ ] **Step 3: Implementar rutas Fastify y middleware de autenticación por roles**
- [ ] **Step 4: Implementar WebSocket console-socket**
  Reenviar en tiempo real los eventos de salida del proceso al cliente y recibir comandos desde el cliente hacia el stdin del servidor.
- [ ] **Step 5: Ejecutar test y verificar éxito**
  Run: `npx vitest run tests/delivery/`
- [ ] **Step 6: Commit**
  ```bash
  git add src/delivery/ tests/delivery/
  git commit -m "feat(delivery): implementar api rest fastify y streaming websocket de consola"
  ```

---

### Task 9: Scaffolding del Panel Web React (SPA) con Tailwind y Lucide (`src/delivery/web-dashboard`)

**Files:**
- Create: `src/delivery/web-dashboard/package.json`
- Create: `src/delivery/web-dashboard/vite.config.ts`
- Create: `src/delivery/web-dashboard/index.html`
- Create: `src/delivery/web-dashboard/src/App.tsx`
- Create: `src/delivery/web-dashboard/src/index.css`
- Create: `src/delivery/web-dashboard/src/components/Sidebar.tsx`
- Create: `src/delivery/web-dashboard/src/components/Header.tsx`
- Create: `src/delivery/web-dashboard/src/components/CommandPalette.tsx`

**Interfaces:**
- Produces:
  - Interfaz web moderna estilo NebulaX Studio (Dark Theme industrial, Slate/Zinc con acentos Emerald/Amber/Cyan).
  - Componente Command Palette accesible con `Ctrl+K`.

- [ ] **Step 1: Configurar Vite + React 19 + Tailwind CSS**
- [ ] **Step 2: Crear App layout con Sidebar, Header y CommandPalette (`Ctrl+K`)**
- [ ] **Step 3: Integrar cliente API REST y estado de sesión**
- [ ] **Step 4: Probar compilación del frontend con `npm run build`**
- [ ] **Step 5: Commit**
  ```bash
  git add src/delivery/web-dashboard/
  git commit -m "feat(ui): scaffolding del panel web react con tailwind y command palette"
  ```

---

### Task 10: Vistas de Servidores, Wizard de Creación en 3 Clics y Mission Control

**Files:**
- Create: `src/delivery/web-dashboard/src/pages/Dashboard.tsx`
- Create: `src/delivery/web-dashboard/src/pages/CreateServerWizard.tsx`
- Create: `src/delivery/web-dashboard/src/components/ServerCard.tsx`
- Create: `src/delivery/web-dashboard/src/components/MetricSparkline.tsx`

**Interfaces:**
- Produces:
  - Lista de instancias con estado en vivo y métricas Sparkline.
  - Asistente de 3 clics para desplegar servidores (Vanilla, Paper, Fabric).

- [ ] **Step 1: Implementar ServerCard con estados (Online, Offline, Booting, Crashed)**
- [ ] **Step 2: Implementar CreateServerWizard con auto-detección de versiones de Minecraft y Java**
- [ ] **Step 3: Conectar con `/api/servers` para creación en tiempo real**
- [ ] **Step 4: Probar flujo en navegador y verificar build**
- [ ] **Step 5: Commit**
  ```bash
  git add src/delivery/web-dashboard/src/pages/ src/delivery/web-dashboard/src/components/
  git commit -m "feat(ui): implementar dashboard mission control y wizard de creacion de servidores"
  ```

---

### Task 11: Vista de Detalle, Consola xterm.js y Gestor de Jugadores con Skins

**Files:**
- Create: `src/delivery/web-dashboard/src/pages/ServerDetail.tsx`
- Create: `src/delivery/web-dashboard/src/components/TerminalView.tsx`
- Create: `src/delivery/web-dashboard/src/components/PlayerList.tsx`
- Create: `src/delivery/web-dashboard/src/components/CrashAlertBanner.tsx`

**Interfaces:**
- Produces:
  - Terminal interactiva completa con colores ANSI y filtros de logs.
  - Banner interactivo de diagnóstico de crashes cuando ocurre un fallo.
  - Tarjetas de jugadores conectados con avatar renderizado y acciones rápidas (OP, Kick, Ban).

- [ ] **Step 1: Integrar `@xterm/xterm` y `@xterm/addon-fit` con el WebSocket de consola**
- [ ] **Step 2: Implementar CrashAlertBanner que resalta el diagnóstico devuelto por el backend**
- [ ] **Step 3: Implementar PlayerList con avatares de Minotar (`https://minotar.net/avatar/{player}/64`)**
- [ ] **Step 4: Probar visualización y verificar build**
- [ ] **Step 5: Commit**
  ```bash
  git add src/delivery/web-dashboard/src/
  git commit -m "feat(ui): implementar terminal interactiva xterm, diagnostico visual y jugadores con skins"
  ```

---

### Task 12: Catálogo Integrado Prism (Mods, Plugins, Modpacks) y 1-Click Install

**Files:**
- Create: `src/delivery/web-dashboard/src/pages/CatalogExplorer.tsx`
- Create: `src/delivery/web-dashboard/src/components/ContentCard.tsx`
- Create: `src/delivery/web-dashboard/src/components/ContentInstallModal.tsx`

**Interfaces:**
- Produces:
  - Buscador visual conectado a Modrinth y PaperMC.
  - Filtros por categoría (Mods, Plugins, Datapacks, Modpacks), versión de Minecraft y Loader.
  - Botón de instalación en 1-clic que descarga y ubica el archivo en el servidor seleccionado.

- [ ] **Step 1: Implementar CatalogExplorer con input de búsqueda y debounce**
- [ ] **Step 2: Implementar ContentCard con tags, autor, descargas e icono**
- [ ] **Step 3: Conectar acción de instalación con feedback visual (barra de progreso y notificación toast)**
- [ ] **Step 4: Verificar build**
- [ ] **Step 5: Commit**
  ```bash
  git add src/delivery/web-dashboard/src/
  git commit -m "feat(ui): implementar explorador de catalogo de mods y plugins con instalador 1-clic"
  ```

---

### Task 13: Editor Visual de `server.properties` y Diseñador de MOTD en Vivo

**Files:**
- Create: `src/delivery/web-dashboard/src/pages/ServerConfig.tsx`
- Create: `src/delivery/web-dashboard/src/components/MotdDesigner.tsx`
- Create: `src/delivery/web-dashboard/src/components/MinecraftServerBadge.tsx`

**Interfaces:**
- Produces:
  - Interfaz de configuración intuitiva con switches para PvP, spawn-protection, max-players, etc.
  - Diseñador de MOTD con botones de formato de color y previsualización exacta de la lista de servidores de Minecraft.

- [ ] **Step 1: Implementar formulario visual con categorías (General, Gameplay, Rendimiento, Seguridad)**
- [ ] **Step 2: Implementar MotdDesigner con soporte de códigos de color y preview instantáneo**
- [ ] **Step 3: Conectar guardado con la API `/api/servers/:id/properties`**
- [ ] **Step 4: Verificar build**
- [ ] **Step 5: Commit**
  ```bash
  git add src/delivery/web-dashboard/src/
  git commit -m "feat(ui): implementar editor visual de propiedades y diseñador de motd en vivo"
  ```

---

### Task 14: Micro-Servidor SFTP Embebido para Antigravity IDE (`src/delivery/sftp`)

**Files:**
- Create: `src/delivery/sftp/sftp-server.ts`
- Create: `src/delivery/sftp/sftp-authenticator.ts`
- Create: `src/delivery/sftp/virtual-fs-bridge.ts`
- Test: `tests/delivery/sftp-server.test.ts`

**Interfaces:**
- Produces:
  - Servidor SFTP en puerto `2022` que valida credenciales de usuario contra `auth-identity`.
  - Enjaulado virtual (`chroot`) que confina al usuario dentro de `data/servers/<id>` impidiendo fugas de directorio.
  - Soporte completo para lectura, escritura, creación y borrado de archivos desde extensiones SFTP de Antigravity IDE / VS Code.

- [ ] **Step 1: Escribir tests para autenticación SFTP y restricción de path traversal**
  Verificar que usuarios inválidos son rechazados y que intentos de `../` fuera de la carpeta de servidores se bloquean.
- [ ] **Step 2: Ejecutar test y verificar fallo**
  Run: `npx vitest run tests/delivery/sftp-server.test.ts`
- [ ] **Step 3: Implementar SftpAuthenticator y VirtualFsBridge**
  Mapear operaciones POSIX de `ssh2` a operaciones seguras de Node.js `fs/promises`.
- [ ] **Step 4: Implementar SftpServer integrado en el ciclo de vida del backend**
  Inicializar host key automáticamente (`data/sftp_host_key`) y arrancar en puerto configurable.
- [ ] **Step 5: Ejecutar test y verificar éxito**
  Run: `npx vitest run tests/delivery/sftp-server.test.ts`
- [ ] **Step 6: Commit**
  ```bash
  git add src/delivery/sftp/ tests/delivery/sftp-server.test.ts
  git commit -m "feat(sftp): implementar micro-servidor sftp embebido para antigravity ide"
  ```

---

### Task 15: Aplicación de Escritorio Electron con System Tray e Integración IDE (`src/delivery/desktop`)

**Files:**
- Create: `src/delivery/desktop/main.ts`
- Create: `src/delivery/desktop/tray.ts`
- Create: `src/delivery/desktop/notifications.ts`
- Create: `src/delivery/desktop/ide-bridge.ts`
- Create: `src/delivery/desktop/preload.ts`
- Modify: `src/delivery/web-dashboard/src/components/Header.tsx`
- Modify: `src/delivery/web-dashboard/src/pages/ServerDetail.tsx`

**Interfaces:**
- Produces:
  - Ventana nativa Electron de PismController con soporte offline/online.
  - Bandeja del sistema (System Tray) con menú contextual (Abrir, Estado de Servidores, Salir).
  - Notificaciones nativas del sistema operativo en caso de crash o alerta de servidor.
  - Botón "Abrir en Antigravity IDE": en local ejecuta la apertura directa de la carpeta del servidor en Antigravity IDE; en remoto copia o configura la cadena de conexión SFTP.

- [ ] **Step 1: Configurar proceso principal de Electron en TypeScript**
  Cargar la SPA React construida o el servidor dev en tiempo de desarrollo.
- [ ] **Step 2: Implementar System Tray y alertas de escritorio**
  Minimizar a la bandeja al cerrar la ventana en lugar de terminar la aplicación.
- [ ] **Step 3: Implementar IdeBridge**
  Detección del ejecutable `antigravity` / protocolo `antigravity://file/...` y comando para abrir directorios de servidores locales.
- [ ] **Step 4: Integrar botón "Abrir en Antigravity IDE" en ServerDetail**
- [ ] **Step 5: Probar ejecución de Electron**
  Run: `npm run dev:desktop`
- [ ] **Step 6: Commit**
  ```bash
  git add src/delivery/desktop/ src/delivery/web-dashboard/
  git commit -m "feat(desktop): implementar aplicacion de escritorio electron e integracion con antigravity ide"
  ```

---

### Task 16: Verificación End-to-End y Script de Despliegue para Oracle Cloud (OCI)

**Files:**
- Create: `scripts/deploy-oci.sh`
- Create: `scripts/pismcontroller.service`
- Modify: `README.md`

**Interfaces:**
- Produces:
  - Verificación de la suite completa de pruebas (`npm test`).
  - Build de producción completo (`npm run build`).
  - Script automatizado para instalación y configuración del servicio `systemd` en Linux Ubuntu/Debian en Oracle Cloud (con puertos 3000, 25565 y 2022).

- [ ] **Step 1: Ejecutar suite de pruebas completa**
  Run: `npm test`
  Expected: Todos los tests pasan.
- [ ] **Step 2: Ejecutar build de producción unificado**
  Run: `npm run build`
  Expected: Compilación exitosa del backend y frontend a `dist/`.
- [ ] **Step 3: Crear script de despliegue para Oracle Cloud `scripts/deploy-oci.sh` y unidad `systemd`**
- [ ] **Step 4: Documentar comandos de despliegue en README.md**
- [ ] **Step 5: Commit final**
  ```bash
  git add scripts/ README.md
  git commit -m "chore(deploy): agregar scripts de despliegue para oracle cloud y servicio systemd"
  ```
