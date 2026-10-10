import {
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { ErrorCode } from '../errors/error-code';
import { USER_STORE, type UserStore } from '../ports/user-store';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_STORE)
    private readonly users: UserStore,
  ) {}

  async execute(email: string, password: string): Promise<{ userId: string }> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.users.findByEmail(normalized);
    if (existing) {
      throw new ConflictException({ code: ErrorCode.EMAIL_TAKEN });
    }
    const passwordHash = await hash(password, 10);
    const user = await this.users.create(normalized, passwordHash);
    return { userId: user.id };
  }
}
