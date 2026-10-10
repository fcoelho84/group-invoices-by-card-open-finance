import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../errors/error-code';
import {
  CARD_GROUP_STORE,
  type CardGroupStore,
} from '../ports/card-group-store';

@Injectable()
export class DeleteCardGroupUseCase {
  constructor(
    @Inject(CARD_GROUP_STORE)
    private readonly groups: CardGroupStore,
  ) {}

  async execute(userId: string, groupId: string): Promise<void> {
    const deleted = await this.groups.delete(userId, groupId);
    if (!deleted) {
      throw new NotFoundException({ code: ErrorCode.GROUP_NOT_FOUND });
    }
  }
}
