import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { OpenFinanceModule } from './open-finance.module';

@Module({
  imports: [AuthModule, OpenFinanceModule],
})
export class AppModule {}
