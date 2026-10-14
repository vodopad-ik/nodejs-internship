import { Body, Controller, Get, Headers, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.handleSignUp(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.handleLogin(dto);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.handleRefresh(refreshToken);
  }

  @Post('logout')
  async logout(
    @Body('refreshToken') refreshToken: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    return this.authService.handleLogout(refreshToken, accessToken);
  }

  @Get('login/:provider')
  async handleOAuthLogin(@Param('provider') provider: string, @Res() res: Response) {
    const redirectUrl = await this.authService.handleOAuthInit(provider);
    res.redirect(redirectUrl);
  }

  @Get(':provider/callback')
  async handleOAuthCallback(@Param('provider') provider: string, @Query('code') code: string) {
    return this.authService.handleOAuthCallback(provider, code);
  }
}
