import type { User } from '../../domain/entities/user';

export const USER_STORE = Symbol('USER_STORE');

export interface UserStore {
  create(email: string, passwordHash: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}
