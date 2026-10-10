import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  DragDropProvider,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { PluggyConnect } from 'react-pluggy-connect';
import {
  clearAccessToken,
  createConnectToken,
  createGroup,
  deleteGroup,
  fetchAccounts,
  fetchBillByCards,
  fetchBills,
  fetchItemStatus,
  formatDateBr,
  formatMoney,
  isAuthenticated,
  OPEN_BILL_ID,
  saveItemId,
  updateGroup,
  type CardInvoiceDto,
  type GroupInvoiceDto,
} from '../lib/api';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: HomePage,
});

const UNGROUPED = 'ungrouped';

function HomePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string>('');
  const [billId, setBillId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');

  const itemQuery = useQuery({
    queryKey: ['item'],
    queryFn: fetchItemStatus,
  });

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: Boolean(itemQuery.data?.itemId),
  });

  const selectedAccountId = accountId || accountsQuery.data?.[0]?.id || '';

  const billsQuery = useQuery({
    queryKey: ['bills', selectedAccountId],
    queryFn: () => fetchBills(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });

  const selectedBillId = billId || billsQuery.data?.[0]?.id || '';

  const billByCardsQuery = useQuery({
    queryKey: ['bill-by-cards', selectedAccountId, selectedBillId],
    queryFn: () => fetchBillByCards(selectedAccountId, selectedBillId),
    enabled: Boolean(selectedAccountId && selectedBillId),
  });

  const openConnect = useMutation({
    mutationFn: async () => {
      const token = await createConnectToken();
      setConnectToken(token.accessToken);
      setWidgetOpen(true);
    },
  });

  const onConnected = useMutation({
    mutationFn: async (itemId: string) => {
      await saveItemId(itemId);
    },
    onSuccess: async () => {
      setWidgetOpen(false);
      setConnectToken(null);
      await queryClient.invalidateQueries();
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: () => createGroup(selectedAccountId, newGroupName),
    onSuccess: async () => {
      setNewGroupName('');
      await queryClient.invalidateQueries({ queryKey: ['bill-by-cards'] });
    },
  });

  const moveCardMutation = useMutation({
    mutationFn: async ({
      cardNumber,
      targetGroupId,
      groups,
    }: {
      cardNumber: string;
      targetGroupId: string;
      groups: GroupInvoiceDto[];
    }) => {
      const source = groups.find((g) => g.cardNumbers.includes(cardNumber));
      if (source && source.id !== targetGroupId) {
        await updateGroup(source.id, {
          cardNumbers: source.cardNumbers.filter((n) => n !== cardNumber),
        });
      }
      if (targetGroupId === UNGROUPED) return;
      const target = groups.find((g) => g.id === targetGroupId);
      if (!target) return;
      if (target.cardNumbers.includes(cardNumber)) return;
      await updateGroup(target.id, {
        cardNumbers: [...target.cardNumbers, cardNumber],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bill-by-cards'] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bill-by-cards'] });
    },
  });

  if (itemQuery.isLoading) {
    return <p className="muted">Carregando...</p>;
  }

  if (itemQuery.isError) {
    return (
      <div className="stack">
        <p className="error">{(itemQuery.error as Error).message}</p>
        <button
          className="btn"
          type="button"
          onClick={() => {
            clearAccessToken();
            void navigate({ to: '/login' });
          }}
        >
          Ir para login
        </button>
      </div>
    );
  }

  if (!itemQuery.data?.itemId) {
    return (
      <div className="stack">
        <div className="row">
          <h1 className="title">Faturas por cartão</h1>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              clearAccessToken();
              void navigate({ to: '/login' });
            }}
          >
            Sair
          </button>
        </div>
        <p className="muted">Conecte o Nubank via Pluggy para começar.</p>
        <button
          className="btn"
          type="button"
          onClick={() => openConnect.mutate()}
          disabled={openConnect.isPending}
        >
          Conectar Nubank
        </button>
        {openConnect.isError ? (
          <p className="error">{(openConnect.error as Error).message}</p>
        ) : null}
        {widgetOpen && connectToken ? (
          <PluggyConnect
            connectToken={connectToken}
            onSuccess={({ item }) => onConnected.mutate(item.id)}
            onError={({ message }) => {
              setWidgetOpen(false);
              console.error(message);
            }}
            onClose={() => setWidgetOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  const groups = billByCardsQuery.data?.groups ?? [];
  const ungrouped = billByCardsQuery.data?.ungroupedCards ?? [];

  return (
    <div className="stack">
      <div className="row">
        <h1 className="title">Faturas por cartão</h1>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            clearAccessToken();
            void navigate({ to: '/login' });
          }}
        >
          Sair
        </button>
      </div>
      <p className="muted">Item: {itemQuery.data.itemId}</p>

      <div className="row">
        <label>
          Conta{' '}
          <select
            className="select"
            value={selectedAccountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setBillId('');
            }}
          >
            {(accountsQuery.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
                {account.number ? ` · ${account.number}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fatura{' '}
          <select
            className="select"
            value={selectedBillId}
            onChange={(e) => setBillId(e.target.value)}
          >
            {(billsQuery.data ?? []).map((bill) => (
              <option key={bill.id} value={bill.id}>
                {bill.id === OPEN_BILL_ID
                  ? 'Em aberto'
                  : `${formatDateBr(bill.dueDate)} · ${formatMoney(bill.totalAmount, bill.totalAmountCurrencyCode)}`}
              </option>
            ))}
          </select>
        </label>

        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => openConnect.mutate()}
        >
          Reconectar
        </button>
      </div>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newGroupName.trim()) return;
          createGroupMutation.mutate();
        }}
      >
        <input
          className="input"
          placeholder="Nome do grupo"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <button
          className="btn"
          type="submit"
          disabled={createGroupMutation.isPending || !newGroupName.trim()}
        >
          Criar grupo
        </button>
      </form>

      {billByCardsQuery.isLoading ? (
        <p className="muted">Carregando fatura...</p>
      ) : null}

      {billByCardsQuery.isError ? (
        <p className="error">{(billByCardsQuery.error as Error).message}</p>
      ) : null}

      {createGroupMutation.isError ? (
        <p className="error">
          {(createGroupMutation.error as Error).message}
        </p>
      ) : null}

      {moveCardMutation.isError ? (
        <p className="error">{(moveCardMutation.error as Error).message}</p>
      ) : null}

      {billByCardsQuery.data?.hasUnknownCard ? (
        <p className="warn">
          Algumas transações sem `cardNumber`. Split incompleto.
        </p>
      ) : null}

      <DragDropProvider
        onDragEnd={(event) => {
          if (event.canceled) return;
          const sourceId = event.operation.source?.id;
          const targetId = event.operation.target?.id;
          if (sourceId == null || targetId == null) return;
          const cardNumber = String(sourceId).replace(/^card:/, '');
          const targetGroupId = String(targetId).replace(/^column:/, '');
          moveCardMutation.mutate({
            cardNumber,
            targetGroupId,
            groups,
          });
        }}
      >
        <div className="board">
          <DropColumn title="Sem grupo" dropId={UNGROUPED}>
            {ungrouped.map((card) => (
              <DraggableCard
                key={card.cardNumber}
                card={card}
                accountId={selectedAccountId}
                billId={selectedBillId}
              />
            ))}
          </DropColumn>

          {groups.map((group) => (
            <DropColumn
              key={group.id}
              title={group.name}
              dropId={group.id}
              headerAction={
                <button
                  className="btn btn-secondary btn-small"
                  type="button"
                  onClick={() => deleteGroupMutation.mutate(group.id)}
                >
                  Apagar
                </button>
              }
              footer={
                <Link
                  to="/groups/$groupId"
                  params={{ groupId: group.id }}
                  search={{
                    accountId: selectedAccountId,
                    billId: selectedBillId,
                  }}
                  className="card-link"
                >
                  Ver fatura unificada · {formatMoney(group.totalAmount)}
                </Link>
              }
            >
              {group.cardNumbers.map((cardNumber) => {
                const card = cardFromGroup(group, cardNumber);
                return (
                  <DraggableCard
                    key={cardNumber}
                    card={card}
                    accountId={selectedAccountId}
                    billId={selectedBillId}
                  />
                );
              })}
            </DropColumn>
          ))}

          {billByCardsQuery.data?.outsideCard ? (
            <section className="board-column">
              <div className="row board-column-header">
                <strong>{billByCardsQuery.data.outsideCard.name}</strong>
              </div>
              <div className="board-column-body">
                <div className="board-card">
                  <div className="card-link">
                    <strong>{billByCardsQuery.data.outsideCard.name}</strong>
                    <div>
                      {formatMoney(billByCardsQuery.data.outsideCard.totalAmount)}
                    </div>
                    <div className="muted">
                      {billByCardsQuery.data.outsideCard.transactions.length}{' '}
                      lançamentos
                    </div>
                  </div>
                </div>
              </div>
              <Link
                to="/outside"
                search={{
                  accountId: selectedAccountId,
                  billId: selectedBillId,
                }}
                className="card-link"
              >
                Ver lançamentos ·{' '}
                {formatMoney(billByCardsQuery.data.outsideCard.totalAmount)}
              </Link>
            </section>
          ) : null}
        </div>
        <DragOverlay>
          {(source) => {
            const cardNumber = String(source.id).replace(/^card:/, '');
            return (
              <div className="card-link board-card-overlay">
                <strong>Cartão {cardNumber}</strong>
              </div>
            );
          }}
        </DragOverlay>
      </DragDropProvider>

      {widgetOpen && connectToken ? (
        <PluggyConnect
          connectToken={connectToken}
          updateItem={itemQuery.data.itemId}
          onSuccess={({ item }) => onConnected.mutate(item.id)}
          onError={({ message }) => {
            setWidgetOpen(false);
            console.error(message);
          }}
          onClose={() => setWidgetOpen(false)}
        />
      ) : null}
    </div>
  );
}

function cardFromGroup(
  group: GroupInvoiceDto,
  cardNumber: string,
): CardInvoiceDto {
  const transactions = group.transactions.filter(
    (tx) => (tx.cardNumber?.trim() || 'desconhecido') === cardNumber,
  );
  return {
    cardNumber,
    totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
    transactions,
  };
}

function DropColumn({
  title,
  dropId,
  children,
  footer,
  headerAction,
}: {
  title: string;
  dropId: string;
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: `column:${dropId}`,
    accept: 'card',
  });

  return (
    <section
      ref={ref}
      className={
        isDropTarget ? 'board-column board-column-active' : 'board-column'
      }
    >
      <div className="row board-column-header">
        <strong>{title}</strong>
        {headerAction}
      </div>
      <div className="board-column-body">{children}</div>
      {footer}
    </section>
  );
}

function DraggableCard({
  card,
  accountId,
  billId,
}: {
  card: CardInvoiceDto;
  accountId: string;
  billId: string;
}) {
  const navigate = useNavigate();
  const suppressClick = useRef(false);
  const { ref, isDragging } = useDraggable({
    id: `card:${card.cardNumber}`,
    type: 'card',
  });

  useEffect(() => {
    if (isDragging) suppressClick.current = true;
  }, [isDragging]);

  function openCard() {
    void navigate({
      to: '/cards/$cardNumber',
      params: { cardNumber: card.cardNumber },
      search: { accountId, billId },
    });
  }

  return (
    <div
      ref={ref}
      role="link"
      tabIndex={0}
      className={isDragging ? 'board-card board-card-dragging' : 'board-card'}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        openCard();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openCard();
      }}
    >
      <div className="card-link">
        <strong>Cartão {card.cardNumber}</strong>
        <div>{formatMoney(card.totalAmount)}</div>
        <div className="muted">{card.transactions.length} lançamentos</div>
      </div>
    </div>
  );
}
