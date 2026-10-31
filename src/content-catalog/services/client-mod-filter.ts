import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Regex patterns matching client-only mods that cause NoClassDefFoundError
 * or crashes when loaded on a dedicated Minecraft server.
 */
export const CLIENT_ONLY_MOD_PATTERNS: readonly RegExp[] = [
  /^sodium/i,
  /^rubidium/i,
  /^embeddium/i,
  /^iris/i,
  /^oculus/i,
  /^indium/i,
  /^optifine/i,
  /^optifabric/i,
  /^entityculling/i,
  /^entity-culling/i,
  /^ambientsounds/i,
  /^soundphysics/i,
  /^sound-physics/i,
  /^presencefootsteps/i,
  /^presence-footsteps/i,
  /^dynamicsurroundings/i,
  /^dynamic-surroundings/i,
  /^lambdynamiclights/i,
  /^dynamic-lights/i,
  /^continuity/i,
  /^betterf3/i,
  /^modmenu/i,
  /^controlify/i,
  /^controllable/i,
  /^notenoughanimations/i,
  /^not-enough-animations/i,
  /^blur/i,
  /^customsplashscreen/i,
  /^reeses/i,
  /^sodiumextra/i,
  /^sodium-extra/i,
  /^immediatelyfast/i,
  /^waveycapes/i,
  /^wavey-capes/i,
  /^3dskinlayers/i,
  /^skinlayers/i,
  /^bobby/i,
  /^distanthorizons/i,
  /^distant-horizons/i,
  /^zoomify/i,
  /^ok-zoomer/i,
  /^logical-zoom/i,
  /^fallingleaves/i,
  /^falling-leaves/i,
  /^visuality/i,
  /^clearskies/i,
  /^chat-heads/i,
  /^chatheads/i,
  /^shulkerboxtooltip/i,
  /^shulker-box-tooltip/i,
  /^controlling/i,
  /^legendarytooltips/i,
  /^citresewn/i,
  /^cit-resewn/i,
  /^enhancedblockentities/i,
  /^cullleaves/i,
  /^cull-leaves/i,
  /^fabricskyboxes/i,
  /^fabric-skyboxes/i,
  /^mousetweaks/i,
  /^mouse-tweaks/i,
  /^dynamiccrosshair/i,
  /^itemphysic-lite/i
];

/**
 * Checks if a given mod name, slug, or file name represents a client-only mod.
 */
export function isClientOnlyMod(rawNameOrSlug: string): boolean {
  if (!rawNameOrSlug || typeof rawNameOrSlug !== 'string') return false;

  const base = path.basename(rawNameOrSlug, path.extname(rawNameOrSlug));
  const normalized = base.toLowerCase().replace(/[_+.]+/g, '-');

  return CLIENT_ONLY_MOD_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Scans a server's mods/ directory and removes any client-only JAR files.
 * Returns the list of pruned file names.
 */
export async function pruneClientOnlyMods(modsDir: string): Promise<string[]> {
  const pruned: string[] = [];

  try {
    const entries = await fs.readdir(modsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.jar')) {
        if (isClientOnlyMod(entry.name)) {
          const filePath = path.join(modsDir, entry.name);
          try {
            await fs.unlink(filePath);
            pruned.push(entry.name);
          } catch {
            // Ignore single file deletion failures
          }
        }
      }
    }
  } catch {
    // mods directory might not exist yet
  }

  return pruned;
}
