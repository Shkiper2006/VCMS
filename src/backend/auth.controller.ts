import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, type LoginResult } from './auth.service';

interface LoginDto {
  email?: string;
  password?: string;
}

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('api/auth/login')
  loginApi(@Body() body: LoginDto): Promise<LoginResult> {
    return this.login(body);
  }

  @Post('admin/login')
  loginAdmin(@Body() body: LoginDto): Promise<LoginResult> {
    return this.login(body);
  }

  private login(body: LoginDto): Promise<LoginResult> {
    return this.auth.login(body.email ?? '', body.password ?? '');
  }
}
