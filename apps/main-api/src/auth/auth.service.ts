import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  private readonly authServiceUrl =
    process.env.AUTH_SERVICE_URL || 'http://localhost:3001/internal/auth';

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async handleSignUp(dto: SignUpDto) {
    if (dto.username) {
      const existingProfile = await this.prisma.profile.findUnique({
        where: { username: dto.username },
      });
      if (existingProfile) {
        throw new BadRequestException('Username is already taken');
      }
    }

    const res = await fetch(`${this.authServiceUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new BadRequestException(data.error || data.message || 'Registration failed');
    }

    const emailUsername = dto.email.split('@')[0] ?? 'user';
    const username = dto.username || emailUsername;

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
      throw new UnauthorizedException(data.error || data.message || 'Invalid credentials');
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
      throw new UnauthorizedException(data.message || 'Invalid or expired token');
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
      throw new UnauthorizedException(data.error || 'Failed to refresh token');
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
      throw new BadRequestException(data.error || 'Logout failed');
    }
    return data;
  }

  async handleOAuthInit(provider: string) {
    const res = await fetch(`${this.authServiceUrl}/oauth/initiate?provider=${provider}`);
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      throw new BadRequestException(data.error || 'Failed to initiate OAuth');
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
      throw new BadRequestException(data.error || 'Failed to exchange OAuth code');
    }

    const existingUser = await this.usersService.findOne(data.user.id).catch(() => null);
    if (!existingUser) {
      let username = data.user.email.split('@')[0];
      const taken = await this.prisma.profile.findUnique({ where: { username } });
      if (taken) {
        username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      await this.usersService.create({
        id: data.user.id,
        email: data.user.email,
        username,
      });
    }
    return data;
  }
}
