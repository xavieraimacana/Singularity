import { describe, it, expect } from 'vitest';
import {
  encodeVarInt,
  decodeVarInt,
  buildHandshakePacket,
  parsePingResponse
} from '../../src/process-supervisor/services/minecraft-ping.js';

describe('MinecraftPing Protocol Helper', () => {
  it('should encode and decode Minecraft VarInts correctly', () => {
    const encoded0 = encodeVarInt(0);
    expect(decodeVarInt(encoded0).value).toBe(0);

    const encoded25565 = encodeVarInt(25565);
    expect(decodeVarInt(encoded25565).value).toBe(25565);

    const encoded2097151 = encodeVarInt(2097151);
    expect(decodeVarInt(encoded2097151).value).toBe(2097151);
  });

  it('should construct valid handshake packet buffer', () => {
    const packet = buildHandshakePacket('127.0.0.1', 25565, 765);
    expect(packet.length).toBeGreaterThan(0);
    expect(Buffer.isBuffer(packet)).toBe(true);
  });

  it('should parse valid Server List Ping JSON response payload', () => {
    const samplePayload = JSON.stringify({
      version: {
        name: 'Paper 1.21.4',
        protocol: 768
      },
      players: {
        max: 20,
        online: 2,
        sample: [
          { id: '11111111-1111-1111-1111-111111111111', name: 'Steve' },
          { id: '22222222-2222-2222-2222-222222222222', name: 'Alex' }
        ]
      },
      description: {
        text: 'A Singularity Server'
      }
    });

    const parsed = parsePingResponse(samplePayload, 25);

    expect(parsed.version).toBe('Paper 1.21.4');
    expect(parsed.protocol).toBe(768);
    expect(parsed.playersOnline).toBe(2);
    expect(parsed.playersMax).toBe(20);
    expect(parsed.players[0]?.name).toBe('Steve');
    expect(parsed.players[1]?.name).toBe('Alex');
    expect(parsed.latencyMs).toBe(25);
  });
});
