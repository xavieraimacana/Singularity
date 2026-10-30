# ADR-001: Screaming Architecture y Monolito Modular en TypeScript

## Estado
Aceptado

## Fecha
2026-10-30

## Contexto
El usuario requiere una aplicación híbrida que una las capacidades de gestión de servidores 24/7 y monitoreo web de **Crafty Controller** con la facilidad de búsqueda e instalación de modpacks, mods, plugins y datapacks de **Prism Launcher**.

Requisitos clave:
- Bajo consumo de memoria y CPU para no competir con los servidores de Minecraft que administra.
- Excelente manejo de I/O asíncrono para streaming de logs de consola bidireccional (stdin/stdout) mediante WebSockets.
- Soporte para Windows (y portabilidad a Linux/Docker).
- Tipado estricto para estructurar APIs de terceros (Modrinth v2, CurseForge, PaperMC, Fabric Meta).
- Cumplimiento de las directrices de arquitectura de **NebulaX Studio** (Screaming Architecture, lógica desacoplada de la UI/CLI).

## Decisión
Construir **Singularity** como un **Monolito Modular** en **TypeScript** bajo **Screaming Architecture**, utilizando:
- **Backend Core**: Node.js + Fastify (por su velocidad récord en benchmarks HTTP/WebSocket y bajo footprint de memoria).
- **Base de Datos / Estado**: SQLite ligero vía `better-sqlite3` para persistencia atómica de usuarios, roles e instancias.
- **Frontend**: Single Page Application con React, Tailwind CSS, Lucide Icons y xterm.js para emulación de terminal VT100.
- **Separación de Capas**: Toda la lógica de negocio (`servers`, `content-catalog`, `process-supervisor`, `java-manager`, `auth-identity`) reside en módulos de dominio puros e independientes de los frameworks de entrega HTTP o WebSocket.

## Alternativas Consideradas

### 1. Python con FastAPI (Estilo Crafty Controller)
- **Pros**: Lenguaje nativo de Crafty Controller; scripts rápidos.
- **Contras**: Mayor consumo de RAM por el intérprete y overhead de subprocesos asíncronos; tipos divididos entre Python y frontend; fricciones habituales de dependencias nativas en Windows.
- **Rechazado**: Menor rendimiento en streaming concurrente de terminales y duplicación de modelos de datos.

### 2. Go (Estilo Pterodactyl Wings)
- **Pros**: Binario único nativo, excelente consumo de recursos.
- **Contras**: La máquina de desarrollo no tiene Go instalado; desarrollo más lento en manipulación de esquemas dinámicos JSON de modpacks y plugins; ecosistema de UI embebida más rígido.
- **Rechazado**: Introduce fricción innecesaria de tooling.

## Consecuencias
- Un solo lenguaje (TypeScript) en todo el stack.
- Facilidad para compilar o ejecutar directamente en Node.js v24.15 ya presente en el sistema.
- El dominio no depende de Fastify ni de React; puede agregarse una interfaz CLI (`agy` / `pism-cli`) sin modificar una sola línea de lógica de negocio.
