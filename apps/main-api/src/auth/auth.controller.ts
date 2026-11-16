import { Body, Controller, Get, Headers, Param, Post, Query, Res } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignUpDto } from './dto/signup.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({ description: 'User registered successfully' })
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.handleSignUp(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiOkResponse({ description: 'User authenticated successfully' })
  async login(@Body() dto: LoginDto) {
    return this.authService.handleLogin(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiOkResponse({ description: 'Tokens refreshed successfully' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.handleRefresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Invalidate current session and tokens' })
  @ApiOkResponse({ description: 'Logged out successfully' })
  async logout(@Body() dto: RefreshTokenDto, @Headers('authorization') authHeader?: string) {
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    return this.authService.handleLogout(dto.refreshToken, accessToken);
  }

  @Get('login/:provider')
  @ApiOperation({ summary: 'Redirect to OAuth provider login page' })
  @ApiParam({ name: 'provider', description: 'OAuth provider (google or github)' })
  async handleOAuthLogin(@Param('provider') provider: string, @Res() res: Response) {
    const redirectUrl = await this.authService.handleOAuthInit(provider);
    res.redirect(redirectUrl);
  }

  @Get(':provider/callback')
  @ApiOperation({ summary: 'Handle OAuth provider callback and issue tokens' })
  @ApiParam({ name: 'provider', description: 'OAuth provider (google or github)' })
  @ApiOkResponse({ description: 'OAuth authentication completed' })
  async handleOAuthCallback(@Param('provider') provider: string, @Query('code') code: string) {
    return this.authService.handleOAuthCallback(provider, code);
  }
}
