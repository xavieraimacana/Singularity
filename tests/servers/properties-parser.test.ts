import { describe, it, expect } from 'vitest';
import {
  parseProperties,
  serializeProperties,
  updateProperty
} from '../../src/servers/services/properties-parser.js';

describe('PropertiesParser', () => {
  const sampleRawProperties = `#Minecraft server properties
#Thu Jan 01 00:00:00 UTC 2026
enable-jmx-monitoring=false
rcon.port=25575
level-seed=
gamemode=survival
enable-command-block=true
server-port=25565
pvp=true
motd=A Minecraft Server
max-players=20
online-mode=true
view-distance=10
resource-pack-prompt=
`;

  it('should parse raw server.properties into typed object', () => {
    const parsed = parseProperties(sampleRawProperties);

    expect(parsed.properties['server-port']).toBe(25565);
    expect(parsed.properties['pvp']).toBe(true);
    expect(parsed.properties['online-mode']).toBe(true);
    expect(parsed.properties['enable-jmx-monitoring']).toBe(false);
    expect(parsed.properties['gamemode']).toBe('survival');
    expect(parsed.properties['motd']).toBe('A Minecraft Server');
    expect(parsed.properties['max-players']).toBe(20);
    expect(parsed.properties['level-seed']).toBe('');
  });

  it('should preserve comments and header during serialization', () => {
    const parsed = parseProperties(sampleRawProperties);
    const updated = updateProperty(parsed, 'max-players', 50);
    const serialized = serializeProperties(updated);

    expect(serialized).toContain('#Minecraft server properties');
    expect(serialized).toContain('max-players=50');
    expect(serialized).toContain('server-port=25565');
    expect(serialized).toContain('pvp=true');
  });

  it('should allow adding new properties during update', () => {
    const parsed = parseProperties('server-port=25565\n');
    const updated = updateProperty(parsed, 'white-list', true);
    const serialized = serializeProperties(updated);

    expect(serialized).toContain('server-port=25565');
    expect(serialized).toContain('white-list=true');
  });
});
