import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../errors/error-code';
import {
  OPEN_BILL_ID,
  buildOpenBill,
  openBillRange,
  type Bill,
} from '../../domain/entities/bill';
import type {
  BillByCards,
  CardInvoice,
  GroupInvoice,
  OutsideCardInvoice,
} from '../../domain/entities/card-invoice';
import type { Transaction } from '../../domain/entities/transaction';
import {
  CARD_GROUP_STORE,
  type CardGroupStore,
} from '../ports/card-group-store';
import {
  ITEM_ID_STORE,
  type ItemIdStore,
} from '../ports/item-id-store';
import {
  OPEN_FINANCE_GATEWAY,
  type OpenFinanceGateway,
} from '../ports/open-finance-gateway';

const UNKNOWN_CARD = 'desconhecido';
const OUTSIDE_CARD_NAME = 'Fora do cartão';

@Injectable()
export class GetBillByCardsUseCase {
  constructor(
    @Inject(OPEN_FINANCE_GATEWAY)
    private readonly openFinance: OpenFinanceGateway,
    @Inject(CARD_GROUP_STORE)
    private readonly groups: CardGroupStore,
    @Inject(ITEM_ID_STORE)
    private readonly itemIdStore: ItemIdStore,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    billId: string,
  ): Promise<BillByCards> {
    const closedBills = await this.openFinance.listBills(accountId);
    const bill = resolveBill(billId, closedBills);
    if (!bill) {
      throw new NotFoundException({ code: ErrorCode.BILL_NOT_FOUND });
    }

    const [transactions, cardGroups, outsideCard] = await Promise.all([
      this.openFinance.listTransactions(accountId),
      this.groups.listByAccount(userId, accountId),
      this.loadOutsideCard(userId, bill, closedBills),
    ]);
    return this.groupByCard(
      bill,
      closedBills,
      transactions,
      cardGroups,
      outsideCard,
    );
  }

  private async loadOutsideCard(
    userId: string,
    bill: Bill,
    closedBills: Bill[],
  ): Promise<OutsideCardInvoice | null> {
    const range = rangeForBill(bill, closedBills);
    if (!range) return null;

    const itemId = await this.itemIdStore.get(userId);
    if (!itemId) return null;

    const bankAccounts = await this.openFinance.listBankAccounts(itemId);
    if (bankAccounts.length === 0) return null;

    const pages = await Promise.all(
      bankAccounts.map((account) =>
        this.openFinance.listTransactions(account.id),
      ),
    );
    const transactions = pages
      .flat()
      .filter((tx) => {
        if (isPaymentReceived(tx)) return false;
        const day = tx.date.slice(0, 10);
        return day > range.from && day <= range.to;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    if (transactions.length === 0) return null;

    return {
      name: OUTSIDE_CARD_NAME,
      totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      transactions,
    };
  }

  private groupByCard(
    bill: Bill,
    closedBills: Bill[],
    transactions: Transaction[],
    cardGroups: { id: string; name: string; cardNumbers: string[] }[],
    outsideCard: OutsideCardInvoice | null,
  ): BillByCards {
    const forBill = selectBillTransactions(transactions, bill, closedBills);
    const byCard = new Map<string, Transaction[]>();

    for (const tx of forBill) {
      const key = tx.cardNumber?.trim() || UNKNOWN_CARD;
      const list = byCard.get(key);
      if (list) {
        list.push(tx);
        continue;
      }
      byCard.set(key, [tx]);
    }

    const cardInvoices = new Map<string, CardInvoice>();
    for (const [cardNumber, txs] of byCard.entries()) {
      cardInvoices.set(cardNumber, {
        cardNumber,
        totalAmount: txs.reduce((sum, tx) => sum + tx.amount, 0),
        transactions: txs,
      });
    }

    const assigned = new Set<string>();
    const groups: GroupInvoice[] = cardGroups.map((group) => {
      const txs: Transaction[] = [];
      for (const cardNumber of group.cardNumbers) {
        const card = cardInvoices.get(cardNumber);
        if (!card) continue;
        assigned.add(cardNumber);
        txs.push(...card.transactions);
      }
      txs.sort((a, b) => a.date.localeCompare(b.date));
      return {
        id: group.id,
        name: group.name,
        cardNumbers: group.cardNumbers,
        totalAmount: txs.reduce((sum, tx) => sum + tx.amount, 0),
        transactions: txs,
      };
    });

    const ungroupedCards = [...cardInvoices.values()]
      .filter((card) => !assigned.has(card.cardNumber))
      .sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));

    const totalAmount = forBill.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      bill: {
        ...bill,
        totalAmount: bill.id === OPEN_BILL_ID ? totalAmount : bill.totalAmount,
      },
      groups,
      ungroupedCards,
      outsideCard,
      hasUnknownCard: byCard.has(UNKNOWN_CARD),
    };
  }
}

function resolveBill(billId: string, closedBills: Bill[]): Bill | null {
  if (billId === OPEN_BILL_ID) return buildOpenBill(closedBills);
  return closedBills.find((item) => item.id === billId) ?? null;
}

function selectBillTransactions(
  transactions: Transaction[],
  bill: Bill,
  closedBills: Bill[],
): Transaction[] {
  const matched = dropRefundedPairs(
    transactions.filter((tx) => belongsToBill(tx, bill, closedBills)),
    transactions,
  );
  if (bill.id !== OPEN_BILL_ID) return matched;
  return dropDuplicateForecastInstallments(matched);
}

