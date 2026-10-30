export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  mustChangePassword: boolean;
  isActive: boolean;
  displayName?: string;
  minecraftUsername?: string;
  allowedServers: string[]; // ['*'] for all, or array of server instance IDs
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  isActive: boolean;
  displayName?: string;
  minecraftUsername?: string;
  allowedServers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  allowedServers: string[];
  iat: number;
  exp: number;
}

export interface LoginResult {
  user: UserPublic;
  token: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  mustChangePassword?: boolean;
  isActive?: boolean;
  displayName?: string;
  minecraftUsername?: string;
  allowedServers?: string[];
}

export interface UpdateUserRequest {
  role?: UserRole;
  isActive?: boolean;
  displayName?: string;
  minecraftUsername?: string;
  allowedServers?: string[];
  mustChangePassword?: boolean;
  newPassword?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  minecraftUsername?: string;
}
