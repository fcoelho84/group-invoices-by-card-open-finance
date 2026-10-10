import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CardGroup } from '../../domain/entities/card-group';
import { ErrorCode } from '../errors/error-code';
import {
  CARD_GROUP_STORE,
  type CardGroupStore,
} from '../ports/card-group-store';

@Injectable()
export class UpdateCardGroupUseCase {
  constructor(
    @Inject(CARD_GROUP_STORE)
    private readonly groups: CardGroupStore,
  ) {}

  async execute(
    userId: string,
    groupId: string,
    patch: { name?: string; cardNumbers?: string[] },
  ): Promise<CardGroup> {
    const updated = await this.groups.update(userId, groupId, {
      name: patch.name?.trim(),
      cardNumbers: patch.cardNumbers,
    });
    if (!updated) {
      throw new NotFoundException({ code: ErrorCode.GROUP_NOT_FOUND });
    }
    return updated;
  }
}
