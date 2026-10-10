import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { CARD_GROUP_STORE } from './application/ports/card-group-store';
import { ITEM_ID_STORE } from './application/ports/item-id-store';
import { OPEN_FINANCE_GATEWAY } from './application/ports/open-finance-gateway';
import { CreateCardGroupUseCase } from './application/use-cases/create-card-group.use-case';
import { CreateConnectTokenUseCase } from './application/use-cases/create-connect-token.use-case';
import { DeleteCardGroupUseCase } from './application/use-cases/delete-card-group.use-case';
import { GetBillByCardsUseCase } from './application/use-cases/get-bill-by-cards.use-case';
import { GetItemStatusUseCase } from './application/use-cases/get-item-status.use-case';
import { ListBillsUseCase } from './application/use-cases/list-bills.use-case';
import { ListCardGroupsUseCase } from './application/use-cases/list-card-groups.use-case';
import { ListCreditCardAccountsUseCase } from './application/use-cases/list-credit-card-accounts.use-case';
import { SaveItemIdUseCase } from './application/use-cases/save-item-id.use-case';
import { UpdateCardGroupUseCase } from './application/use-cases/update-card-group.use-case';
import { PluggyOpenFinanceGateway } from './infrastructure/pluggy/pluggy-open-finance.gateway';
import { SqliteCardGroupStore } from './infrastructure/sqlite/sqlite-card-group.store';
import { SqliteItemIdStore } from './infrastructure/sqlite/sqlite-item-id.store';
import { CardGroupsController } from './presentation/card-groups.controller';
import { OpenFinanceController } from './presentation/open-finance.controller';

@Module({
  imports: [AuthModule],
  controllers: [OpenFinanceController, CardGroupsController],
  providers: [
    { provide: OPEN_FINANCE_GATEWAY, useClass: PluggyOpenFinanceGateway },
    { provide: ITEM_ID_STORE, useClass: SqliteItemIdStore },
    { provide: CARD_GROUP_STORE, useClass: SqliteCardGroupStore },
    CreateConnectTokenUseCase,
    SaveItemIdUseCase,
    GetItemStatusUseCase,
    ListCreditCardAccountsUseCase,
    ListBillsUseCase,
    GetBillByCardsUseCase,
    ListCardGroupsUseCase,
    CreateCardGroupUseCase,
    UpdateCardGroupUseCase,
    DeleteCardGroupUseCase,
  ],
})
export class OpenFinanceModule {}
