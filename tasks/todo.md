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

- [ ] Task 4: Motor de Diagnóstico Inteligente de Crashes (`src/process-supervisor/crash-analyzer`)
  - Acceptance: Detección precisa de OutOfMemory, Java incorrecto y mods de cliente en servidor.
  - Verify: `npx vitest run tests/process-supervisor/crash-analyzer.test.ts` pasa.
  - Files: `src/process-supervisor/crash-analyzer/*`, `tests/process-supervisor/crash-analyzer.test.ts`

- [ ] Task 5: Supervisor de Procesos y Terminal Interactiva (`src/process-supervisor`)
  - Acceptance: Spawn de procesos Java, terminación en árbol (`tree-kill`), timeout de apagado seguro (15s), buffer circular de consola, stdin interactivo, sincronización de jugadores y métricas.
  - Verify: `npx vitest run tests/process-supervisor/` pasa.
  - Files: `src/process-supervisor/*`, `tests/process-supervisor/*`

- [ ] Task 6: Catálogo de Contenidos y Descarga de Modpacks/Plugins (`src/content-catalog`)
  - Acceptance: Proveedores Modrinth v2 y PaperMC activos por defecto, CurseForge opcional vía `CURSEFORGE_API_KEY`, resolución e instalación en `mods/`/`plugins/`.
  - Verify: `npx vitest run tests/content-catalog/` pasa.
  - Files: `src/content-catalog/*`, `tests/content-catalog/*`

- [ ] Task 7: Módulo de Autenticación, Roles y Base de Datos (`src/auth-identity`)
  - Acceptance: SQLite con `better-sqlite3`, hashing scrypt, roles Admin/Operator/Viewer, JWT y credenciales por defecto con forzado de cambio de contraseña en primer login.
  - Verify: `npx vitest run tests/auth-identity/` pasa.
  - Files: `src/auth-identity/*`, `tests/auth-identity/*`

- [ ] Task 8: Servidor Fastify REST & WebSocket API (`src/delivery`)
  - Acceptance: Endpoints REST y WebSocket `/ws/servers/:id/console` con autenticación.
  - Verify: `npx vitest run tests/delivery/` pasa.
  - Files: `src/delivery/http/*`, `src/delivery/websocket/*`, `tests/delivery/*`

- [ ] Task 9: Scaffolding del Panel Web React (SPA) con Tailwind y Lucide (`src/delivery/web-dashboard`)
  - Acceptance: Layout SPA con Dark Theme NebulaX Studio, Header, Sidebar y Command Palette (`Ctrl+K`).
  - Verify: `npm run build` en web-dashboard compila sin errores.
  - Files: `src/delivery/web-dashboard/*`

- [ ] Task 10: Vistas de Servidores, Wizard de Creación en 3 Clics y Mission Control
  - Acceptance: ServerCards reactivas, sparklines de métricas y wizard para crear instancias.
  - Verify: Componentes renderizan y crean servidores vía API.
  - Files: `src/delivery/web-dashboard/src/pages/*`, `src/delivery/web-dashboard/src/components/*`

- [ ] Task 11: Vista de Detalle, Consola xterm.js y Gestor de Jugadores con Skins
  - Acceptance: Emulación xterm.js ANSI, alertas de crash automáticas y avatares de jugadores conectados.
  - Verify: Consola interactiva conectada a WebSocket.
  - Files: `src/delivery/web-dashboard/src/components/*`

- [ ] Task 12: Catálogo Integrado Prism (Mods, Plugins, Modpacks) y 1-Click Install
  - Acceptance: Búsqueda en vivo en Modrinth/PaperMC y botón de instalación en servidor.
  - Verify: Descarga e instalación reflejada en el servidor.
  - Files: `src/delivery/web-dashboard/src/pages/CatalogExplorer.tsx`, `components/ContentCard.tsx`

- [ ] Task 13: Editor Visual de `server.properties` y Diseñador de MOTD en Vivo
  - Acceptance: Formulario visual de propiedades y previsualización de tarjeta multijugador.
  - Verify: Modificaciones se guardan y reflejan en `server.properties`.
  - Files: `src/delivery/web-dashboard/src/pages/ServerConfig.tsx`, `components/MotdDesigner.tsx`

- [ ] Task 14: Micro-Servidor SFTP Embebido para Antigravity IDE (`src/delivery/sftp`)
  - Acceptance: Servidor SFTP RFC 4253 en puerto 2022 con autenticación de usuarios y chroot por servidor seguro sin path traversal.
  - Verify: `npx vitest run tests/delivery/sftp-server.test.ts` pasa.
  - Files: `src/delivery/sftp/*`, `tests/delivery/sftp-server.test.ts`

- [ ] Task 15: Aplicación de Escritorio Electron con System Tray e Integración IDE (`src/delivery/desktop`)
  - Acceptance: Ventana nativa Electron, System Tray, notificaciones nativas de crash y botón "Abrir en Antigravity IDE".
  - Verify: Electron arranca y botón ejecuta apertura de carpeta o copia de conexión SFTP.
  - Files: `src/delivery/desktop/*`, `src/delivery/web-dashboard/src/components/*`

- [ ] Task 16: Verificación End-to-End y Script de Despliegue para Oracle Cloud (OCI)
  - Acceptance: Suite de tests completa al 100%, build de producción unificado (web + desktop), script de despliegue OCI y servicio `systemd` (puertos 3000, 25565 y 2022).
  - Verify: `npm test` && `npm run build` pasan.
  - Files: `scripts/deploy-oci.sh`, `scripts/pismcontroller.service`, `README.md`
