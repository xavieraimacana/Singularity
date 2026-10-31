# Plan de Implementación: Trailer Oficial a Pantalla Completa con Cámara 3D (Singularity Launch Film)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Producir un video promocional de 56 segundos para Singularity a pantalla completa auténtica (1920×1080) con efectos de cámara 3D (ensamblaje isométrico, enfoque macro en mods, y réplica viva de Antigravity IDE / VS Code), con un tono honesto y accesible.

**Architecture:** Cada escena es una sub-composición HTML autónoma gobernada por GSAP 3 con animaciones deterministas (`fromTo`), transformaciones CSS 3D (`perspective`, `rotateX`, `rotateY`, `translateZ`) y tags `data-layout-ignore` para métricas UI. Se orquestan en `launch-video/index.html` y se compilan a MP4 1080p con HyperFrames.

**Tech Stack:** HyperFrames v0.8+, GSAP 3.15, HTML5/CSS3 3D Transforms, Chromium Headless GPU, FFmpeg.

## Global Constraints
- Resolución estricta: 1920×1080 landscape a 30fps.
- Determinismo: Timelines de GSAP pausados con `seek(0)`. Prohibido el uso de `transition` CSS o animaciones sobre `letterSpacing`.
- Tipografía legible: Mínimo 28px para texto de lectura o marcado explícito con `data-layout-ignore` en elementos de interfaz de usuario.
- Contraste WCAG AA: Mínimo 4.5:1 en todos los textos sobre fondos oscuros.
- Tono: Cero pretensiones. Enfocado en resolver problemas reales (Java 25, modpacks en 1 clic, SFTP).
- Git: Commits en español usando Conventional Commits (`feat(video): ...`, `docs(readme): ...`).

---

### Task 1: Escena 01 - Onboarding en Terminal & Login a Pantalla Completa

**Files:**
- Create: `launch-video/compositions/scene-01-onboarding-login.html`

- [ ] **Paso 1: Estructurar la ventana completa con controles de ventana (Windows chrome)**
- [ ] **Paso 2: Maquetar la terminal inicial con `git clone` y arranque**
- [ ] **Paso 3: Maquetar la pantalla completa de login (`LoginPage.tsx`) con formulario centrado y fondo estelar**
- [ ] **Paso 4: Animar tecleo de credenciales `admin@singularity.local` y clic de acceso concedido**
- [ ] **Paso 5: Probar y verificar con `npx hyperframes check`**

---

### Task 2: Escena 02 - Ensamblaje Isométrico 3D & Asistente de Creación de Servidor

**Files:**
- Create: `launch-video/compositions/scene-02-assembly-wizard.html`

- [ ] **Paso 1: Diseñar el contenedor 3D (`perspective: 1400px; transform-style: preserve-3d`)**
- [ ] **Paso 2: Maquetar las capas de profundidad del Dashboard: fondo, Sidebar izquierdo y Header superior**
- [ ] **Paso 3: Programar la animación de vuelo de cámara (swoop de `rotateX: 16deg, rotateY: -12deg` a `0deg`)**
- [ ] **Paso 4: Maquetar el modal de `CreateServerWizard` (Fabric 1.21.4, Adoptium JDK 25 auto-detectado, slider de 4 GB RAM)**
- [ ] **Paso 5: Animar el clic de creación y arranque hacia la vista de servidor**

---

### Task 3: Escena 03 - Vista de Servidor & Consola VT100 en Tiempo Real

**Files:**
- Create: `launch-video/compositions/scene-03-console-live.html`

- [ ] **Paso 1: Maquetar la cabecera del servidor (`ServerDetailPage.tsx`) con nombre, selector de pestañas e indicadores de estado**
- [ ] **Paso 2: Maquetar el área de terminal ANSI `@xterm` completa con ventana de logs estilizada**
- [ ] **Paso 3: Animar la salida secuencial de logs reales de Fabric 1.21.4**
- [ ] **Paso 4: Animar el encendido del monitor verde `20.0 TPS (Estable)` y uso de RAM `1.8 / 4.0 GB`**

