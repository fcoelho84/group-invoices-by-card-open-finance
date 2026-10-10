import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { ErrorCode } from '../errors/error-code';
import { USER_STORE, type UserStore } from '../ports/user-store';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_STORE)
    private readonly users: UserStore,
    private readonly jwt: JwtService,
  ) {}

  async execute(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    if (!user) {
      throw new UnauthorizedException({ code: ErrorCode.INVALID_CREDENTIALS });
    }
    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({ code: ErrorCode.INVALID_CREDENTIALS });
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken };
  }
}
