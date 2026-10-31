import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { SqliteUserRepository } from '../../src/auth-identity/repositories/sqlite-user-repository.js';
import {
  AuthService,
  InvalidCredentialsError,
  AccountDisabledError
} from '../../src/auth-identity/services/auth-service.js';
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt
} from '../../src/auth-identity/services/crypto-utils.js';

describe('Auth & Identity Domain', () => {
  const JWT_SECRET = 'super-secret-test-key-singularity-12345';

  let userRepo: SqliteUserRepository;
  let authService: AuthService;

  beforeEach(async () => {
    // In-memory sqlite database for fast isolated unit tests

    userRepo = new SqliteUserRepository(':memory:');
    userRepo.initSchema();

    authService = new AuthService(userRepo, JWT_SECRET);
  });

  afterEach(() => {

  });

  describe('crypto-utils', () => {
    it('should hash password with scrypt and verify correctly', async () => {
      const password = 'mySecretPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toContain(':');
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword('wrongPassword', hash)).toBe(false);
    });

    it('should sign and verify valid JWT token', () => {
      const payload = {
        userId: 'usr_01',
        username: 'admin',
        role: 'ADMIN' as const,
        mustChangePassword: true,
        allowedServers: ['*']
      };

      const token = signJwt(payload, JWT_SECRET, 3600);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = verifyJwt(token, JWT_SECRET);
      expect(decoded.userId).toBe('usr_01');
      expect(decoded.username).toBe('admin');
      expect(decoded.role).toBe('ADMIN');
      expect(decoded.mustChangePassword).toBe(true);
      expect(decoded.allowedServers).toEqual(['*']);
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should reject tampered or invalid JWT signatures using constant-time comparison', () => {
      const payload = {
        userId: 'usr_02',
        username: 'guest',
        role: 'VIEWER' as const,
        mustChangePassword: false,
        allowedServers: []
      };

      const token = signJwt(payload, JWT_SECRET, 3600);
      const parts = token.split('.');
      const header = parts[0]!;
      const body = parts[1]!;
      const signature = parts[2]!;

      // Corrupted signature
      const tamperedSig = signature.slice(0, -2) + 'aa';
      expect(() => verifyJwt(`${header}.${body}.${tamperedSig}`, JWT_SECRET)).toThrow('Firma de token inválida');

      // Signature with altered length
      expect(() => verifyJwt(`${header}.${body}.${signature}extra`, JWT_SECRET)).toThrow('Firma de token inválida');

      // Different secret
      expect(() => verifyJwt(token, 'attacker-secret')).toThrow('Firma de token inválida');
    });
  });

  describe('AuthService', () => {
    it('should initialize default admin on empty database', async () => {
      const admin = await authService.ensureDefaultAdmin('admin', 'singularity');
      expect(admin).not.toBeNull();
      expect(admin?.username).toBe('admin');
      expect(admin?.role).toBe('ADMIN');
      expect(admin?.mustChangePassword).toBe(true);

      // Calling again should return null and not duplicate
      const secondCall = await authService.ensureDefaultAdmin('admin', 'singularity');
      expect(secondCall).toBeNull();
    });

    it('should authenticate user and return token with public profile', async () => {
      await authService.ensureDefaultAdmin('admin', 'singularity');

      const result = await authService.login('admin', 'singularity');
      expect(result.token).toBeDefined();
      expect(result.user.username).toBe('admin');
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.mustChangePassword).toBe(true);
      expect(result.user.isActive).toBe(true);

      const verified = authService.verifyToken(result.token);
      expect(verified.userId).toBe(result.user.id);
      expect(verified.role).toBe('ADMIN');
    });

    it('should throw InvalidCredentialsError on wrong password or unknown user', async () => {
      await authService.ensureDefaultAdmin('admin', 'singularity');

      await expect(authService.login('admin', 'wrong_pass')).rejects.toThrow(
        InvalidCredentialsError
      );
      await expect(authService.login('nonexistent', 'singularity')).rejects.toThrow(
        InvalidCredentialsError
      );
    });

    it('should throw AccountDisabledError when account has been deactivated by administrator', async () => {
      const admin = await authService.ensureDefaultAdmin('admin', 'singularity');
      const operator = await authService.createUser({
        username: 'sub_admin',
        password: 'Password123!',
        role: 'OPERATOR',
        isActive: true
      });

      // Disable account
      await authService.updateUser(admin!.id, operator.id, { isActive: false });

      await expect(authService.login('sub_admin', 'Password123!')).rejects.toThrow(
        AccountDisabledError
      );
    });

    it('should allow user to change password and reset mustChangePassword flag', async () => {
      await authService.ensureDefaultAdmin('admin', 'singularity');
      const loginRes = await authService.login('admin', 'singularity');

      await authService.changePassword(loginRes.user.id, 'singularity', 'NewStrongPassword2026!');

      // Login with old password should fail
      await expect(authService.login('admin', 'singularity')).rejects.toThrow(
        InvalidCredentialsError
      );

      // Login with new password should succeed and mustChangePassword is false
      const newLogin = await authService.login('admin', 'NewStrongPassword2026!');
      expect(newLogin.user.mustChangePassword).toBe(false);
    });

    it('should allow user to update their own profile (displayName and minecraftUsername)', async () => {
      const admin = await authService.ensureDefaultAdmin('admin', 'singularity');

      const updated = await authService.updateProfile(admin!.id, {
        displayName: 'Xavier CraftMaster',
        minecraftUsername: 'XavierAimacana'
      });

      expect(updated.displayName).toBe('Xavier CraftMaster');
      expect(updated.minecraftUsername).toBe('XavierAimacana');

      const fetched = authService.getUserById(admin!.id);
      expect(fetched?.displayName).toBe('Xavier CraftMaster');
      expect(fetched?.minecraftUsername).toBe('XavierAimacana');
    });

    it('should allow admin to create, update role/servers, and delete users', async () => {
      const admin = await authService.ensureDefaultAdmin('admin', 'singularity');

      // 1. Create operator
      const operator = await authService.createUser({
        username: 'operator_dan',
        password: 'DanPassword123!',
        role: 'OPERATOR',
        allowedServers: ['server-lobby']
      });

      expect(operator.username).toBe('operator_dan');
      expect(operator.role).toBe('OPERATOR');
      expect(operator.allowedServers).toEqual(['server-lobby']);

      // 2. Update operator to VIEWER with multiple servers
      const modified = await authService.updateUser(admin!.id, operator.id, {
        role: 'VIEWER',
        allowedServers: ['server-lobby', 'server-survival']
      });

      expect(modified.role).toBe('VIEWER');
      expect(modified.allowedServers).toEqual(['server-lobby', 'server-survival']);

      // 3. Delete operator
      const deleted = await authService.deleteUser(admin!.id, operator.id);
      expect(deleted).toBe(true);

      expect(authService.getUserById(operator.id)).toBeNull();

      // 4. Admin cannot delete themselves
      await expect(authService.deleteUser(admin!.id, admin!.id)).rejects.toThrow();
    });
  });
});
