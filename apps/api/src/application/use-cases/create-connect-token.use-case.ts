import { Inject, Injectable } from '@nestjs/common';
import {
  ITEM_ID_STORE,
  type ItemIdStore,
} from '../ports/item-id-store';
import {
  OPEN_FINANCE_GATEWAY,
  type OpenFinanceGateway,
} from '../ports/open-finance-gateway';

@Injectable()
export class CreateConnectTokenUseCase {
  constructor(
    @Inject(OPEN_FINANCE_GATEWAY)
    private readonly openFinance: OpenFinanceGateway,
    @Inject(ITEM_ID_STORE)
    private readonly itemIdStore: ItemIdStore,
  ) {}

  async execute(userId: string): Promise<{ accessToken: string }> {
    const itemId = await this.itemIdStore.get(userId);
    const accessToken = await this.openFinance.createConnectToken(
      itemId ?? undefined,
    );
    return { accessToken };
  }
}
