import net from 'node:net';
import type { ServerPingResult } from '../models/process-state.js';

export function encodeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let current = value;

  while (true) {
    if ((current & ~0x7f) === 0) {
      bytes.push(current);
      break;
    } else {
      bytes.push((current & 0x7f) | 0x80);
      current >>>= 7;
    }
  }

  return Buffer.from(bytes);
}

export function decodeVarInt(
  buffer: Buffer,
  offset: number = 0
): { value: number; bytesRead: number } {
  let value = 0;
  let bytesRead = 0;
  let currentByte = 0;

  do {
    currentByte = buffer[offset + bytesRead] ?? 0;
    value |= (currentByte & 0x7f) << (bytesRead * 7);
    bytesRead++;
    if (bytesRead > 5) {
      throw new Error('VarInt demasiado grande');
    }
  } while ((currentByte & 0x80) === 0x80);

  return { value, bytesRead };
}

export function buildHandshakePacket(
  host: string,
  port: number,
  protocolVersion: number = 765
): Buffer {
  const hostBuffer = Buffer.from(host, 'utf8');
  const portBuffer = Buffer.alloc(2);
  portBuffer.writeUInt16BE(port, 0);

  const packetData = Buffer.concat([
    encodeVarInt(0x00), // Packet ID: Handshake
    encodeVarInt(protocolVersion),
    encodeVarInt(hostBuffer.length),
    hostBuffer,
    portBuffer,
    encodeVarInt(1) // Next state: 1 (status)
  ]);

  return Buffer.concat([encodeVarInt(packetData.length), packetData]);
}

export function buildStatusRequestPacket(): Buffer {
  const packetData = Buffer.from([0x00]); // Packet ID: Status Request
  return Buffer.concat([encodeVarInt(packetData.length), packetData]);
}

export function parsePingResponse(jsonPayload: string, latencyMs: number): ServerPingResult {
  const raw = JSON.parse(jsonPayload);

  return {
    version: raw.version?.name ?? 'Desconocida',
    protocol: raw.version?.protocol ?? 0,
    playersOnline: raw.players?.online ?? 0,
    playersMax: raw.players?.max ?? 0,
    players: raw.players?.sample ?? [],
    description: typeof raw.description === 'string' ? raw.description : raw.description?.text ?? '',
    latencyMs
  };
}

export function pingServer(
  host: string = '127.0.0.1',
  port: number = 25565,
  timeoutMs: number = 3000
): Promise<ServerPingResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let responseBuffer = Buffer.alloc(0);

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      socket.write(buildHandshakePacket(host, port));
      socket.write(buildStatusRequestPacket());
    });

    socket.on('data', (data) => {
      responseBuffer = Buffer.concat([responseBuffer, data]);

      try {
        const { value: packetLength, bytesRead: lenBytes } = decodeVarInt(responseBuffer, 0);
        if (responseBuffer.length >= lenBytes + packetLength) {
          const { bytesRead: idBytes } = decodeVarInt(responseBuffer, lenBytes);
          const { value: strLength, bytesRead: strLenBytes } = decodeVarInt(
            responseBuffer,
            lenBytes + idBytes
          );

          const jsonOffset = lenBytes + idBytes + strLenBytes;
          const jsonStr = responseBuffer.subarray(jsonOffset, jsonOffset + strLength).toString('utf8');
          const latencyMs = Date.now() - startTime;

          socket.destroy();
          resolve(parsePingResponse(jsonStr, latencyMs));
        }
      } catch {
        // Wait for more chunks if packet incomplete
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Tiempo de espera agotado al hacer ping a ${host}:${port}`));
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
  });
}
