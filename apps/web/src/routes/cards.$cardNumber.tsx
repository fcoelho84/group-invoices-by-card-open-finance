import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import {
  fetchBillByCards,
  formatDateBr,
  formatMoney,
  isAuthenticated,
} from '../lib/api';

type CardSearch = {
  accountId: string;
  billId: string;
};

export const Route = createFileRoute('/cards/$cardNumber')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  validateSearch: (search: Record<string, unknown>): CardSearch => {
    const accountId =
      typeof search.accountId === 'string' ? search.accountId : '';
    const billId = typeof search.billId === 'string' ? search.billId : '';
    return { accountId, billId };
  },
  component: CardDetailPage,
});

function CardDetailPage() {
  const { cardNumber } = Route.useParams();
  const { accountId, billId } = Route.useSearch();

  const billByCardsQuery = useQuery({
    queryKey: ['bill-by-cards', accountId, billId],
    queryFn: () => fetchBillByCards(accountId, billId),
    enabled: Boolean(accountId && billId),
  });

  const card = findCard(billByCardsQuery.data, cardNumber);

  return (
    <div className="stack">
      <Link to="/" className="muted">
        ← Voltar
      </Link>
      <h1 className="title">Cartão {cardNumber}</h1>

      {billByCardsQuery.isLoading ? (
        <p className="muted">Carregando...</p>
      ) : null}

      {billByCardsQuery.isError ? (
        <p className="error">{(billByCardsQuery.error as Error).message}</p>
      ) : null}

      {card ? (
        <>
          <p>
            Total do ciclo:{' '}
            <strong>
              {formatMoney(
                card.totalAmount,
                billByCardsQuery.data?.bill.totalAmountCurrencyCode,
              )}
            </strong>
          </p>
          <ul className="tx-list">
            {card.transactions.map((tx) => (
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

      {!billByCardsQuery.isLoading && !card ? (
        <p className="muted">Cartão não encontrado neste ciclo.</p>
      ) : null}
    </div>
  );
}

function findCard(
  data: Awaited<ReturnType<typeof fetchBillByCards>> | undefined,
  cardNumber: string,
) {
  if (!data) return undefined;
  const ungrouped = data.ungroupedCards.find(
    (item) => item.cardNumber === cardNumber,
  );
  if (ungrouped) return ungrouped;

  for (const group of data.groups) {
    if (!group.cardNumbers.includes(cardNumber)) continue;
    const transactions = group.transactions.filter(
      (tx) => (tx.cardNumber?.trim() || 'desconhecido') === cardNumber,
    );
    return {
      cardNumber,
      totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      transactions,
    };
  }
  return undefined;
}
