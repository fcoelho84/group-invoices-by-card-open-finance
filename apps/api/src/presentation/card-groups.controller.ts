import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateCardGroupUseCase } from '../application/use-cases/create-card-group.use-case';
import { DeleteCardGroupUseCase } from '../application/use-cases/delete-card-group.use-case';
import { ListCardGroupsUseCase } from '../application/use-cases/list-card-groups.use-case';
import { UpdateCardGroupUseCase } from '../application/use-cases/update-card-group.use-case';
import { CurrentUser } from './auth/current-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import type { AuthUser } from './auth/jwt.strategy';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class CardGroupsController {
  constructor(
    private readonly listGroups: ListCardGroupsUseCase,
    private readonly createGroup: CreateCardGroupUseCase,
    private readonly updateGroup: UpdateCardGroupUseCase,
    private readonly deleteGroup: DeleteCardGroupUseCase,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('accountId') accountId: string,
  ) {
    return this.listGroups.execute(user.userId, accountId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { accountId: string; name: string; cardNumbers?: string[] },
  ) {
    return this.createGroup.execute(
      user.userId,
      body.accountId,
      body.name,
      body.cardNumbers ?? [],
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; cardNumbers?: string[] },
  ) {
    return this.updateGroup.execute(user.userId, id, body);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.deleteGroup.execute(user.userId, id);
    return { ok: true };
  }
}
