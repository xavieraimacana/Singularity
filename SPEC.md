# SPEC.md — Singularity v0.1.0-alpha Launch Film (Director's Cut)
*NebulaX Studio — Full Narrative Specification*

GOAL:    El espectador experimenta la transición desde la frustración de la consola manual hasta la maestría total de su servidor con Singularity Desktop, la suite de escritorio con conexión local/remota y puente a Antigravity IDE.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    42.0 s x 30 fps = 1260 frames; 120 BPM (15 frames por beat, 60 frames por compás)
LOOK:    Ground: #090d16 (Cosmic Obsidian) con 1.5% de micro-grano y coordenadas aeroespaciales sutiles.
         Ink: #f8fafc (Slate 50) para títulos y texto primario, #94a3b8 (Slate 400) para metadatos y etiquetas secundarias.
         Accent: #06b6d4 (Cyber Cyan) en bordes de control interactivos (1px solid rgba(6, 182, 212, 0.35)); #10b981 (Emerald Accent) en estados online, telemetría y confirmaciones.
         Display face: Inter / Space Grotesk, bold 700-900, 48px a 72px, tracking -0.025em.
         Body / Monospace face: JetBrains Mono / Space Mono, regular 500, 28px a 32px, tracking -0.01em.
         Medium: Interfaz de producto real (Login Screen, Wizard de Creación, File Manager, Catálogo Modrinth, Antigravity IDE, Desktop Tray & Connection Switcher).
         Light and depth: Profundidad mediante sombras suaves (0px 30px 60px rgba(0,0,0,0.85)), viñeta perimetral de 4%.

OBJECTS: 
         - Terminal tradicional en fallo (cmd.exe, Java 25 crash).
         - Isotipo maestro Hexacore volando desde el frente hacia el centro.
         - Pantalla de inicio de sesión real (LoginPage) con telemetría en vivo, conmutador de servidor local/remoto y formulario de autenticación.
         - Asistente de creación de servidor con Adoptium Java 25 automático y arranque en vivo.
         - Gestor de archivos y Catálogo Modrinth instalando modpack completo (184 mods).
         - Puente Antigravity IDE con conexión SFTP viva y edición en tiempo real.
         - Conmutador de conexiones de escritorio (Desktop Connection Switcher) y System Tray de Windows.
         - Cierre cinemático animado con badges de capacidades y llamado a la acción oficial.

MOTION:  
         - enter: power2.out / back.out(1.4) (15-20 frames)
         - move: power3.inOut (15-18 frames)
         - exit: power2.in (12-15 frames)
         - camera: power2.out / expo.out (24-30 frames)

SHOTS:   
         - Shot 1 [00.0s-03.5s]: El Caos en Terminal. Error de versión Java en loop.
         - Shot 2 [03.5s-06.5s]: Entrada Frontal del Isotipo Singularity hacia el centro de la pantalla.
         - Shot 3 [06.5s-11.5s]: Pantalla de Login Real de Singularity. Telemetría de core, ingreso de credenciales y acceso concedido.
         - Shot 4 [11.5s-17.5s]: Creación de servidor Fabric + Java 25 y arranque con terminal VT100 en vivo.
         - Shot 5 [17.5s-23.5s]: Gestor de Archivos y Catálogo Modrinth instalando un modpack completo de 184 mods.
         - Shot 6 [23.5s-29.5s]: Puente con Antigravity IDE vía SFTP en tiempo real modificando configs en caliente.
         - Shot 7 [29.5s-35.5s]: Suite de Escritorio nativa: conexión remota/local, minimizado al System Tray y notificaciones.
         - Shot 8 [35.5s-42.0s]: Cierre animado: Tipografía cinética con los 4 pilares de Singularity y enlace GitHub oficial.

BANNED:  
         - Fondo vacío oscuro con tarjetas diminutas flotando sin contexto.
         - Gradientes genéricos violetas o rosas sin vinculación a la paleta NebulaX.
         - Interfaces falsas o mockups inventados.
         - Texto menor a 28px sin data-layout-ignore.

QA:      
         - Frame 045: Mensaje de error en consola claramente visible.
         - Frame 150: Isotipo maestro Hexacore centrado con resplandor cyan.
         - Frame 270: Formulario de Login de Singularity con campos de usuario y contraseña.
         - Frame 450: Terminal mostrando servidor levantando y pasando a ONLINE.
         - Frame 600: Modpack Better MC con 184 mods instalados en el gestor de archivos.
         - Frame 780: Antigravity IDE con conexión SFTP activa en puerto 2222.
         - Frame 960: Modal de conexión de escritorio (Local PC vs Cloud VPS) y notificación Windows.
         - Frame 1140: Cierre animado con el logo, pilares de ingeniería y URL del repositorio.
