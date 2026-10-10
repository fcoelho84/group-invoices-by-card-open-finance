import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import {
  fetchBillByCards,
  formatDateBr,
  formatMoney,
  isAuthenticated,
} from '../lib/api';

type GroupSearch = {
  accountId: string;
  billId: string;
};

export const Route = createFileRoute('/groups/$groupId')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  validateSearch: (search: Record<string, unknown>): GroupSearch => {
    const accountId =
      typeof search.accountId === 'string' ? search.accountId : '';
    const billId = typeof search.billId === 'string' ? search.billId : '';
    return { accountId, billId };
  },
  component: GroupDetailPage,
});

function GroupDetailPage() {
  const { groupId } = Route.useParams();
  const { accountId, billId } = Route.useSearch();

  const billByCardsQuery = useQuery({
    queryKey: ['bill-by-cards', accountId, billId],
    queryFn: () => fetchBillByCards(accountId, billId),
    enabled: Boolean(accountId && billId),
  });

  const group = billByCardsQuery.data?.groups.find(
    (item) => item.id === groupId,
  );

  return (
    <div className="stack">
      <Link to="/" className="muted">
        ← Voltar
      </Link>
      <h1 className="title">{group?.name ?? 'Grupo'}</h1>
      {group ? (
        <p className="muted">Cartões: {group.cardNumbers.join(', ')}</p>
      ) : null}

      {billByCardsQuery.isLoading ? (
        <p className="muted">Carregando...</p>
      ) : null}

      {billByCardsQuery.isError ? (
        <p className="error">{(billByCardsQuery.error as Error).message}</p>
      ) : null}

      {group ? (
        <>
          <p>
            Total do ciclo:{' '}
            <strong>
              {formatMoney(
                group.totalAmount,
                billByCardsQuery.data?.bill.totalAmountCurrencyCode,
              )}
            </strong>
          </p>
          <ul className="tx-list">
            {group.transactions.map((tx) => (
              <li key={tx.id} className="tx-item">
                <div>
                  <div>{tx.description}</div>
                  <div className="muted">
                    {formatDateBr(tx.date)} · cartão {tx.cardNumber}
                  </div>
                </div>
                <div>{formatMoney(tx.amount)}</div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {!billByCardsQuery.isLoading && !group ? (
        <p className="muted">Grupo não encontrado neste ciclo.</p>
      ) : null}
    </div>
  );
}
