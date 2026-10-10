import { Body, Controller, Post } from '@nestjs/common';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
  ) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    await this.registerUser.execute(body.email, body.password);
    return this.loginUser.execute(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.loginUser.execute(body.email, body.password);
  }
}
