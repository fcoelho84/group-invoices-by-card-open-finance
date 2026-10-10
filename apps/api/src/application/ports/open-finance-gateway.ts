import type { Bill } from '../../domain/entities/bill';
import type { CreditCardAccount } from '../../domain/entities/credit-card-account';
import type { Transaction } from '../../domain/entities/transaction';

export const OPEN_FINANCE_GATEWAY = Symbol('OPEN_FINANCE_GATEWAY');

export interface OpenFinanceGateway {
  createConnectToken(itemId?: string): Promise<string>;
  listCreditCardAccounts(itemId: string): Promise<CreditCardAccount[]>;
  listBankAccounts(itemId: string): Promise<CreditCardAccount[]>;
  listBills(accountId: string): Promise<Bill[]>;
  listTransactions(accountId: string): Promise<Transaction[]>;
}
