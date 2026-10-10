import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { USER_STORE } from './application/ports/user-store';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { SqliteDatabase } from './infrastructure/sqlite/sqlite-database';
import { SqliteUserStore } from './infrastructure/sqlite/sqlite-user.store';
import { AuthController } from './presentation/auth.controller';
import { JwtStrategy } from './presentation/auth/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    SqliteDatabase,
    { provide: USER_STORE, useClass: SqliteUserStore },
    RegisterUserUseCase,
    LoginUserUseCase,
    JwtStrategy,
  ],
  exports: [SqliteDatabase, JwtModule, PassportModule],
})
export class AuthModule {}
