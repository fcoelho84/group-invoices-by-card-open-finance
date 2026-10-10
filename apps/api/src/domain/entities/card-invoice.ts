import type { Transaction } from './transaction';

export type CardInvoice = {
  cardNumber: string;
  totalAmount: number;
  transactions: Transaction[];
};

export type GroupInvoice = {
  id: string;
  name: string;
  cardNumbers: string[];
  totalAmount: number;
  transactions: Transaction[];
};

export type OutsideCardInvoice = {
  name: string;
  totalAmount: number;
  transactions: Transaction[];
};

export type BillByCards = {
  bill: {
    id: string;
    dueDate: string;
    closingDate: string | null;
    totalAmount: number;
    totalAmountCurrencyCode: string;
  };
  groups: GroupInvoice[];
  ungroupedCards: CardInvoice[];
  outsideCard: OutsideCardInvoice | null;
  hasUnknownCard: boolean;
};
