import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../common/app.error';
import { AUTH_ERROR_MESSAGES } from '../common/auth-messages.constants';
import { env } from '../config/env.config';
import { User } from '../models/user.model';
import { RedisAuthRepository } from '../repositories/redis-auth.repository';

export class AuthService {
  constructor(private readonly redisAuthRepo: RedisAuthRepository = new RedisAuthRepository()) {}

  private async generateTokens(userId: string, email: string) {
    const tokenId = crypto.randomUUID();
    const accessToken = jwt.sign({ userId, email }, env.jwt.accessSecret, {
      expiresIn: env.jwt.accessTtlSeconds,
    });
    const refreshToken = jwt.sign({ userId, tokenId }, env.jwt.refreshSecret, {
      expiresIn: env.jwt.refreshTtlSeconds,
    });

    await this.redisAuthRepo.storeRefreshTokenId(userId, tokenId, env.jwt.refreshTtlSeconds);
    return { accessToken, refreshToken };
  }

  async register(email: string, password: string) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(409, AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword });
    const tokens = await this.generateTokens(user._id.toString(), user.email);
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
      },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(401, AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new AppError(401, AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }
    const tokens = await this.generateTokens(user._id.toString(), user.email);

    return {
      user: { id: user._id.toString(), email: user.email },
      ...tokens,
    };
  }

  async validateToken(accessToken: string) {
    const payload = jwt.verify(accessToken, env.jwt.accessSecret) as {
      userId: string;
      email: string;
    };
    const isBlacklisted = await this.redisAuthRepo.isTokenBlacklisted(accessToken);
    if (isBlacklisted) {
      throw new AppError(401, AUTH_ERROR_MESSAGES.TOKEN_REVOKED);
    }
    return {
      valid: true,
      ...payload,
    };
  }

  async refreshToken(oldRefreshToken: string) {
    const payload = jwt.verify(oldRefreshToken, env.jwt.refreshSecret) as {
      userId: string;
      tokenId: string;
    };
    const sessionUserId = await this.redisAuthRepo.findSessionByTokenId(payload.tokenId);
    if (!sessionUserId || sessionUserId !== payload.userId) {
      throw new AppError(401, AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    await this.redisAuthRepo.deleteSession(payload.tokenId);
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError(404, AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return await this.generateTokens(user._id.toString(), user.email);
  }

  async logout(refreshToken: string, accessToken?: string) {
    const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as { tokenId: string };
    if (payload?.tokenId) {
      await this.redisAuthRepo.deleteSession(payload.tokenId);
    }

    if (accessToken) {
      await this.redisAuthRepo.blacklistToken(accessToken, env.jwt.accessTtlSeconds);
    }
    return { success: true };
  }

  getOAuthUrl(provider: 'google' | 'github'): string {
    if (provider === 'google') {
      const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const params = new URLSearchParams({
        client_id: env.oauth.google.clientId,
        redirect_uri: env.oauth.google.callbackUrl,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
      });
      return `${rootUrl}?${params.toString()}`;
    }

    const rootUrl = 'https://github.com/login/oauth/authorize';
    const params = new URLSearchParams({
      client_id: env.oauth.github.clientId,
      redirect_uri: env.oauth.github.callbackUrl,
      scope: 'user:email',
    });
    return `${rootUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(provider: 'google' | 'github', code: string) {
    let email: string;
    let providerId: string;

    if (provider === 'google') {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: env.oauth.google.clientId,
          client_secret: env.oauth.google.clientSecret,
          redirect_uri: env.oauth.google.callbackUrl,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData = (await tokenResponse.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        throw new AppError(400, AUTH_ERROR_MESSAGES.GOOGLE_TOKEN_FAILED);
      }
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = (await userResponse.json()) as { id: string; email: string };
      email = userData.email;
      providerId = userData.id;
    } else {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: env.oauth.github.clientId,
          client_secret: env.oauth.github.clientSecret,
          redirect_uri: env.oauth.github.callbackUrl,
        }),
      });
      const tokenData = (await tokenResponse.json()) as { access_token?: string };

      if (!tokenData.access_token) {
        throw new AppError(400, AUTH_ERROR_MESSAGES.GITHUB_TOKEN_FAILED);
      }

      const githubUserResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'innogram-auth-service',
        },
      });
      const githubUser = (await githubUserResponse.json()) as { id: string; email?: string };
      providerId = String(githubUser.id);
      email = githubUser.email || '';

      if (!email) {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'innogram-auth-service',
          },
        });
        const emails = (await emailsResponse.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primary = emails.find((item) => item.primary && item.verified) || emails[0];
        if (primary) {
          email = primary.email;
        }
        if (!email) {
          throw new AppError(400, AUTH_ERROR_MESSAGES.GITHUB_EMAIL_MISSING);
        }
      }
    }

    let user = await User.findOne({ $or: [{ email }, { provider, providerId }] });
    if (!user) {
      user = await User.create({
        email,
        provider,
        providerId,
      });
    }
    const tokens = await this.generateTokens(user._id.toString(), user.email);
    return {
      user: { id: user._id.toString(), email: user.email },
      ...tokens,
    };
  }
}
