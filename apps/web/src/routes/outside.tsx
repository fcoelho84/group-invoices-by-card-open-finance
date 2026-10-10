import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import {
  fetchBillByCards,
  formatDateBr,
  formatMoney,
  isAuthenticated,
} from '../lib/api';

type OutsideSearch = {
  accountId: string;
  billId: string;
};

export const Route = createFileRoute('/outside')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  validateSearch: (search: Record<string, unknown>): OutsideSearch => {
    const accountId =
      typeof search.accountId === 'string' ? search.accountId : '';
    const billId = typeof search.billId === 'string' ? search.billId : '';
    return { accountId, billId };
  },
  component: OutsideDetailPage,
});

function OutsideDetailPage() {
  const { accountId, billId } = Route.useSearch();

  const billByCardsQuery = useQuery({
    queryKey: ['bill-by-cards', accountId, billId],
    queryFn: () => fetchBillByCards(accountId, billId),
    enabled: Boolean(accountId && billId),
  });

  const outsideCard = billByCardsQuery.data?.outsideCard;

  return (
    <div className="stack">
      <Link to="/" className="muted">
        ← Voltar
      </Link>
      <h1 className="title">{outsideCard?.name ?? 'Fora do cartão'}</h1>

      {billByCardsQuery.isLoading ? (
        <p className="muted">Carregando...</p>
      ) : null}

      {billByCardsQuery.isError ? (
        <p className="error">{(billByCardsQuery.error as Error).message}</p>
      ) : null}

      {outsideCard ? (
        <>
          <p>
            Total do período:{' '}
            <strong>
              {formatMoney(
                outsideCard.totalAmount,
                billByCardsQuery.data?.bill.totalAmountCurrencyCode,
              )}
            </strong>
          </p>
          <ul className="tx-list">
            {outsideCard.transactions.map((tx) => (
              <li key={tx.id} className="tx-item">
                <div>
                  <div>{tx.description}</div>
                  <div className="muted">{formatDateBr(tx.date)}</div>
                </div>
                <div>{formatMoney(tx.amount)}</div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {!billByCardsQuery.isLoading && !outsideCard ? (
        <p className="muted">Nenhum lançamento fora do cartão neste período.</p>
      ) : null}
    </div>
  );
}
