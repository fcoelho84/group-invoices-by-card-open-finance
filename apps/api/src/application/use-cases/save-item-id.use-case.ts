import { Inject, Injectable } from '@nestjs/common';
import {
  ITEM_ID_STORE,
  type ItemIdStore,
} from '../ports/item-id-store';

@Injectable()
export class SaveItemIdUseCase {
  constructor(
    @Inject(ITEM_ID_STORE)
    private readonly itemIdStore: ItemIdStore,
  ) {}

  async execute(userId: string, itemId: string): Promise<void> {
    await this.itemIdStore.save(userId, itemId);
  }
}
