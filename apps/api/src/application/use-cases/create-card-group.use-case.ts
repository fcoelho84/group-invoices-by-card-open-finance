import { Inject, Injectable } from '@nestjs/common';
import type { CardGroup } from '../../domain/entities/card-group';
import {
  CARD_GROUP_STORE,
  type CardGroupStore,
} from '../ports/card-group-store';

@Injectable()
export class CreateCardGroupUseCase {
  constructor(
    @Inject(CARD_GROUP_STORE)
    private readonly groups: CardGroupStore,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    name: string,
    cardNumbers: string[],
  ): Promise<CardGroup> {
    return this.groups.create(userId, accountId, name.trim(), cardNumbers);
  }
}
