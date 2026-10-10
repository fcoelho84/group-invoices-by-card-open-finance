import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

@Injectable()
export class SqliteDatabase implements OnModuleInit, OnModuleDestroy {
  private db!: Database.Database;

  onModuleInit() {
    const path = resolve(
      process.cwd(),
      process.env.SQLITE_PATH ?? './data/app.db',
    );
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pluggy_item (
        user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS card_group (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS card_group_member (
        group_id TEXT NOT NULL REFERENCES card_group(id) ON DELETE CASCADE,
        card_number TEXT NOT NULL,
        PRIMARY KEY (group_id, card_number)
      );
    `);
  }

  onModuleDestroy() {
    this.db?.close();
  }

  get connection(): Database.Database {
    return this.db;
  }
}
