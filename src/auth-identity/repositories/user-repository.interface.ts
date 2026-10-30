import type { User, UserPublic, UserRole } from '../models/user.js';

export interface IUserRepository {
  findById(id: string): User | null;
  findByUsername(username: string): User | null;
  create(user: Omit<User, 'createdAt' | 'updatedAt'>): User;
  updatePassword(id: string, newPasswordHash: string, mustChangePassword?: boolean): void;
  updateRole(id: string, role: UserRole): void;
  list(): UserPublic[];
  delete(id: string): boolean;
  count(): number;
}
