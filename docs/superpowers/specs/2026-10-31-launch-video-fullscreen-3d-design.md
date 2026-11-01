# Especificación de Diseño: Trailer Interactivo a Pantalla Completa con Cámara 3D (Singularity Launch Film)

**Fecha:** 31 de Octubre de 2026  
**Autor:** Antigravity CLI & NebulaX Studio  
**Proyecto:** Singularity (Minecraft Server Orchestrator)  
**Herramienta de Render:** HyperFrames v0.8+ (GSAP + Chromium Headless GPU + FFmpeg)  
**Resolución:** 1920×1080 (1080p 30fps)  
**Duración Objetivo:** 54 - 56 segundos  

---

## 1. Visión y Tono del Video

### Tono de Comunicación
* **Honesto, Práctico y Cercano:** Se eliminan todas las frases pretenciosas (*"el nuevo estándar de la industria"*, *"el orquestador definitivo"*).
* **Propuesta de Valor:** Una solución integral, sólida y sencilla desarrollada por y para la comunidad de Minecraft, que elimina la fricción técnica (Java incorrecto, dependencias rotas en modpacks, FTPs lentos).

### Estilo Visual: Pantalla Completa + Cámara 3D Dinámica
* Toda la acción ocurre dentro de la **ventana real de la aplicación** (1920×1080) con sus controles de ventana, barra lateral (*Sidebar*), barra superior (*Header*) y pestañas interactivas.
* **Efectos de Cámara 3D e Incrustación por Capas:** Se utiliza la aceleración CSS 3D de Chromium gobernada por GSAP (`perspective`, `rotationX`, `rotationY`, `translateZ`, `scale3d`) para crear vuelos de cámara dinámicos (*swoops*), vistas en perspectiva isométrica y ensamblaje de componentes en profundidad antes de nivelarse a la vista de interacción plana.

---

## 2. Sistema de Efectos de Cámara 3D

1. **Ensamblaje Isométrico 3D (UI Assembly Dive):**
   * Tras el login, la escena inicia en un plano angular isométrico (`rotationX: 15deg`, `rotationY: -12deg`, `z: -180px`).
   * Los componentes del Dashboard caen y se encastran en capas físicas:
     * Nivel -1 (`z: -40px`): Cuadrícula estelar y aura atmosférica.
     * Nivel 0 (`z: 0px`): Marco base de la aplicación.
     * Nivel 1 (`z: 35px`): Sidebar lateral y Header superior deslizándose desde los extremos.
     * Nivel 2 (`z: 80px -> 0px`): Tarjetas de servidores y botón `+ Crear Servidor` encastrándose con un ligero rebote elástico.
   * La cámara desciende y se nivela frontalmente (`rotationX: 0`, `rotationY: 0`) justo cuando el cursor toma el control.

2. **Enfoque Macro y Profundidad de Campo (Tilt & Pan en Catálogo Prism):**
   * Al entrar al Catálogo Prism, la cámara realiza una suave inclinación hacia adelante, destacando la tarjeta del modpack (*Better MC*, 184 mods) con sombras de elevación dinámicas y aislándola sutilmente del fondo.

3. **Inmersión hacia Antigravity IDE / VS Code (Camera Zoom Dive):**
   * Al pulsar *"Abrir en Antigravity IDE"*, la cámara hace un zoom hacia el botón, la interfaz de Singularity se pliega suavemente en perspectiva y emerge la interfaz completa y viva de VS Code / Antigravity IDE con conexión SFTP activa en el puerto 2022.

---

## 3. Desglose Detallado de Escenas

### Escena 01: Onboarding Rápido & Login Real (0s - 6s)
* **Entorno:** Terminal de desarrollador clonando `git clone https://github.com/DarkNebulaX28/Singularity.git`.
* **Transición:** La terminal se contrae y se expande la ventana completa de Singularity Desktop.
* **Login Real (`LoginPage.tsx`):**
  * Fondo completo con el degradado estelar y el logo oficial de Singularity.
  * El cursor escribe `admin@singularity.local`, introduce contraseña y presiona *"Iniciar Sesión"*.

### Escena 02: Ensamblaje 3D & Asistente de Creación de Servidor (6s - 14s)
* **Efecto 3D:** Vuelo de cámara isométrico mientras el Sidebar y las tarjetas del Dashboard se ensamblan en capas de profundidad.
* **Interacción:** El cursor hace clic en `+ Crear Servidor`.
* **Wizard Completo (`CreateServerWizard.tsx`):**
  * Selección de motor: **Fabric** (con selector de Paper, Purpur, Forge, NeoForge, Vanilla).
  * Versión: **1.21.4**.
  * **Detección inteligente de Java:** Badge resaltado: *"Adoptium JDK 25 auto-detectado y configurado"*.
  * Nombre: *"Survival Aventura"*, memoria: 4 GB. Clic en *"Crear e Iniciar"*.

