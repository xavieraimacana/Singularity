export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
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
}
