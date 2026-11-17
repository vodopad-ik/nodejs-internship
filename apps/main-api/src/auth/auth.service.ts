import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_MESSAGES } from '../common/constants/messages.constants';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  private readonly authServiceUrl: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.authServiceUrl =
      this.config.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001/internal/auth';
  }

  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    const normalizedBase = baseUsername.trim() || 'user';
    const existing = await this.prisma.profile.findUnique({
      where: { username: normalizedBase },
    });

    if (!existing) {
      return normalizedBase;
    }

    return `${normalizedBase}_${Math.floor(1000 + Math.random() * 9000)}`;
  }

  async handleSignUp(dto: SignUpDto) {
    if (dto.username) {
      const existingProfile = await this.prisma.profile.findUnique({
        where: { username: dto.username },
      });
      if (existingProfile) {
        throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN);
      }
    }

    const emailPrefix = dto.email.split('@')[0] ?? 'user';
    const username = dto.username ?? (await this.generateUniqueUsername(emailPrefix));

    const res = await fetch(`${this.authServiceUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new BadRequestException(data.message || ERROR_MESSAGES.REGISTRATION_FAILED);
    }

    await this.usersService.create({
      id: data.user.id,
      email: dto.email,
      username,
    });

    return data;
  }

  async handleLogin(dto: LoginDto) {
    const res = await fetch(`${this.authServiceUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new UnauthorizedException(data.message || ERROR_MESSAGES.INVALID_CREDENTIALS);
    }
    return data;
  }

  async validateToken(accessToken: string) {
    const res = await fetch(`${this.authServiceUrl}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new UnauthorizedException(data.message || ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
    }
    return data;
  }

  async handleRefresh(refreshToken: string) {
    const res = await fetch(`${this.authServiceUrl}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new UnauthorizedException(data.message || ERROR_MESSAGES.FAILED_TO_REFRESH_TOKEN);
    }
    return data;
  }

  async handleLogout(refreshToken: string, accessToken?: string) {
    const res = await fetch(`${this.authServiceUrl}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken, accessToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new BadRequestException(data.message || ERROR_MESSAGES.LOGOUT_FAILED);
    }
    return data;
  }

  async handleOAuthInit(provider: string) {
    const res = await fetch(`${this.authServiceUrl}/oauth/initiate?provider=${provider}`);
    const data = (await res.json()) as { url?: string; message?: string };
    if (!res.ok || !data.url) {
      throw new BadRequestException(data.message || ERROR_MESSAGES.FAILED_TO_INITIATE_OAUTH);
    }
    return data.url;
  }

  async handleOAuthCallback(provider: string, code: string) {
    const res = await fetch(`${this.authServiceUrl}/oauth/exchange-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider, code }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new BadRequestException(data.message || ERROR_MESSAGES.FAILED_TO_EXCHANGE_OAUTH_CODE);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: data.user.id },
    });

    if (!existingUser) {
      const emailPrefix = String(data.user.email).split('@')[0] ?? 'user';
      const username = await this.generateUniqueUsername(emailPrefix);

      await this.usersService.create({
        id: data.user.id,
        email: data.user.email,
        username,
      });
    }

    return data;
  }
}
