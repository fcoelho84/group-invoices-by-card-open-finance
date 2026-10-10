import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../errors/error-code';
import type { CreditCardAccount } from '../../domain/entities/credit-card-account';
import {
  ITEM_ID_STORE,
  type ItemIdStore,
} from '../ports/item-id-store';
import {
  OPEN_FINANCE_GATEWAY,
  type OpenFinanceGateway,
} from '../ports/open-finance-gateway';

@Injectable()
export class ListCreditCardAccountsUseCase {
  constructor(
    @Inject(OPEN_FINANCE_GATEWAY)
    private readonly openFinance: OpenFinanceGateway,
    @Inject(ITEM_ID_STORE)
    private readonly itemIdStore: ItemIdStore,
  ) {}

  async execute(userId: string): Promise<CreditCardAccount[]> {
    const itemId = await this.itemIdStore.get(userId);
    if (!itemId) {
      throw new NotFoundException({ code: ErrorCode.ITEM_NOT_FOUND });
    }
    return this.openFinance.listCreditCardAccounts(itemId);
  }
}
