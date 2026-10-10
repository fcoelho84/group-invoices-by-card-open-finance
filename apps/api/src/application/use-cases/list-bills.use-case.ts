import { Inject, Injectable } from '@nestjs/common';
import { buildOpenBill, type Bill } from '../../domain/entities/bill';
import {
  OPEN_FINANCE_GATEWAY,
  type OpenFinanceGateway,
} from '../ports/open-finance-gateway';

@Injectable()
export class ListBillsUseCase {
  constructor(
    @Inject(OPEN_FINANCE_GATEWAY)
    private readonly openFinance: OpenFinanceGateway,
  ) {}

  async execute(accountId: string): Promise<Bill[]> {
    const bills = await this.openFinance.listBills(accountId);
    const open = buildOpenBill(bills);
    return open ? [open, ...bills] : bills;
  }
}
