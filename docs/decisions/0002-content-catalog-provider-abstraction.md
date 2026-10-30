# ADR-002: Abstracción de Proveedores para el Catálogo de Contenido (Content Catalog)

## Estado
Aceptado

## Fecha
2026-10-30

## Contexto
El usuario necesita buscar, descargar e instalar modpacks, plugins, mods y datapacks desde múltiples fuentes:
- **Modrinth** (API v2): Mods, Modpacks (.mrpack), Plugins y Datapacks con metadata rica y hashes SHA1/SHA512.
- **CurseForge** (Eternal API): Modpacks masivos y mods clásicos.
- **PaperMC / Purpur / Velocity** (Hangar API & Builds API): Servidores de alto rendimiento y plugins para Spigot/Paper.
- **Fabric / NeoForge / Forge**: Instaladores y versiones de loaders.

Cada proveedor tiene formatos de respuesta, paginación, filtros de versión de Minecraft y tipos de archivo diferentes. Acoplar la lógica de descarga directamente a la UI o a cada controlador crearía un código frágil e inmantenible.

## Decisión
Diseñar el módulo `content-catalog` siguiendo el patrón **Strategy / Provider Abstraction**:
1. Definir una interfaz unificada `IContentProvider`:
   - `search(query: CatalogSearchQuery): Promise<CatalogSearchResult>`
   - `getDetails(id: string): Promise<ContentItemDetails>`
   - `getVersions(id: string, gameVersion?: string, loader?: LoaderType): Promise<ContentVersion[]>`
   - `resolveDependencies(versionId: string): Promise<DependencyGraph>`
   - `downloadArtifact(versionId: string, targetPath: string): Promise<DownloadResult>`
2. Implementar adaptadores específicos (`ModrinthProvider`, `CurseForgeProvider`, `PaperMcProvider`).
3. Crear un `ContentInstallerService` que orquesta la colocación del archivo descargado en la carpeta correcta de la instancia (`mods/`, `plugins/`, `datapacks/` o extracción raíz para modpacks) y la actualización de un manifiesto local de la instancia `pism-manifest.json`.

## Alternativas Consideradas
- **Llamadas directas desde el frontend**: La UI haría fetch directamente a Modrinth o CurseForge. Rechazado por problemas de CORS, falta de caché local, imposibilidad de instalar archivos directamente en el disco del servidor sin pasar por el backend, y exposición de API keys de CurseForge en el cliente.
- **Scripting individual ad-hoc por loader**: Escribir scripts separados para Paper, Fabric y Forge. Rechazado porque viola el principio de Abstracción y Screaming Architecture.

## Consecuencias
- Soporte para agregar nuevos proveedores (ej. SpigotMC, Hangar, Technic) simplemente implementando `IContentProvider`.
- Posibilidad de mockear completamente los proveedores en pruebas unitarias sin tocar la red.
- Manejo homogéneo de resolución de dependencias (ej. si un mod requiere `Fabric API`, se detecta e instala automáticamente como en Prism Launcher).
