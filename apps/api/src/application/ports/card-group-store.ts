import type { CardGroup } from '../../domain/entities/card-group';

export const CARD_GROUP_STORE = Symbol('CARD_GROUP_STORE');

export interface CardGroupStore {
  listByAccount(userId: string, accountId: string): Promise<CardGroup[]>;
  findById(userId: string, groupId: string): Promise<CardGroup | null>;
  create(
    userId: string,
    accountId: string,
    name: string,
    cardNumbers: string[],
  ): Promise<CardGroup>;
  update(
    userId: string,
    groupId: string,
    patch: { name?: string; cardNumbers?: string[] },
  ): Promise<CardGroup | null>;
  delete(userId: string, groupId: string): Promise<boolean>;
}
