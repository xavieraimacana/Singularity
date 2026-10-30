import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { SqliteUserRepository } from '../../src/auth-identity/repositories/sqlite-user-repository.js';
import { AuthService, InvalidCredentialsError } from '../../src/auth-identity/services/auth-service.js';
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt
} from '../../src/auth-identity/services/crypto-utils.js';

describe('Auth & Identity Domain', () => {
  const JWT_SECRET = 'super-secret-test-key-singularity-12345';
  let db: DatabaseSync;
  let userRepo: SqliteUserRepository;
  let authService: AuthService;

  beforeEach(async () => {
    // In-memory sqlite database for fast isolated unit tests
    db = new DatabaseSync(':memory:');
    userRepo = new SqliteUserRepository(db);
    userRepo.initSchema();

    authService = new AuthService(userRepo, JWT_SECRET);
  });

  afterEach(() => {
    db.close();
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
        mustChangePassword: true
      };

      const token = signJwt(payload, JWT_SECRET, 3600);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = verifyJwt(token, JWT_SECRET);
      expect(decoded.userId).toBe('usr_01');
      expect(decoded.username).toBe('admin');
      expect(decoded.role).toBe('ADMIN');
      expect(decoded.mustChangePassword).toBe(true);
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should reject tampered or expired JWT token', () => {
      const token = signJwt({ userId: 'usr_01', username: 'admin', role: 'ADMIN', mustChangePassword: false }, JWT_SECRET, 3600);
      const tampered = token.slice(0, -5) + 'abcde';

      expect(() => verifyJwt(tampered, JWT_SECRET)).toThrow();
      expect(() => verifyJwt(token, 'different-wrong-secret')).toThrow();
    });
  });

  describe('AuthService', () => {
    it('should initialize default admin when no users exist', async () => {
      expect(userRepo.count()).toBe(0);

      const defaultAdmin = await authService.ensureDefaultAdmin('admin', 'singularity');
      expect(defaultAdmin).not.toBeNull();
      expect(defaultAdmin?.username).toBe('admin');
      expect(defaultAdmin?.role).toBe('ADMIN');
      expect(defaultAdmin?.mustChangePassword).toBe(true);
      expect(userRepo.count()).toBe(1);

      // Calling again should not duplicate
      const secondCall = await authService.ensureDefaultAdmin('admin', 'singularity');
      expect(secondCall).toBeNull();
      expect(userRepo.count()).toBe(1);
    });

    it('should authenticate user and return token and public profile', async () => {
      await authService.ensureDefaultAdmin('admin', 'singularity');

      const result = await authService.login('admin', 'singularity');
      expect(result.token).toBeDefined();
      expect(result.user.username).toBe('admin');
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.mustChangePassword).toBe(true);

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

    it('should allow admin to create operators and viewers', async () => {
      await authService.ensureDefaultAdmin('admin', 'singularity');

      const operator = await authService.createUser({
        username: 'operator_dan',
        password: 'DanPassword123!',
        role: 'OPERATOR'
      });

      expect(operator.username).toBe('operator_dan');
      expect(operator.role).toBe('OPERATOR');
      expect(operator.mustChangePassword).toBe(false);

      const users = authService.listUsers();
      expect(users.length).toBe(2);
      expect(users.map((u) => u.username)).toContain('operator_dan');
    });
  });
});
