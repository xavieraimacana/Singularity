import { randomUUID } from 'node:crypto';
import type { IUserRepository } from '../repositories/user-repository.interface.js';
import type {
  AuthTokenPayload,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateProfileRequest,
  LoginResult,
  User,
  UserPublic
} from '../models/user.js';
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt
} from './crypto-utils.js';

export class InvalidCredentialsError extends Error {
  constructor(message = 'Credenciales de acceso inválidas') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountDisabledError extends Error {
  constructor(message = 'Esta cuenta ha sido deshabilitada por un administrador') {
    super(message);
    this.name = 'AccountDisabledError';
  }
}

export class UserNotFoundError extends Error {
  constructor(message = 'Usuario no encontrado') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class UserAlreadyExistsError extends Error {
  constructor(username: string) {
    super(`El usuario '${username}' ya existe`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class WeakPasswordError extends Error {
  constructor(message = 'La contraseña debe tener al menos 8 caracteres') {
    super(message);
    this.name = 'WeakPasswordError';
  }
}

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly jwtSecret: string = process.env['SINGULARITY_JWT_SECRET'] || 'singularity-default-dev-secret-change-in-prod'
  ) {}

  /**
   * Initializes the default administrator user if no users exist in the database.
   * Forces `mustChangePassword: true` on first login for enterprise security.
   */
  async ensureDefaultAdmin(
    defaultUsername: string = 'admin',
    defaultPassword: string = 'singularity'
  ): Promise<UserPublic | null> {
    if (this.userRepo.count() > 0) {
      return null;
    }

    const passwordHash = await hashPassword(defaultPassword);
    const adminUser = this.userRepo.create({
      id: `usr_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      username: defaultUsername,
      passwordHash,
      role: 'ADMIN',
      mustChangePassword: true,
      isActive: true,
      displayName: 'Administrador Principal',
      allowedServers: ['*']
    });

    return {
      id: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
      mustChangePassword: adminUser.mustChangePassword,
      isActive: adminUser.isActive,
      displayName: adminUser.displayName,
      minecraftUsername: adminUser.minecraftUsername,
      allowedServers: adminUser.allowedServers,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt
    };
  }

  /**
   * Authenticates a user with username and password.
   * Returns a signed JWT and user public profile.
   */
  async login(username: string, password: string): Promise<LoginResult> {
    const user = this.userRepo.findByUsername(username);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (user.isActive === false) {
      throw new AccountDisabledError();
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    const token = signJwt(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        allowedServers: user.allowedServers || ['*']
      },
      this.jwtSecret
    );

    const publicUser: UserPublic = {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
      displayName: user.displayName,
      minecraftUsername: user.minecraftUsername,
      allowedServers: user.allowedServers || ['*'],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return {
      user: publicUser,
      token
    };
  }

  /**
   * Changes the password of an existing user and clears the mustChangePassword flag.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError('La contraseña actual es incorrecta');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new WeakPasswordError();
    }

    const newHash = await hashPassword(newPassword);
    this.userRepo.updatePassword(userId, newHash, false);
  }

  /**
   * Updates an authenticated user's profile details (Display Name, Minecraft skin username).
   */
  async updateProfile(userId: string, request: UpdateProfileRequest): Promise<UserPublic> {
    const user = this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const updated = this.userRepo.updateProfile(userId, {
      displayName: request.displayName,
      minecraftUsername: request.minecraftUsername
    });

    if (!updated) {
      throw new UserNotFoundError();
    }

    return {
      id: updated.id,
      username: updated.username,
      role: updated.role,
      mustChangePassword: updated.mustChangePassword,
      isActive: updated.isActive,
      displayName: updated.displayName,
      minecraftUsername: updated.minecraftUsername,
      allowedServers: updated.allowedServers,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  }

  /**
   * Creates a new user (operator or viewer) by an administrator.
   */
  async createUser(request: CreateUserRequest): Promise<UserPublic> {
    const existing = this.userRepo.findByUsername(request.username);
    if (existing) {
      throw new UserAlreadyExistsError(request.username);
    }

    if (!request.password || request.password.length < 8) {
      throw new WeakPasswordError();
    }

    const passwordHash = await hashPassword(request.password);
    const newUser = this.userRepo.create({
      id: `usr_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      username: request.username,
      passwordHash,
      role: request.role,
      mustChangePassword: request.mustChangePassword ?? false,
      isActive: request.isActive !== false,
      displayName: request.displayName,
      minecraftUsername: request.minecraftUsername,
      allowedServers: request.allowedServers || ['*']
    });

    return {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      mustChangePassword: newUser.mustChangePassword,
      isActive: newUser.isActive,
      displayName: newUser.displayName,
      minecraftUsername: newUser.minecraftUsername,
      allowedServers: newUser.allowedServers,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };
  }

  /**
   * Updates a user's role, status (active/disabled), or server permissions by an administrator.
   */
  async updateUser(adminUserId: string, targetUserId: string, request: UpdateUserRequest): Promise<UserPublic> {
    const admin = this.userRepo.findById(adminUserId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Solo los administradores pueden gestionar usuarios');
    }

    const target = this.userRepo.findById(targetUserId);
    if (!target) {
      throw new UserNotFoundError();
    }

    // Safety: Prevent admin from deactivating or demoting themselves
    if (adminUserId === targetUserId) {
      if (request.isActive === false) {
        throw new Error('No puedes deshabilitar tu propia cuenta de administrador');
      }
      if (request.role && request.role !== 'ADMIN') {
        throw new Error('No puedes cambiar tu propio rol de administrador');
      }
    }

    if (request.newPassword) {
      if (request.newPassword.length < 8) {
        throw new WeakPasswordError();
      }
      const newHash = await hashPassword(request.newPassword);
      this.userRepo.updatePassword(targetUserId, newHash, request.mustChangePassword ?? false);
    }

    const updated = this.userRepo.update(targetUserId, {
      role: request.role,
      isActive: request.isActive,
      displayName: request.displayName,
      minecraftUsername: request.minecraftUsername,
      allowedServers: request.allowedServers,
      mustChangePassword: request.mustChangePassword
    });

    if (!updated) {
      throw new UserNotFoundError();
    }

    return {
      id: updated.id,
      username: updated.username,
      role: updated.role,
      mustChangePassword: updated.mustChangePassword,
      isActive: updated.isActive,
      displayName: updated.displayName,
      minecraftUsername: updated.minecraftUsername,
      allowedServers: updated.allowedServers,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  }

  /**
   * Deletes a user by an administrator.
   */
  async deleteUser(adminUserId: string, targetUserId: string): Promise<boolean> {
    const admin = this.userRepo.findById(adminUserId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Solo los administradores pueden eliminar usuarios');
    }

    if (adminUserId === targetUserId) {
      throw new Error('No puedes eliminar tu propia cuenta');
    }

    return this.userRepo.delete(targetUserId);
  }

  /**
   * Lists all registered users (excluding sensitive password hashes).
   */
  listUsers(): UserPublic[] {
    return this.userRepo.list();
  }

  /**
   * Verifies and decodes an auth token.
   */
  verifyToken(token: string): AuthTokenPayload {
    return verifyJwt(token, this.jwtSecret);
  }

  /**
   * Finds a user by ID.
   */
  getUserById(userId: string): User | null {
    return this.userRepo.findById(userId);
  }
}