### Escena 03: Detalle del Servidor & Consola VT100 en Tiempo Real (14s - 22s)
* Navega a `ServerDetailPage`.
* Pestaña activa: **Consola ANSI (@xterm)**.
* Los logs de arranque de Fabric 1.21.4 se imprimen en vivo con colores ANSI reales:
  * `[Server thread/INFO]: Loading Minecraft 1.21.4 with Fabric Loader 0.16.10`
  * `[Server thread/INFO]: Preparing spawn area: 100%`
  * `[Server thread/INFO]: Done (3.8s)! For help, type "help"`
* El indicador de rendimiento en la cabecera se ilumina en verde: **`20.0 TPS (Estable)`** y memoria **`1.8 / 4.0 GB`**.

### Escena 04: Catálogo Prism: Mods, Plugins y Modpacks en 1 Clic (22s - 34s)
* El cursor navega por el Sidebar lateral hacia **"Catálogo Prism"** (`CatalogExplorer.tsx`).
* **Pestañas superiores:** `Modpacks (.mrpack)` | `Mods` | `Plugins (Paper/Purpur)` | `Datapacks`.
* **Filtros de origen:** Logos de **Modrinth** y **CurseForge**.
* **Búsqueda e instalación:**
  * Búsqueda en vivo de *"Better MC"*.
  * Aparece la tarjeta con 184 mods, versión 1.21.4 y millones de descargas.
  * Clic en **"Instalar en 1 Clic"**: modal de verificación de dependencias automáticas (`Fabric API`), barra de progreso animada y toast verde de confirmación.
  * El cursor cambia a la pestaña **Mods Instalados** dentro del servidor, mostrando los interruptores de activación/desactivación inmediata.

### Escena 05: Réplica Viva de Antigravity IDE / VS Code (34s - 44s)
* Desde la pestaña **Archivos**, clic en el botón **`💻 Abrir en Antigravity IDE`**.
* Transición de cámara hacia la interfaz fidedigna de Antigravity IDE / VS Code:
  * **Activity Bar:** Iconos de Archivos, Buscar, Git, Extensiones y Singularity SFTP.
  * **Explorador SFTP:** Árbol conectado a `127.0.0.1:2022` mostrando `config/`, `mods/`, `server.properties`.
  * **Editor con sintaxis viva:** Pestaña `server.properties` con resaltado y números de línea.
  * **Animación de tecleo:** Edición en vivo de `motd=§6⚔ Servidor Aventura §7| §bFabric 1.21.4` y `difficulty=hard`.
  * Presiona `Ctrl+S`: destello en la pestaña y toast inferior del IDE:  
    *`⚡ SFTP Sync: server.properties sincronizado en vivo (puerto 2022)`*.
  * Barra de estado inferior azul/púrpura: `SFTP: Conectado • UTF-8 • Properties • Puerto 2022`.

### Escena 06: Suite Desktop, System Tray & Conexión Remota (44s - 50s)
* La ventana se minimiza hacia la barra de tareas de Windows.
* Clic derecho en el icono del **System Tray**:
  * Menú contextual: `Servidor Aventura (Online - 20.0 TPS)`, `Reiniciar`, `Abrir Consola`.
* Al restaurar la ventana, el selector de nodos conmuta de `Servidor Local` a `VPS Oracle Cloud` mostrando latencia de 18ms y sincronización de estado.

### Escena 07: Cierre Cercano, Práctico y Honesto (50s - 56s)
* Logotipo de Singularity con aura sutil.
* **Mensaje:**
  * *"Tu servidor de Minecraft, sin dolores de cabeza técnicos."*
  * *"Java automático • Mods y Modpacks en 1 clic • Edición directa desde tu IDE."*
  * *"100% Código Abierto y Gratuito."*
* Enlace: `github.com/DarkNebulaX28/Singularity`.

---

## 4. Estándares Técnicos y Cumplimiento

* **Render Determinista:** Timeline de GSAP pausado (`seek(0)`) donde todas las animaciones usan `fromTo()` con coordenadas y rotaciones numéricas explícitas.
* **Screaming Architecture:** Toda la lógica de negocio y nomenclatura de servidores respeta los dominios de Singularity (`java-manager`, `servers`, `content-catalog`, `process-supervisor`, `delivery/sftp`).
* **Control de Calidad:**
  * 0 errores de lint, runtime y layout en `npx hyperframes check`.
  * Cumplimiento estricto de contraste WCAG AA en toda la tipografía visible.
  * Pruebas unitarias de la plataforma en verde (134/134 passing).
