import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateConnectTokenUseCase } from '../application/use-cases/create-connect-token.use-case';
import { GetBillByCardsUseCase } from '../application/use-cases/get-bill-by-cards.use-case';
import { GetItemStatusUseCase } from '../application/use-cases/get-item-status.use-case';
import { ListBillsUseCase } from '../application/use-cases/list-bills.use-case';
import { ListCreditCardAccountsUseCase } from '../application/use-cases/list-credit-card-accounts.use-case';
import { SaveItemIdUseCase } from '../application/use-cases/save-item-id.use-case';
import { CurrentUser } from './auth/current-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import type { AuthUser } from './auth/jwt.strategy';

@Controller()
@UseGuards(JwtAuthGuard)
export class OpenFinanceController {
  constructor(
    private readonly createConnectToken: CreateConnectTokenUseCase,
    private readonly saveItemId: SaveItemIdUseCase,
    private readonly getItemStatus: GetItemStatusUseCase,
    private readonly listAccounts: ListCreditCardAccountsUseCase,
    private readonly listBills: ListBillsUseCase,
    private readonly getBillByCards: GetBillByCardsUseCase,
  ) {}

  @Post('connect-token')
  connectToken(@CurrentUser() user: AuthUser) {
    return this.createConnectToken.execute(user.userId);
  }

  @Get('item')
  itemStatus(@CurrentUser() user: AuthUser) {
    return this.getItemStatus.execute(user.userId);
  }

  @Post('item')
  async saveItem(
    @CurrentUser() user: AuthUser,
    @Body() body: { itemId: string },
  ) {
    await this.saveItemId.execute(user.userId, body.itemId);
    return { ok: true };
  }

  @Get('accounts')
  accounts(@CurrentUser() user: AuthUser) {
    return this.listAccounts.execute(user.userId);
  }

  @Get('bills')
  bills(@Query('accountId') accountId: string) {
    return this.listBills.execute(accountId);
  }

  @Get('bills/:billId/cards')
  billByCards(
    @CurrentUser() user: AuthUser,
    @Param('billId') billId: string,
    @Query('accountId') accountId: string,
  ) {
    return this.getBillByCards.execute(user.userId, accountId, billId);
  }
}
