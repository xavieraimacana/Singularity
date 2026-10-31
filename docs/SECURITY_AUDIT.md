# 🛡️ Informe de Auditoría de Seguridad & Endurecimiento Defensivo
**Proyecto:** Singularity — Minecraft Server Mission Control  
**Alcance:** Aplicación de Escritorio (Electron / IPC / Native Bridges) & Aplicación Web (Fastify REST / WebSockets / SFTP / File Manager)  
**Estudio:** NebulaX Studio  
**Fecha:** 31 de Octubre, 2026  
**Estado:** ✅ Auditoría Completada — 5/5 Vulnerabilidades Remediadas y Verificadas (134/134 Tests Aprobados)

---

## 1. Resumen Ejecutivo
Se realizó una inspección de seguridad integral de caja blanca sobre la arquitectura de entrega (Delivery Mechanism), los controladores de entrada y los módulos de dominio de **Singularity**. Se evaluaron vectores críticos según los estándares **OWASP Top 10** y las guías de seguridad oficiales de **Electron Framework**.

Se identificaron **5 vectores de riesgo potencial**, los cuales fueron remediados de inmediato con parches defensivos de cero dependencias externas y cubiertos con pruebas unitarias de regresión.

---

## 2. Matriz de Hallazgos y Remediaciones

| ID | Severidad | Superficie | Vulnerabilidad / Vector | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Medio** | Desktop (Electron) | Navegación Arbitraria y Exposición de Ventanas en WebView | ✅ Remediado |
| **SEC-02** | **Medio** | Web & Core (File Manager) | Evasión de Confinamiento por Colisión de Prefijo (`startsWith`) | ✅ Remediado |
| **SEC-03** | **Bajo / Medio** | Web & API (Auth) | Ataque de Temporización (Timing Attack) en Firma JWT | ✅ Remediado |
| **SEC-04** | **Bajo** | Web & API (Auth) | Clave Secreta JWT Débil por Defecto en Producción | ✅ Remediado |
| **SEC-05** | **Bajo** | Desktop (IPC Bridge) | Apertura de Rutas del Sistema Fuera de la Carpeta de Servidores | ✅ Remediado |

---

## 3. Detalle de Vulnerabilidades y Parches Aplicados

### SEC-01: Sandboxing de Navegación y Enlaces Externos en Electron
* **Archivo afectado:** `src/delivery/desktop/main.ts`
* **Descripción del riesgo:** Por defecto, los enlaces externos con `target="_blank"` o llamadas a `window.open` dentro de una ventana de Electron pueden abrir nuevas ventanas que heredan el contexto o navegan hacia dominios remotos manteniendo el puente IPC (`preload.js`) activo.
* **Remediación:**
  1. Se implementó `setWindowOpenHandler` para bloquear la apertura interna de ventanas no autorizadas y delegar URLs HTTP/HTTPS al navegador predeterminado del sistema operativo vía `shell.openExternal`.
  2. Se añadió el listener `will-navigate` para prevenir redirecciones a orígenes remotos ajenos a la URL del servidor activo o `localhost`.
  3. Se activaron explícitamente `webSecurity: true` y `allowRunningInsecureContent: false` en `webPreferences`.

### SEC-02: Colisión de Prefijos en Validación de Rutas (Jailbreak de Directorio)
* **Archivo afectado:** `src/file-manager/services/file-manager-service.ts`
* **Descripción del riesgo:** La validación previa `!resolved.startsWith(instanceDir)` presentaba una debilidad por coincidencia de subcadena: si `instanceDir` era `/servers/srv_1`, una ruta relativa maliciosa apuntando a `../srv_10/archivo.txt` pasaba la validación porque `/servers/srv_10` empieza por la cadena `/servers/srv_1`. Además, faltaba protección contra inyección de bytes nulos (`\0`).
* **Remediación:**
  1. Se restringió el confinamiento a: `resolved === instanceDir || resolved.startsWith(instanceDir + path.sep)`.
  2. Se añadió un guard contra cadenas que contengan bytes nulos (`\0`).

### SEC-03: Ataque de Temporización en Verificación Criptográfica de JWT
* **Archivo afectado:** `src/auth-identity/services/crypto-utils.ts`
* **Descripción del riesgo:** La comparación `encodedSignature !== expectedEncoded` utilizaba el comparador de igualdad estándar de cadenas de JavaScript (`===`), el cual termina anticipadamente en el primer byte diferente. Esto expone la firma HMAC a ataques de temporización donde un atacante mide microsegundos de respuesta para deducir la firma correcta.
* **Remediación:**
  Se sustituyó la comparación por `crypto.timingSafeEqual`, validando previamente la igualdad estricta de longitud en bytes.

### SEC-04: Robustecimiento de Clave Secreta JWT en Ausencia de Variables de Entorno
* **Archivo afectado:** `src/delivery/http/server.ts`
* **Descripción del riesgo:** Si `SINGULARITY_JWT_SECRET` no estaba definido en `.env`, el servidor utilizaba una clave pública fija por defecto (`'singularity-secret-key-change-me'`), lo que permitiría falsificar tokens de administrador si el usuario olvida configurar su archivo de entorno.
* **Remediación:**
  En entornos de producción, el servidor ahora genera una clave secreta criptográfica aleatoria y única de 256 bits (`randomBytes(32).toString('hex')`) en memoria si no se proporciona una en la configuración.

### SEC-05: Restricción de Confinamiento en `IdeBridge` y `ServerLifecycleService`
* **Archivos afectados:**
  - `src/delivery/desktop/ide-bridge.ts`
  - `src/servers/services/server-lifecycle.ts`
* **Descripción del riesgo:** El manejador IPC `singularity:open-folder` permitía abrir rutas absolutas arbitrarias del sistema de archivos en el explorador de Windows, y `getInstanceDir` no sanitizaba caracteres especiales o secuencias `../` en el ID de la instancia.
* **Remediación:**
  1. `resolveInstancePath` ahora exige confinamiento estricto dentro de la carpeta `data/servers`. Cualquier intento de escape arroja error y el IPC devuelve `false`.
  2. `getInstanceDir` ahora sanitiza el ID con `path.basename` y una lista blanca regex `/[^a-zA-Z0-9_-]/g`.

---

## 4. Verificación y Calidad de Código
* **Suite de Pruebas Automatizadas:** 28 suites de pruebas ejecutadas, **134/134 tests pasando** exitosamente.
* **Chequeo de Tipos y Linter:** `tsc --noEmit` completado con 0 errores.
* **Compilación de Producción:** Servidor Fastify + Panel Web Vite compilados al 100%.