---

### Task 4: Escena 04 - Foco Principal en Catálogo Prism (Mods, Plugins y Modpacks)

**Files:**
- Create: `launch-video/compositions/scene-04-prism-catalog.html`

- [ ] **Paso 1: Maquetar la vista completa del Catálogo Prism (`CatalogExplorer.tsx`) con pestañas `Modpacks`, `Mods`, `Plugins`**
- [ ] **Paso 2: Incluir filtros de plataforma (Modrinth y CurseForge) y buscador en vivo**
- [ ] **Paso 3: Animar cámara macro (zoom & tilt) enfocando la tarjeta de *"Better MC"* (184 mods)**
- [ ] **Paso 4: Maquetar modal de instalación con resolución automática de dependencias y barra de descarga en vivo**
- [ ] **Paso 5: Mostrar la pestaña de mods instalados con switches activos de activación/desactivación**

---

### Task 5: Escena 05 - Explorador de Archivos & Réplica Viva de Antigravity IDE / VS Code

**Files:**
- Create: `launch-video/compositions/scene-05-antigravity-ide.html`

- [ ] **Paso 1: Maquetar la transición desde el botón *"Abrir en Antigravity IDE"* con efecto *Camera Dive***
- [ ] **Paso 2: Construir la interfaz fidedigna de Antigravity IDE / VS Code (Activity Bar, Explorer lateral con conexión `SFTP: 127.0.0.1:2022`)**
- [ ] **Paso 3: Maquetar el editor central con números de línea, resaltado de sintaxis y pestaña `server.properties`**
- [ ] **Paso 4: Animar tecleo en vivo de `motd` y `difficulty=hard`**
- [ ] **Paso 5: Simular `Ctrl+S` con destello de guardado y toast de confirmación `SFTP Sync en vivo (puerto 2022)`**

---

### Task 6: Escena 06 - Suite Desktop, System Tray & Conexión Remota

**Files:**
- Create: `launch-video/compositions/scene-06-desktop-tray-multihost.html`

- [ ] **Paso 1: Animar minimizado de la aplicación hacia el escritorio de Windows con barra de tareas**
- [ ] **Paso 2: Mostrar clic derecho en el icono del System Tray con menú contextual interactivo**
- [ ] **Paso 3: Restaurar la aplicación y conmutar del nodo `Local PC` a `VPS Oracle Cloud` con indicador de 18ms**

---

### Task 7: Escena 07 - Cierre Limpio, Práctico y Honesto

**Files:**
- Create: `launch-video/compositions/scene-07-honest-closing.html`

- [ ] **Paso 1: Maquetar el logo central de Singularity con respiración sutil**
- [ ] **Paso 2: Presentar los tres pilares de valor prácticos (Java automático, mods en 1 clic, edición IDE)**
- [ ] **Paso 3: Mostrar tarjeta de GitHub con llamado a la acción directo y honesto**

---

### Task 8: Integración de la Línea de Tiempo Maestra & Renderizado Final

**Files:**
- Modify: `launch-video/index.html`
- Render: `launch-video/renders/singularity-launch.mp4`

- [ ] **Paso 1: Reemplazar las sub-composiciones en `launch-video/index.html` con las 7 nuevas escenas calibradas a 56s**
- [ ] **Paso 2: Ejecutar auditoría completa con `npx hyperframes check` (0 errores de lint, runtime, contrast y layout)**
- [ ] **Paso 3: Renderizar a 1080p MP4 con aceleración GPU**
- [ ] **Paso 4: Extraer nuevo frame póster y GIF animado de vista previa para `README.md`**
- [ ] **Paso 5: Subir el video a la Release oficial de GitHub `v0.1.0-alpha` con `gh release upload --clobber`**
- [ ] **Paso 6: Ejecutar suite de pruebas Vitest (`npm test`) y verificar 134/134 passing tests**
- [ ] **Paso 7: Realizar commit y push final a `main`**
