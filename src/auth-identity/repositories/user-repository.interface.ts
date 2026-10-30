import type { User, UserPublic, UserRole } from '../models/user.js';

export interface IUserRepository {
  findById(id: string): User | null;
  findByUsername(username: string): User | null;
  create(user: Omit<User, 'createdAt' | 'updatedAt'>): User;
  updatePassword(id: string, newPasswordHash: string, mustChangePassword?: boolean): void;
  updateRole(id: string, role: UserRole): void;
  update(id: string, updates: Partial<Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'updatedAt'>>): User | null;
  updateProfile(id: string, profile: { displayName?: string; minecraftUsername?: string }): User | null;
  updateStatus(id: string, isActive: boolean): void;
  list(): UserPublic[];
  delete(id: string): boolean;
  count(): number;
}
