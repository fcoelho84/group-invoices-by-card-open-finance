const TOKEN_KEY = 'accessToken';

export type TransactionDto = {
  id: string;
  description: string;
  amount: number;
  date: string;
  cardNumber: string;
  billId: string | null;
  billForecastDate: string | null;
  installment: boolean;
  installmentNumber: number | null;
  totalInstallments: number | null;
  purchaseDate: string | null;
};

export const OPEN_BILL_ID = 'open';

export type CardInvoiceDto = {
  cardNumber: string;
  totalAmount: number;
  transactions: TransactionDto[];
};

export type GroupInvoiceDto = {
  id: string;
  name: string;
  cardNumbers: string[];
  totalAmount: number;
  transactions: TransactionDto[];
};

export type OutsideCardInvoiceDto = {
  name: string;
  totalAmount: number;
  transactions: TransactionDto[];
};

type BillDto = {
  id: string;
  dueDate: string;
  closingDate: string | null;
  totalAmount: number;
  totalAmountCurrencyCode: string;
};

export type BillByCardsDto = {
  bill: BillDto;
  groups: GroupInvoiceDto[];
  ungroupedCards: CardInvoiceDto[];
  outsideCard: OutsideCardInvoiceDto | null;
  hasUnknownCard: boolean;
};

type CreditCardAccountDto = {
  id: string;
  name: string;
  number: string | null;
};

export type CardGroupDto = {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  cardNumbers: string[];
  createdAt: string;
};

type ConnectTokenResponse = {
  accessToken: string;
};

type AuthResponse = {
  accessToken: string;
};

type ItemStatusDto = {
  itemId: string | null;
};

const ErrorCode = {
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  BILL_NOT_FOUND: 'BILL_NOT_FOUND',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  OPEN_FINANCE_ERROR: 'OPEN_FINANCE_ERROR',
  MISSING_CONFIG: 'MISSING_CONFIG',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.ITEM_NOT_FOUND]:
    'Sessão do Open Finance não encontrada. Conecte novamente.',
  [ErrorCode.BILL_NOT_FOUND]: 'Fatura não encontrada.',
  [ErrorCode.GROUP_NOT_FOUND]: 'Grupo não encontrado.',
  [ErrorCode.OPEN_FINANCE_ERROR]:
    'Erro ao consultar o Open Finance. Tente novamente mais tarde.',
  [ErrorCode.MISSING_CONFIG]: 'Serviço temporariamente indisponível.',
  [ErrorCode.INTERNAL_ERROR]: 'Ocorreu um erro inesperado. Tente novamente.',
  [ErrorCode.INVALID_CREDENTIALS]: 'E-mail ou senha inválidos.',
  [ErrorCode.EMAIL_TAKEN]: 'Este e-mail já está em uso.',
  [ErrorCode.UNAUTHORIZED]: 'Faça login para continuar.',
};

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      clearAccessToken();
    }
    throw new Error(errorMessage(text));
  }

  return response.json() as Promise<T>;
}

function errorMessage(text: string): string {
  const fallback = ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
  if (!text) return fallback;
  try {
    const body = JSON.parse(text) as { code?: unknown };
    if (isErrorCode(body.code)) return ERROR_MESSAGES[body.code];
  } catch {
    return fallback;
  }
  return fallback;
}

function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === 'string' &&
    Object.values(ErrorCode).includes(value as ErrorCode)
  );
}

export function register(email: string, password: string) {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function fetchItemStatus() {
  return request<ItemStatusDto>('/api/item');
}

export function createConnectToken() {
  return request<ConnectTokenResponse>('/api/connect-token', {
    method: 'POST',
  });
}

export function saveItemId(itemId: string) {
  return request<{ ok: boolean }>('/api/item', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
}

export function fetchAccounts() {
  return request<CreditCardAccountDto[]>('/api/accounts');
}

export function fetchBills(accountId: string) {
  return request<BillDto[]>(
    `/api/bills?accountId=${encodeURIComponent(accountId)}`,
  );
}

export function fetchBillByCards(accountId: string, billId: string) {
  return request<BillByCardsDto>(
    `/api/bills/${encodeURIComponent(billId)}/cards?accountId=${encodeURIComponent(accountId)}`,
  );
}

export function fetchGroups(accountId: string) {
  return request<CardGroupDto[]>(
    `/api/groups?accountId=${encodeURIComponent(accountId)}`,
  );
}

export function createGroup(
  accountId: string,
  name: string,
  cardNumbers: string[] = [],
) {
  return request<CardGroupDto>('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ accountId, name, cardNumbers }),
  });
}

export function updateGroup(
  groupId: string,
  patch: { name?: string; cardNumbers?: string[] },
) {
  return request<CardGroupDto>(`/api/groups/${encodeURIComponent(groupId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteGroup(groupId: string) {
  return request<{ ok: boolean }>(
    `/api/groups/${encodeURIComponent(groupId)}`,
    { method: 'DELETE' },
  );
}

export function formatMoney(amount: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDateBr(dateOnly: string) {
  const [year, month, day] = dateOnly.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}
