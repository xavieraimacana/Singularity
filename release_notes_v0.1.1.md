# 🌌 Singularity v0.1.1-alpha — The Next-Generation Minecraft Server Orchestrator

¡Nos complace presentar la versión **v0.1.1-alpha** de **Singularity**, un producto oficial de **NebulaX Studio**!

Esta versión introduce el **Autoprovisionamiento Inteligente de Entornos IDE Remotos (SFTP)**, soporte completo para sincronización en vivo con **Antigravity IDE**, **VS Code** y **Cursor**, y actualiza los instaladores ejecutables nativos para Windows 10 y 11 x64.

---

### 🚀 Novedades y Mejoras en v0.1.1-alpha

* 💻 **Autoprovisionamiento Inteligente de Entorno SFTP para IDEs:**
  * Al hacer clic en *"Abrir en IDE"* sobre cualquier servidor alojado remotamente en tu VPS (o al inicializar un nuevo entorno), Singularity genera automáticamente dentro de la carpeta local:
    * **`.vscode/sftp.json`**: Configuración preconfigurada con host, puerto SFTP (`:2022`), credenciales y mapeo de ruta remota (`/srv_...`) con sincronización al guardar (`uploadOnSave: true`).
    * **`REMOTE_SERVER_INFO.md`**: Guía paso a paso en español con instrucciones directas para descargar los archivos (`SFTP: Download Project`) y sincronizar cambios en vivo.
  * Compatible de fábrica con la extensión **SFTP** (por Natizyskunk o liximomo) en **Antigravity IDE**, **Visual Studio Code** y **Cursor**.
* 🌐 **Soporte Híbrido Multihost Perfeccionado:**
  * Detección automática en tiempo real de perfiles de conexión: **NebulaX Cloud VPS** vs **Servidor Local (PC)**.
  * Resolución segura de rutas y prevención contra path traversal.
* 🎬 **Trailers Oficiales de Lanzamiento Incluidos:**
  * Video Horizontal 1080p 30fps (`singularity-launch.mp4`) con ensamble 3D cinemático.
  * Video Vertical 9:16 (`singularity-instagram.mp4`) optimizado para Instagram Reels y TikTok.
* 🧪 **Calidad de Ingeniería y Suite de Tests:**
  * **135/135 pruebas unitarias e integración pasando al 100%** en Vitest.
  * Tipado estricto con TypeScript 5.x sin advertencias en `tsc --noEmit`.

---

### 📥 Archivos de Descarga Oficiales (Windows x64)

| Archivo | Tipo | Tamaño | Suma de Verificación SHA-256 |
|---|---|---|---|
| **`Singularity-Setup-0.1.1-alpha.exe`** | Instalador NSIS | ~90.2 MB | `62fb7c97bfc53aa253e5aaaf6cfaeebbe1c4135ada0b04275964391b26115915` |
| **`Singularity-Portable-0.1.1-alpha.exe`** | Ejecutable Portable | ~82.8 MB | `06daa63a2d260c9fe9f1ee9c3bc6e2025faf3a47ccbdda950e3e34aa31598380` |
| **`singularity-launch.mp4`** | Trailer Horizontal 1080p | ~17.8 MB | Video oficial de presentación con ensamblaje 3D y demostración en vivo |
| **`singularity-instagram.mp4`** | Reel Vertical 9:16 | ~5.8 MB | Video promocional de alto impacto para Instagram Reels |

---

### 🔑 Credenciales por Defecto (Primer Inicio)
* **Usuario:** `admin`
* **Contraseña:** `admin` *(el sistema solicitará actualizarla en el primer acceso)*.

---

<div align="center">
  <sub>Desarrollado con pasión por <strong>NebulaX Studio</strong> para la comunidad de Minecraft.</sub>
</div>
