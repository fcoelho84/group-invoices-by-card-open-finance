import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CardGroupStore } from '../../application/ports/card-group-store';
import type { CardGroup } from '../../domain/entities/card-group';
import { SqliteDatabase } from './sqlite-database';

type GroupRow = {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  createdAt: string;
};

@Injectable()
export class SqliteCardGroupStore implements CardGroupStore {
  constructor(private readonly sqlite: SqliteDatabase) {}

  async listByAccount(userId: string, accountId: string): Promise<CardGroup[]> {
    const rows = this.sqlite.connection
      .prepare(
        `SELECT id, user_id AS userId, account_id AS accountId, name,
                created_at AS createdAt
         FROM card_group
         WHERE user_id = ? AND account_id = ?
         ORDER BY created_at ASC`,
      )
      .all(userId, accountId) as GroupRow[];
    return rows.map((row) => this.withMembers(row));
  }

  async findById(userId: string, groupId: string): Promise<CardGroup | null> {
    const row = this.sqlite.connection
      .prepare(
        `SELECT id, user_id AS userId, account_id AS accountId, name,
                created_at AS createdAt
         FROM card_group
         WHERE id = ? AND user_id = ?`,
      )
      .get(groupId, userId) as GroupRow | undefined;
    if (!row) return null;
    return this.withMembers(row);
  }

  async create(
    userId: string,
    accountId: string,
    name: string,
    cardNumbers: string[],
  ): Promise<CardGroup> {
    const group: GroupRow = {
      id: randomUUID(),
      userId,
      accountId,
      name,
      createdAt: new Date().toISOString(),
    };

    const run = this.sqlite.connection.transaction(() => {
      this.sqlite.connection
        .prepare(
          `INSERT INTO card_group (id, user_id, account_id, name, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          group.id,
          group.userId,
          group.accountId,
          group.name,
          group.createdAt,
        );
      this.replaceMembers(userId, accountId, group.id, cardNumbers);
    });
    run();

    return this.withMembers(group);
  }

  async update(
    userId: string,
    groupId: string,
    patch: { name?: string; cardNumbers?: string[] },
  ): Promise<CardGroup | null> {
    const existing = await this.findById(userId, groupId);
    if (!existing) return null;

    const run = this.sqlite.connection.transaction(() => {
      if (patch.name !== undefined) {
        this.sqlite.connection
          .prepare(
            `UPDATE card_group SET name = ? WHERE id = ? AND user_id = ?`,
          )
          .run(patch.name, groupId, userId);
      }
      if (patch.cardNumbers !== undefined) {
        this.replaceMembers(
          userId,
          existing.accountId,
          groupId,
          patch.cardNumbers,
        );
      }
    });
    run();

    return this.findById(userId, groupId);
  }

  async delete(userId: string, groupId: string): Promise<boolean> {
    const result = this.sqlite.connection
      .prepare(`DELETE FROM card_group WHERE id = ? AND user_id = ?`)
      .run(groupId, userId);
    return result.changes > 0;
  }

  private withMembers(row: GroupRow): CardGroup {
    const members = this.sqlite.connection
      .prepare(
        `SELECT card_number AS cardNumber FROM card_group_member
         WHERE group_id = ? ORDER BY card_number ASC`,
      )
      .all(row.id) as { cardNumber: string }[];
    return {
      ...row,
      cardNumbers: members.map((m) => m.cardNumber),
    };
  }

  private replaceMembers(
    userId: string,
    accountId: string,
    groupId: string,
    cardNumbers: string[],
  ) {
    const unique = [
      ...new Set(cardNumbers.map((n) => n.trim()).filter(Boolean)),
    ];

    if (unique.length > 0) {
      this.sqlite.connection
        .prepare(
          `DELETE FROM card_group_member
           WHERE group_id IN (
             SELECT id FROM card_group WHERE user_id = ? AND account_id = ?
           )
           AND card_number IN (${unique.map(() => '?').join(',')})`,
        )
        .run(userId, accountId, ...unique);
    }

    this.sqlite.connection
      .prepare(`DELETE FROM card_group_member WHERE group_id = ?`)
      .run(groupId);

    const insert = this.sqlite.connection.prepare(
      `INSERT INTO card_group_member (group_id, card_number) VALUES (?, ?)`,
    );
    for (const cardNumber of unique) {
      insert.run(groupId, cardNumber);
    }
  }
}
