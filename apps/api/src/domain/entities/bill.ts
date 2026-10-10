export const OPEN_BILL_ID = 'open';

export type Bill = {
  id: string;
  dueDate: string;
  closingDate: string | null;
  totalAmount: number;
  totalAmountCurrencyCode: string;
};

export function buildOpenBill(bills: Bill[]): Bill | null {
  const latestClosed = [...bills]
    .filter((bill) => bill.closingDate)
    .sort((a, b) => b.closingDate!.localeCompare(a.closingDate!))[0];
  if (!latestClosed?.closingDate) return null;

  return {
    id: OPEN_BILL_ID,
    dueDate: shiftMonth(latestClosed.dueDate, 1),
    closingDate: shiftMonth(latestClosed.closingDate, 1),
    totalAmount: 0,
    totalAmountCurrencyCode: latestClosed.totalAmountCurrencyCode,
  };
}

export function openBillRange(
  bills: Bill[],
): { from: string; to: string; forecastMonth: string } | null {
  const open = buildOpenBill(bills);
  if (!open?.closingDate) return null;

  const latestClosed = [...bills]
    .filter((bill) => bill.closingDate)
    .sort((a, b) => b.closingDate!.localeCompare(a.closingDate!))[0];
  if (!latestClosed?.closingDate) return null;

  return {
    from: latestClosed.closingDate,
    to: open.closingDate,
    forecastMonth: open.closingDate.slice(0, 7),
  };
}

export function shiftMonth(dateOnly: string, months: number): string {
  const [year, month, day] = dateOnly.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1 + months, day);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
