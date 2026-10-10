# Faturas por cartão (Open Finance)

Serviço para **agrupar as compras da fatura por cartão**.

No Nubank, quando existem cartões adicionais ou compartilhados, a fatura vem **única**: não dá para ver o extrato separado de cada cartão. Este projeto usa o Open Finance (via Pluggy) para buscar as transações, identificar o cartão de cada lançamento e montar a visão por cartão — e, se quiser, por grupos de cartões.

## O que resolve

- Fatura única do Nubank → breakdown por final do cartão
- Organização em grupos (ex.: cartões da casa, de outra pessoa)
- Ciclo atual (fatura em aberto) e faturas fechadas

## Stack

- `apps/api` — NestJS + Pluggy + SQLite
- `apps/web` — React (Vite) + TanStack Router/Query
