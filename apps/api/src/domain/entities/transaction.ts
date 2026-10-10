export type Transaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  cardNumber: string | null;
  billId: string | null;
  billForecastDate: string | null;
  installment: boolean;
  installmentNumber: number | null;
  totalInstallments: number | null;
  purchaseDate: string | null;
};
