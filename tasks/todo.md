# Todo: Singularity

- [x] Task 1: Scaffolding del Proyecto y Entorno de Desarrollo
  - Acceptance: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `npm test` funcionando.
  - Verify: `npm test` corre sin errores.
  - Files: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`

- [x] Task 2: Módulo Java Manager (`src/java-manager`)
  - Acceptance: Detección de Java 8 a 25, verificación de compatibilidad con MC y generación de Aikar's Flags.
  - Verify: `npx vitest run tests/java-manager/` pasa.
  - Files: `src/java-manager/*`, `tests/java-manager/*`

- [x] Task 3: Dominio de Instancias de Servidor y Editor de Propiedades (`src/servers`)
  - Acceptance: Creación de instancias, parsing/serialización de `server.properties`, EULA y cálculo de puertos.
  - Verify: `npx vitest run tests/servers/` pasa.
  - Files: `src/servers/*`, `tests/servers/*`

- [x] Task 4: Motor de Diagnóstico Inteligente de Crashes (`src/process-supervisor/crash-analyzer`)
  - Acceptance: Detección precisa de OutOfMemory, Java incorrecto y mods de cliente en servidor.
  - Verify: `npx vitest run tests/process-supervisor/crash-analyzer.test.ts` pasa.
  - Files: `src/process-supervisor/crash-analyzer/*`, `tests/process-supervisor/crash-analyzer.test.ts`

- [x] Task 5: Supervisor de Procesos y Terminal Interactiva (`src/process-supervisor`)
  - Acceptance: Spawn de procesos Java, terminación en árbol (`tree-kill`), timeout de apagado seguro (15s), buffer circular de consola, stdin interactivo, sincronización de jugadores y métricas.
  - Verify: `npx vitest run tests/process-supervisor/` pasa.
  - Files: `src/process-supervisor/*`, `tests/process-supervisor/*`

- [x] Task 6: Catálogo de Contenidos y Descarga de Modpacks/Plugins (`src/content-catalog`)
  - Acceptance: Proveedores Modrinth v2 y PaperMC activos por defecto, CurseForge opcional vía `CURSEFORGE_API_KEY`, resolución e instalación en `mods/`/`plugins/`.
  - Verify: `npx vitest run tests/content-catalog/` pasa.
  - Files: `src/content-catalog/*`, `tests/content-catalog/*`

- [x] Task 7: Módulo de Autenticación, Roles y Base de Datos (`src/auth-identity`)
  - Acceptance: SQLite nativo (`node:sqlite` DatabaseSync), hashing scrypt seguro, roles Admin/Operator/Viewer, JWT y credenciales por defecto (`admin`/`singularity`) con forzado de cambio de contraseña en primer login.
  - Verify: `npx vitest run tests/auth-identity/` pasa.
  - Files: `src/auth-identity/*`, `tests/auth-identity/*`

- [x] Task 8: Servidor Fastify REST & WebSocket API (`src/delivery`)
  - Acceptance: Endpoints REST y WebSocket `/ws/servers/:id/console` con autenticación.
  - Verify: `npx vitest run tests/delivery/` pasa.
  - Files: `src/delivery/http/*`, `src/delivery/websocket/*`, `tests/delivery/*`

- [x] Task 9: Scaffolding del Panel Web React (SPA) con Tailwind y Lucide (`src/delivery/web-dashboard`)
  - Acceptance: Layout SPA con Dark Theme NebulaX Studio, Header, Sidebar y Command Palette (`Ctrl+K`).
  - Verify: `npm run build` en web-dashboard compila sin errores.
  - Files: `src/delivery/web-dashboard/*`

- [x] Task 10: Vistas de Servidores, Wizard de Creación en 3 Clics y Mission Control
  - Acceptance: ServerCards reactivas, sparklines de métricas y wizard para crear instancias.
  - Verify: Componentes renderizan y crean servidores vía API.
  - Files: `src/delivery/web-dashboard/src/pages/Dashboard.tsx`, `CreateServerWizard.tsx`, `ServerCard.tsx`, `MetricSparkline.tsx`

- [x] Task 11: Vista de Detalle, Consola xterm.js y Gestor de Jugadores con Skins
  - Acceptance: Consola WebSocket bidireccional con xterm.js, comandos rápidos y lista de jugadores con avatares Crafatar.
  - Verify: Terminal interactiva recibe y envía comandos fluidamente.
  - Files: `src/delivery/web-dashboard/src/pages/ServerDetailPage.tsx`, `ConsoleTerminal.tsx`, `PlayerManager.tsx`, `CrashAlertBanner.tsx`

- [x] Task 12: Catálogo Integrado Prism (Mods, Plugins, Modpacks) y 1-Click Install
  - Acceptance: Búsqueda unificada Modrinth/CurseForge/PaperMC, filtros por loader y versión, botón '1-Click Install' con barra de progreso.
  - Verify: Instalación de plugin/mod reflejada en la pestaña del servidor.
  - Files: `src/delivery/web-dashboard/src/pages/ContentCatalogPage.tsx`

- [x] Task 13: Editor Visual de `server.properties` y Diseñador de MOTD en Vivo
  - Acceptance: Toggles para pvp, flight, whitelist, selector de dificultad, editor de MOTD con preview tipográfica Minecraft.
  - Verify: Modificación de propiedades guardada y reflejada en disco.
  - Files: `src/delivery/web-dashboard/src/components/PropertiesEditor.tsx`, `MotdDesigner.tsx`

- [ ] Task 14: Micro-Servidor SFTP Embebido para Antigravity IDE (`src/delivery/sftp`)
  - Acceptance: Servidor SFTP (`ssh2`) en puerto 2022 autenticado con credenciales de Singularity, chroot en `data/servers/`.
  - Verify: Cliente SFTP se conecta, lista archivos y sube/edita archivos.
  - Files: `src/delivery/sftp/*`, `tests/delivery/sftp.test.ts`

- [ ] Task 15: Aplicación de Escritorio Electron con System Tray e Integración IDE (`src/delivery/desktop`)
  - Acceptance: Shell Electron, bandeja del sistema con arranque en segundo plano, botón 'Abrir en Antigravity IDE'.
  - Verify: Ventana Electron empaquetada carga el dashboard web.
  - Files: `src/delivery/desktop/*`

- [ ] Task 16: Verificación End-to-End, Dockerfile/Docker-compose y Despliegue en Oracle Cloud
  - Acceptance: Dockerfile multi-stage ligero con Java 21/17/8, docker-compose.yml para Coolify/CasaOS, script de inicialización y verificación total de la suite de pruebas.
  - Verify: Contenedor levanta en puerto 3000 y 2022.
  - Files: `Dockerfile`, `docker-compose.yml`, `scripts/deploy-oracle.sh`
