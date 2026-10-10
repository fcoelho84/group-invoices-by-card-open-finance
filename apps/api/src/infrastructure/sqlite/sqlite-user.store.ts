import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { UserStore } from '../../application/ports/user-store';
import type { User } from '../../domain/entities/user';
import { SqliteDatabase } from './sqlite-database';

@Injectable()
export class SqliteUserStore implements UserStore {
  constructor(private readonly sqlite: SqliteDatabase) {}

  async create(email: string, passwordHash: string): Promise<User> {
    const user: User = {
      id: randomUUID(),
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.sqlite.connection
      .prepare(
        `INSERT INTO user (id, email, password_hash, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(user.id, user.email, user.passwordHash, user.createdAt);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.sqlite.connection
      .prepare(
        `SELECT id, email, password_hash AS passwordHash, created_at AS createdAt
         FROM user WHERE email = ?`,
      )
      .get(email) as User | undefined;
    return row ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const row = this.sqlite.connection
      .prepare(
        `SELECT id, email, password_hash AS passwordHash, created_at AS createdAt
         FROM user WHERE id = ?`,
      )
      .get(id) as User | undefined;
    return row ?? null;
  }
}
