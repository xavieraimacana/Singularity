import type { DiagnosticResult } from './models/crash-report.js';

export interface CrashRule {
  readonly id: string;
  match(log: string): DiagnosticResult | null;
}

export const CRASH_RULES: CrashRule[] = [
  // 1. Java Version Mismatch
  {
    id: 'java-mismatch',
    match(log: string): DiagnosticResult | null {
      // Paper / Purpur / Vanilla pre-flight check: "Minecraft 26.1 and newer requires running the server with Java 25 or above"
      const preflightMatch = log.match(/requires running the server with Java (\d+) or above/i);
      if (preflightMatch && preflightMatch[1]) {
        const javaRequired = parseInt(preflightMatch[1], 10);
        return {
          code: 'JAVA_VERSION_MISMATCH',
          severity: 'critical',
          title: 'Java Incompatible: Se Requiere una Versión Más Reciente',
          explanation: `Minecraft requiere Java ${javaRequired} o superior para ejecutarse. Actualiza el runtime Java configurado para esta instancia.`,
          suggestedAction: {
            type: 'CHANGE_JAVA_VERSION',
            label: `Cambiar a Java ${javaRequired}`,
            targetVersion: javaRequired
          },
          details: {
            javaRequired,
            javaCurrent: 0
          }
        };
      }

      const match = log.match(
        /UnsupportedClassVersionError:.*?class file version (\d+(?:\.\d+)?).*?up to (\d+(?:\.\d+)?)/i
      );

      if (!match || !match[1] || !match[2]) {
        return null;
      }

      const requiredClassVer = parseFloat(match[1]);
      const currentClassVer = parseFloat(match[2]);

      const javaRequired = Math.round(requiredClassVer - 44);
      const javaCurrent = Math.round(currentClassVer - 44);

      return {
        code: 'JAVA_VERSION_MISMATCH',
        severity: 'critical',
        title: 'Java Incompatible: Se Requiere una Versión Más Reciente',
        explanation: `El servidor fue compilado para Java ${javaRequired}, pero se está ejecutando con Java ${javaCurrent}. Minecraft no puede arrancar con una versión inferior a la requerida.`,
        suggestedAction: {
          type: 'CHANGE_JAVA_VERSION',
          label: `Cambiar a Java ${javaRequired}`,
          targetVersion: javaRequired
        },
        details: {
          javaRequired,
          javaCurrent
        }
      };
    }
  },

  // 2. Out of Memory
  {
    id: 'out-of-memory',
    match(log: string): DiagnosticResult | null {
      if (!/java\.lang\.OutOfMemoryError: Java heap space/i.test(log)) {
        return null;
      }

      return {
        code: 'OUT_OF_MEMORY',
        severity: 'critical',
        title: 'Memoria RAM Insuficiente (OutOfMemoryError)',
        explanation: 'El servidor de Minecraft ha agotado la memoria RAM asignada (Java Heap Space). Es necesario aumentar la asignación de memoria o reducir la distancia de renderizado.',
        suggestedAction: {
          type: 'INCREASE_RAM',
          label: 'Aumentar Memoria RAM Asignada'
        }
      };
    }
  },

  // 3. Client-side mod on server
  {
    id: 'client-mod-on-server',
    match(log: string): DiagnosticResult | null {
      const isClientError =
        /NoClassDefFoundError: net\/minecraft\/client/i.test(log) ||
        /entrypoint stage 'main' due to errors, provided by '([^']+)'/i.test(log);

      if (!isClientError) {
        return null;
      }

      // Try to capture mod name from 'provided by 'modname'' or known client mods
      let modName = 'mod de cliente';
      const modMatch = log.match(/provided by '([^']+)'/i);
      if (modMatch && modMatch[1]) {
        modName = modMatch[1];
      } else {
        const knownMatch = log.match(/\b(sodium|rubidium|iris|oculus|optifine|entityculling)\b/i);
        if (knownMatch && knownMatch[1]) {
          modName = knownMatch[1];
        }
      }

      return {
        code: 'CLIENT_SIDE_MOD_ON_SERVER',
        severity: 'error',
        title: 'Mod de Cliente en Servidor Dedicado',
        explanation: `El mod '${modName}' es exclusivo del cliente de Minecraft y no es compatible con un servidor dedicado sin interfaz gráfica (Headless). Causa errores fatales al intentar cargar clases de interfaz (GUI/Renderizado).`,
        suggestedAction: {
          type: 'REMOVE_MOD',
          label: `Desactivar mod '${modName}'`,
          targetMod: modName
        },
        details: {
          modName
        }
      };
    }
  },

  // 4. Port already in use
  {
    id: 'port-in-use',
    match(log: string): DiagnosticResult | null {
      if (!/BindException: Address already in use|FAILED TO BIND TO PORT/i.test(log)) {
        return null;
      }

      return {
        code: 'PORT_ALREADY_IN_USE',
        severity: 'critical',
        title: 'Puerto Ocupado (BindException)',
        explanation: 'El puerto configurado para el servidor ya está siendo utilizado por otra instancia o proceso en el sistema operativo.',
        suggestedAction: {
          type: 'CHANGE_PORT',
          label: 'Asignar un Puerto Disponible'
        }
      };
    }
  },

  // 5. Missing dependency
  {
    id: 'missing-dependency',
    match(log: string): DiagnosticResult | null {
      const match = log.match(/requires.*?of '([^']+)' \(([^)]+)\), which is missing/i);
      if (!match) {
        return null;
      }

      const missingMod = match[2] ?? match[1] ?? 'desconocido';

      return {
        code: 'MISSING_DEPENDENCY',
        severity: 'error',
        title: 'Dependencia Faltante en Mods',
        explanation: `Uno de los mods instalados requiere '${missingMod}', pero no se encuentra en la carpeta de mods.`,
        suggestedAction: {
          type: 'INSTALL_DEPENDENCY',
          label: `Instalar '${missingMod}' desde el Catálogo`,
          targetMod: missingMod
        },
        details: {
          missingMod
        }
      };
    }
  }
];
