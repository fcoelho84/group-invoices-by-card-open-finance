import { Inject, Injectable } from '@nestjs/common';
import {
  ITEM_ID_STORE,
  type ItemIdStore,
} from '../ports/item-id-store';

@Injectable()
export class GetItemStatusUseCase {
  constructor(
    @Inject(ITEM_ID_STORE)
    private readonly itemIdStore: ItemIdStore,
  ) {}

  async execute(userId: string): Promise<{ itemId: string | null }> {
    const itemId = await this.itemIdStore.get(userId);
    return { itemId };
  }
}
