# SPEC.md — Singularity v0.1.0-alpha Launch Film
*NebulaX Studio — Production Specification*

GOAL:    El espectador siente alivio inmediato al ver eliminada la fricción técnica de crear y mantener servidores de Minecraft, y visita el repositorio de GitHub para descargar Singularity.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    30.0 s x 30 fps = 900 frames; 120 BPM (15 frames por beat, 60 frames por compás)
LOOK:    Ground: #090d16 (Cosmic Obsidian) con 1.5% de micro-grano sutil.
         Ink: #f8fafc (Slate 50) para títulos y texto primario, #94a3b8 (Slate 400) para metadatos y etiquetas secundarias.
         Accent: #06b6d4 (Cyber Cyan) en bordes de control interactivos (1px solid rgba(6, 182, 212, 0.35)); #10b981 (Emerald Accent) exclusivamente para estados de éxito, telemetría online y 20.0 TPS.
         Display face: Inter / Space Grotesk, bold 700, 56px a 72px, tracking -0.025em.
         Body / Monospace face: JetBrains Mono / Fira Code, regular 500, 28px a 32px, tracking -0.01em.
         Medium: Interfaz de producto real (Dashboard de Singularity, Terminal xterm con códigos ANSI, Antigravity IDE bridge) montado en viewport 1600x900 centrado dentro de 1920x1080 con drop-shadow (0px 24px 48px rgba(0,0,0,0.65)).
         Light and depth: Profundidad mediante sombras suaves, contraste nítido sin gradientes artificiales desenfocados, viñeta perimetral de 4%.

OBJECTS: 
         - Terminal Windows tradicional: Ventana negra (cmd.exe) fallando con stacktrace rojo de clase Java inválida.
         - Interfaz Principal Singularity: Barra lateral de navegación con iconos de Servidores, Archivos, Consola, Ajustes; botón de acción primaria "Nuevo Servidor" en Cyber Cyan.
         - Selector de Motor & Java: Tarjeta de configuración con selector de versión (Minecraft 1.21.4), loader (Fabric) y chip de runtime ("Adoptium OpenJDK 25 auto-detectado").
         - Catálogo Modrinth: Tarjeta de modpack con thumbnail real, botón "Instalar en 1 clic" y barra de progreso de descarga animada.
         - Puente Antigravity IDE: Banner y botón interactivo "Abrir en IDE" que lanza el editor de código con conexión SFTP sincronizada.
         - Monitor de Telemetría: Badge esmeralda con pulso que indica "20.0 TPS · 0.0ms tick · SERVIDOR ONLINE".
         - Isotipo Maestro Hexacore: SVG vectorial oficial de Singularity con los vértices isométricos exactos a 30°, 90° y 150°.
         - Tarjeta de Cierre (End Card): Lockup de marca central con URL del repositorio de GitHub (`github.com/xavieraimacana/Singularity`) y llamado a la acción.

MOTION:  
         - enter: power2.out (duración: 15-20 frames)
         - move: power3.inOut (duración: 15-18 frames)
         - exit: power2.in (duración: 12-15 frames)
         - camera: power2.out / expo.out (duración: 24-30 frames)
         - spring damping: 0.55 en transiciones de tarjetas interactivas

SHOTS:   
         - Shot 1 [Frames 000-090, 0.0s-3.0s]: Hero: Terminal tradicional se estremece con un error fatal en rojo. Texto: "El error de siempre: Java 25 no encontrado". Audio: Sonido de error y zumbido eléctrico glitch. Transición: El marco de la terminal se comprime y se disuelve hacia el centro.
         - Shot 2 [Frames 090-210, 3.0s-7.0s]: Hero: Singularity Desktop emerge suavemente desde abajo al centro y despliega el dashboard principal. Texto: "Singularity: Todo tu servidor bajo control". Audio: Beat sintetizado 120 BPM entra con bombo limpio. Transición: Cursor hace clic en "+ Nuevo Servidor", desplegando el asistente modal.
         - Shot 3 [Frames 210-390, 7.0s-13.0s]: Hero: Selección de versión 1.21.4 + Fabric; badge de Java 25 se ilumina en cyan con check verde. Texto: "Descarga e instalación automática de Java y Fabric". Audio: Clic de confirmación y sub-bass ascendente. Transición: El asistente cambia fluidamente a la pestaña de Mods y Contenido.
         - Shot 4 [Frames 390-540, 13.0s-18.0s]: Hero: El catálogo consulta Modrinth, cursor presiona "Instalar Modpack"; la barra de descarga corre a 100%. Texto: "Integración nativa con Modrinth y CurseForge". Audio: Rápido arpegio digital en sincronía con el progreso. Transición: Zoom suave al menú de archivos.
         - Shot 5 [Frames 540-690, 18.0s-23.0s]: Hero: Desde el panel de archivos, el cursor pulsa "Abrir en IDE", desplegando Antigravity IDE con conexión SFTP en vivo. Texto: "Edita configs en tiempo real con Antigravity IDE". Audio: Sonido mecánico de teclado y pulsación sónica. Transición: Regreso al monitor de estado.
         - Shot 6 [Frames 690-780, 23.0s-26.0s]: Hero: La terminal arranca limpia; el badge de estado estalla en verde esmeralda: "20.0 TPS - ESTABLE". Texto: "20.0 TPS. Rendimiento máximo sin bloqueos". Audio: Acorde armónico principal resolviendo en tono triunfal. Transición: La interfaz se retrae hacia el centro revelando el isotipo.
         - Shot 7 [Frames 780-900, 26.0s-30.0s]: Hero: El Hexacore Isotype de Singularity dibuja sus trazos cyan y esmeralda; debajo aparece el texto "Descárgalo gratis en GitHub" y el badge de v0.1.0-alpha. Audio: Cola de reverb limpia con golpe final en compás 15. Transición: Hold estático limpio hasta el frame 900.

BANNED:  
         - Fondo vacío oscuro con tarjetas diminutas flotando sin contexto.
         - Gradientes genéricos violetas o rosas sin vinculación a la paleta NebulaX.
         - Neón exagerado, destellos de lente o partículas flotantes decorativas.
         - Tipografía pequeña ilegible o texto en movimiento mientras se lee.
         - Animaciones genéricas de "fade and slide up" simultáneo en todos los elementos.
         - Interfaces falsas o mockups inventados que no correspondan a la interfaz real de Singularity.

QA:      
         - Frame 045: Mensaje de error en consola claramente visible y legible.
         - Frame 150: Dashboard de Singularity visible en ratio 1600x900 con tipografía nítida (>28px).
         - Frame 300: Indicador de Fabric y Adoptium Java 25 en estado confirmado.
         - Frame 465: Barra de progreso de Modrinth al 100% con botón "Listo".
         - Frame 615: Ventana de Antigravity IDE mostrando `server.properties` con resaltado de sintaxis.
         - Frame 735: Monitor de rendimiento marcando 20.0 TPS en verde esmeralda (#10b981).
         - Frame 840: Isotipo maestro vectorial oficial de Singularity nítido y centrado con llamado a la acción.
