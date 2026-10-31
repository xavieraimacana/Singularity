import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import type { AuthTokenPayload } from '../models/user.js';

const scryptAsync = promisify(scrypt);

/**
 * Hashes a plaintext password using standard scrypt (memory-hard, resistant to GPU attacks).
 * Format: `${saltHex}:${derivedKeyHex}`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against a stored scrypt hash using timingSafeEqual to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, 'hex');

  if (derivedKey.length !== keyBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, keyBuffer);
}

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(data: string): string {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Signs a JWT payload using HMAC SHA-256 (standard RFC 7519).
 */
export function signJwt(
  payload: Omit<AuthTokenPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds: number = 86400 // 24 hours default
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies and decodes an HMAC SHA-256 JWT token.
 * Throws an Error if the signature is invalid or if the token is expired.
 */
export function verifyJwt(token: string, secret: string): AuthTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token JWT con formato inválido');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('Segmentos del token JWT vacíos');
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const expectedEncoded = base64UrlEncode(expectedSignature);

  const sigBuf = Buffer.from(encodedSignature);
  const expectedBuf = Buffer.from(expectedEncoded);

  // Constant-time comparison to protect against HMAC timing attacks
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('Firma de token inválida');
  }

  const decodedJson = base64UrlDecode(encodedPayload);
  const payload = JSON.parse(decodedJson) as AuthTokenPayload;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token de sesión expirado');
  }

  return payload;
}