function dropRefundedPairs(
  billTransactions: Transaction[],
  allTransactions: Transaction[],
): Transaction[] {
  const removedIds = new Set<string>();
  const removedPurchaseKeys = new Set<string>();

  for (const refund of allTransactions) {
    if (!isRefund(refund)) continue;
    const purchase = findRefundedPurchase(refund, allTransactions, removedIds);
    if (!purchase) continue;

    removedIds.add(refund.id);
    removedIds.add(purchase.id);
    const key = installmentPurchaseKey(purchase);
    if (key) removedPurchaseKeys.add(key);
  }

  return billTransactions.filter((tx) => {
    if (removedIds.has(tx.id)) return false;
    const key = installmentPurchaseKey(tx);
    return !(key && removedPurchaseKeys.has(key));
  });
}

function findRefundedPurchase(
  refund: Transaction,
  transactions: Transaction[],
  removedIds: Set<string>,
): Transaction | undefined {
  const candidates = transactions.filter(
    (tx) =>
      !removedIds.has(tx.id) &&
      tx.id !== refund.id &&
      tx.amount > 0 &&
      matchesRefund(tx, refund),
  );
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  return [...candidates].sort((a, b) => {
    const aFirst = a.installmentNumber === 1 ? 0 : 1;
    const bFirst = b.installmentNumber === 1 ? 0 : 1;
    if (aFirst !== bFirst) return aFirst - bFirst;
    return refundDateDistance(a, refund) - refundDateDistance(b, refund);
  })[0];
}

function refundDateDistance(purchase: Transaction, refund: Transaction): number {
  const purchaseDay = purchase.purchaseDate ?? purchase.date;
  return Math.abs(dateValue(purchaseDay) - dateValue(refund.date));
}

function dateValue(dateOnly: string): number {
  return Date.parse(`${dateOnly.slice(0, 10)}T00:00:00`);
}

function isRefund(tx: Transaction): boolean {
  return tx.amount < 0 && /estorno|de volta/i.test(tx.description);
}

function matchesRefund(purchase: Transaction, refund: Transaction): boolean {
  if ((purchase.cardNumber ?? '') !== (refund.cardNumber ?? '')) return false;
  if (Math.abs(purchase.amount + refund.amount) > 0.001) return false;

  const target = refundTarget(refund.description);
  if (!target) return false;

  if (target === 'compra') {
    const purchaseDay = purchase.purchaseDate ?? purchase.date;
    return purchaseDay <= refund.date;
  }

  const purchaseDesc = purchase.description.toLowerCase();
  if (purchaseDesc.includes(target) || target.includes(purchaseDesc)) {
    return true;
  }
  return /iof/i.test(refund.description) && /iof/i.test(purchase.description);
}

function refundTarget(description: string): string {
  return description
    .replace(/^estorno\s+(de\s+)?/i, '')
    .replace(/^iof\s+de\s+volta\s+de\s+/i, '')
    .replace(/\s*-\s*nupay\s*$/i, '')
    .trim()
    .toLowerCase();
}

function belongsToBill(
  tx: Transaction,
  bill: Bill,
  closedBills: Bill[],
): boolean {
  if (isPaymentReceived(tx)) return false;

  if (bill.id === OPEN_BILL_ID) {
    const open = openBillRange(closedBills);
    if (!open) return false;
    if (tx.billForecastDate === open.forecastMonth) return true;
    if (tx.billForecastDate || tx.billId) return false;
    const day = tx.date.slice(0, 10);
    return day > open.from && day <= open.to;
  }

  const range = closedBillRange(bill, closedBills);
  if (tx.installment) return tx.billId === bill.id;
  if (!range) return tx.billId === bill.id;
  const day = tx.date.slice(0, 10);
  return day > range.from && day <= range.to;
}

function dropDuplicateForecastInstallments(
  transactions: Transaction[],
): Transaction[] {
  return transactions.filter((tx) => {
    if (!tx.installment || !tx.installmentNumber || tx.installmentNumber <= 1) {
      return true;
    }
    const key = installmentPurchaseKey(tx);
    if (!key || !tx.billForecastDate) return true;
    return !transactions.some(
      (other) =>
        other.id !== tx.id &&
        other.installment &&
        other.billForecastDate === tx.billForecastDate &&
        (other.installmentNumber ?? 0) < tx.installmentNumber! &&
        installmentPurchaseKey(other) === key,
    );
  });
}

function installmentPurchaseKey(tx: Transaction): string | null {
  if (!tx.cardNumber || !tx.totalInstallments) return null;
  if (tx.purchaseDate) {
    return `${tx.cardNumber}|${tx.purchaseDate}|${tx.totalInstallments}`;
  }
  const base = tx.description.replace(/\s+\d+\/\d+\s*$/, '').trim().toLowerCase();
  if (!base) return null;
  return `${tx.cardNumber}|${base}|${tx.totalInstallments}`;
}

function isPaymentReceived(tx: Transaction): boolean {
  return /pagamento\s*recebido/i.test(tx.description);
}

function rangeForBill(
  bill: Bill,
  closedBills: Bill[],
): { from: string; to: string } | null {
  if (bill.id === OPEN_BILL_ID) {
    const open = openBillRange(closedBills);
    return open ? { from: open.from, to: open.to } : null;
  }
  return closedBillRange(bill, closedBills);
}

function closedBillRange(
  bill: Bill,
  closedBills: Bill[],
): { from: string; to: string } | null {
  if (!bill.closingDate) return null;

  const sorted = [...closedBills]
    .filter((item) => item.closingDate)
    .sort((a, b) => a.closingDate!.localeCompare(b.closingDate!));
  const index = sorted.findIndex((item) => item.id === bill.id);
  if (index < 0) return null;

  const previous = index > 0 ? sorted[index - 1] : null;
  return {
    from: previous?.closingDate ?? '0000-01-01',
    to: bill.closingDate,
  };
}
