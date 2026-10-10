import { Injectable } from '@nestjs/common';
import type { ItemIdStore } from '../../application/ports/item-id-store';
import { SqliteDatabase } from './sqlite-database';

@Injectable()
export class SqliteItemIdStore implements ItemIdStore {
  constructor(private readonly sqlite: SqliteDatabase) {}

  async get(userId: string): Promise<string | null> {
    const row = this.sqlite.connection
      .prepare('SELECT item_id AS itemId FROM pluggy_item WHERE user_id = ?')
      .get(userId) as { itemId: string } | undefined;
    return row?.itemId ?? null;
  }

  async save(userId: string, itemId: string): Promise<void> {
    this.sqlite.connection
      .prepare(
        `INSERT INTO pluggy_item (user_id, item_id) VALUES (?, ?)
         ON CONFLICT(user_id) DO UPDATE SET item_id = excluded.item_id`,
      )
      .run(userId, itemId);
  }
}
