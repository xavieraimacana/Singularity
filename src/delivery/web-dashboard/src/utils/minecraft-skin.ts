/**
 * Minecraft Avatar & Skin Utilities
 * 
 * Uses Minotar CDN which natively supports usernames, offline usernames, and UUIDs,
 * returning valid image/png headers (preventing CORB / Cross-Origin Read Blocking issues).
 * Includes an offline SVG Steve fallback for zero-network conditions.
 */

export const STEVE_AVATAR_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="%23b47a57"/><rect x="1" y="0" width="6" height="2" fill="%234a321d"/><rect x="0" y="1" width="8" height="1" fill="%234a321d"/><rect x="0" y="2" width="1" height="2" fill="%234a321d"/><rect x="7" y="2" width="1" height="2" fill="%234a321d"/><rect x="1" y="3" width="2" height="1" fill="%23ffffff"/><rect x="5" y="3" width="2" height="1" fill="%23ffffff"/><rect x="2" y="3" width="1" height="1" fill="%232b3d8f"/><rect x="5" y="3" width="1" height="1" fill="%232b3d8f"/><rect x="3" y="4" width="2" height="1" fill="%238f5a3c"/><rect x="2" y="5" width="4" height="1" fill="%234a321d"/><rect x="3" y="6" width="2" height="1" fill="%234a321d"/></svg>';

/**
 * Returns a 2D/3D Minecraft Head Avatar URL for any username or UUID.
 */
export function getMinecraftAvatarUrl(username?: string, size: number = 36): string {
  const cleanNick = encodeURIComponent((username || 'Steve').trim() || 'Steve');
  return `https://minotar.net/helm/${cleanNick}/${size}.png`;
}

/**
 * Returns a full body 3D render of the Minecraft skin for any username or UUID.
 */
export function getMinecraftBodyUrl(username?: string, size: number = 180): string {
  const cleanNick = encodeURIComponent((username || 'Steve').trim() || 'Steve');
  return `https://minotar.net/armor/body/${cleanNick}/${size}.png`;
}
