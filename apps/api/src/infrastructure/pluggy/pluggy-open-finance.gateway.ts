import { Injectable } from '@nestjs/common';
import { PluggyClient } from 'pluggy-sdk';
import type { OpenFinanceGateway } from '../../application/ports/open-finance-gateway';
import type { Bill } from '../../domain/entities/bill';
import type { CreditCardAccount } from '../../domain/entities/credit-card-account';
import type { Transaction } from '../../domain/entities/transaction';

type PluggyCreditCardMeta = {
  cardNumber?: string | null;
  billId?: string | null;
  billForecastDate?: string | null;
  paymentType?: string | null;
  totalInstallments?: number | null;
  installmentNumber?: number | null;
  purchaseDate?: Date | string | null;
};

@Injectable()
export class PluggyOpenFinanceGateway implements OpenFinanceGateway {
  private client(): PluggyClient {
    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET are required');
    }
    return new PluggyClient({ clientId, clientSecret });
  }

  async createConnectToken(itemId?: string): Promise<string> {
    const result = await this.client().createConnectToken(itemId);
    return result.accessToken;
  }

  async listCreditCardAccounts(itemId: string): Promise<CreditCardAccount[]> {
    const response = await this.client().fetchAccounts(itemId, 'CREDIT');
    const results = response.results ?? [];
    return results
      .filter((account) => account.subtype === 'CREDIT_CARD')
      .map((account) => ({
        id: account.id,
        name: account.name,
        number: account.number ?? null,
      }));
  }

  async listBankAccounts(itemId: string): Promise<CreditCardAccount[]> {
    const response = await this.client().fetchAccounts(itemId, 'BANK');
    const results = response.results ?? [];
    return results.map((account) => ({
      id: account.id,
      name: account.name,
      number: account.number ?? null,
    }));
  }

  async listBills(accountId: string): Promise<Bill[]> {
    const response = await this.client().fetchCreditCardBills(accountId);
    const results = response.results ?? [];
    return results.map((bill) => ({
      id: bill.id,
      dueDate: toDateOnly(bill.dueDate),
      closingDate: bill.billClosingDate
        ? toDateOnly(bill.billClosingDate)
        : null,
      totalAmount: bill.totalAmount,
      totalAmountCurrencyCode: bill.totalAmountCurrencyCode,
    }));
  }

  async listTransactions(accountId: string): Promise<Transaction[]> {
    const client = this.client();
    const results = [];
    let after: string | undefined;

    for (;;) {
      const page = await client.fetchTransactionsCursor(accountId, { after });
      results.push(...(page.results ?? []));
      if (!page.next) break;
      const cursor = new URL(page.next, 'https://api.pluggy.ai').searchParams.get(
        'after',
      );
      if (!cursor) break;
      after = cursor;
    }

    return results.map((tx) => {
      const meta = tx.creditCardMetadata as PluggyCreditCardMeta | null;
      return {
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        date: toDateOnly(tx.date),
        cardNumber: meta?.cardNumber ?? null,
        billId: meta?.billId ?? null,
        billForecastDate: meta?.billForecastDate ?? null,
        installment: isInstallment(meta),
        installmentNumber: meta?.installmentNumber ?? null,
        totalInstallments: meta?.totalInstallments ?? null,
        purchaseDate: meta?.purchaseDate ? toDateOnly(meta.purchaseDate) : null,
      };
    });
  }
}

function isInstallment(meta: PluggyCreditCardMeta | null): boolean {
  if (!meta) return false;
  if (meta.paymentType === 'INSTALLMENT') return true;
  return (meta.totalInstallments ?? 0) > 1;
}

function toDateOnly(value: Date | string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  const iso = date.toISOString();
  if (/T00:00:00(\.\d+)?Z$/.test(iso)) {
    return iso.slice(0, 10);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
