# Spec: PismController (Crafty Controller + Prism Launcher Hybrid)

## Objective
**PismController** es una suite de orquestación y administración de servidores de Minecraft que fusiona:
1. **La potencia operativa de Crafty Controller**: Control 24/7 de múltiples servidores independientes, panel web responsive, terminal interactiva en tiempo real (bidireccional con xterm.js), monitoreo de métricas de proceso (CPU, RAM, jugadores conectados, TPS) y gestión de roles y permisos.
2. **La experiencia de usuario de Prism Launcher**: Asistente visual e intuitivo de creación de instancias (selección de versión de Minecraft y loader: Vanilla, Paper, Purpur, Fabric, Forge, NeoForge), gestor integrado de contenidos para buscar e instalar en 1-click **Modpacks** (Modrinth .mrpack / CurseForge zip), **Mods**, **Plugins** y **Datapacks**, con resolución automática de dependencias y detección de la versión de Java apropiada.

---

## Tech Stack

| Componente | Tecnología | Versión / Detalle |
|---|---|---|
| **Runtime** | Node.js | v24.15+ LTS (con soporte para ESM y TypeScript nativo) |
| **Lenguaje** | TypeScript | v5.x (Strict mode habilitado) |
| **Backend Framework** | Fastify | v5.x (Alto rendimiento, bajo overhead HTTP y WebSockets via `@fastify/websocket`) |
| **Persistencia** | SQLite | `better-sqlite3` (Síncrono, ultrarrápido, cero configuración) |
| **Seguridad & Auth** | Argon2 / JWT | `@fastify/jwt` con cookies HTTP-only para sesiones multi-usuario |
| **Procesos & Subprocess** | Node `child_process` / `events` | Wrapper de supervisión con pipes bidireccionales y `pidusage` para métricas |
| **Frontend Framework** | React 19 + Vite | SPA de alto rendimiento |
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
│   │   └── server-repository.ts
│   ├── content-catalog/                # Dominio: Catálogo Prism (Modrinth, CurseForge, PaperMC, Fabric)
│   │   ├── providers/
│   │   │   ├── modrinth-provider.ts
│   │   │   ├── cursfeforge-provider.ts
│   │   │   ├── papermc-provider.ts
│   │   │   └── fabric-provider.ts
│   │   ├── dependency-resolver.ts
│   │   └── installer-service.ts
│   ├── process-supervisor/             # Dominio: Supervisión de procesos Java, I/O terminal y métricas
│   │   ├── process-runner.ts
│   │   ├── console-stream.ts
│   │   ├── crash-detector.ts
│   │   └── metrics-collector.ts
│   └── delivery/                       # Mecanismo de entrega (Delivery Mechanism)
│       ├── http/                       # Rutas Fastify REST
│       │   ├── auth-routes.ts
│       │   ├── server-routes.ts
│       │   ├── catalog-routes.ts
│       │   └── java-routes.ts
│       ├── websocket/                  # Canales en tiempo real (consola y métricas)
│       │   └── console-socket.ts
│       └── web-dashboard/              # Aplicación React (SPA)
│           ├── src/
│           │   ├── components/         # Terminal, Header, ServerCard, CatalogModal
│           │   ├── pages/              # Dashboard, ServerDetail, CatalogExplorer, Settings
│           │   └── services/           # Clientes API REST y WebSocket
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
  - `server-core`: Validación de parser y serializador de `server.properties` y gestión de puertos.
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
4. **Métricas en Vivo**:
   - Visualización de estado (ONLINE/OFFLINE), uso de RAM, CPU y conteo de jugadores.
5. **Multi-usuario Seguro**:
   - Login con contraseña, rol de administrador para crear/borrar servidores y rol de operador/visor para gestionar consola.
