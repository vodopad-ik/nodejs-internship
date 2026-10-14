import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { User } from '../models/user.model';
import { RedisAuthRepository } from '../repositories/redis-auth.repository';

export class AuthService {
  constructor(private redisAuthRepo: RedisAuthRepository = new RedisAuthRepository()) {}

  private async generateTokens(userId: string, email: string) {
    const tokenId = crypto.randomUUID();
    const accessToken = jwt.sign({ userId, email }, env.jwt.accessSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId, tokenId }, env.jwt.refreshSecret, { expiresIn: '7d' });

    await this.redisAuthRepo.storeRefreshTokenId(userId, tokenId, 604800);
    return { accessToken, refreshToken };
  }

  async register(email: string, password: string) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
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
      throw new Error('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
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
      throw new Error('Token is revoked');
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
      throw new Error('Invalid refresh token');
    }

    await this.redisAuthRepo.deleteSession(payload.tokenId);
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await this.generateTokens(user._id.toString(), user.email);
  }

  async logout(refreshToken: string, accessToken?: string) {
    const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as { tokenId: string };
    if (payload?.tokenId) {
      await this.redisAuthRepo.deleteSession(payload.tokenId);
    }

    if (accessToken) {
      await this.redisAuthRepo.blacklistToken(accessToken, 15 * 60);
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
    } else {
      const rootUrl = 'https://github.com/login/oauth/authorize';
      const params = new URLSearchParams({
        client_id: env.oauth.github.clientId,
        redirect_uri: env.oauth.github.callbackUrl,
        scope: 'user:email',
      });
      return `${rootUrl}?${params.toString()}`;
    }
  }

  async exchangeCodeForTokens(provider: 'google' | 'github', code: string) {
    let email, providerId;

    if (provider === 'google') {
      const tokenData = (await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: env.oauth.google.clientId,
          client_secret: env.oauth.google.clientSecret,
          redirect_uri: env.oauth.google.callbackUrl,
          grant_type: 'authorization_code',
        }),
      }).then((res) => res.json())) as { access_token?: string };
      if (!tokenData.access_token) {
        throw new Error('Failed to obtain access token from Google');
      }
      const userData = (await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }).then((res) => res.json())) as { id: string; email: string };
      email = userData.email;
      providerId = userData.id;
    } else {
      const tokenData = (await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: env.oauth.github.clientId,
          client_secret: env.oauth.github.clientSecret,
          redirect_uri: env.oauth.github.callbackUrl,
        }),
      }).then((res) => res.json())) as { access_token?: string };

      if (!tokenData.access_token) {
        throw new Error('Failed to obtain access token from GitHub');
      }

      const githubUser = (await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'innogram-auth-service',
        },
      }).then((res) => res.json())) as { id: string; email?: string };
      providerId = String(githubUser.id);
      email = githubUser.email || '';

      if (!email) {
        const emails = (await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'innogram-auth-service',
          },
        }).then((res) => res.json())) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primary = emails.find((e) => e.primary && e.verified) || emails[0];
        if (primary) {
          email = primary.email;
        }
        if (!email) {
          throw new Error('Could not retrieve email from GitHub');
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
