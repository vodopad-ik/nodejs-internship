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
    const tokens = this.generateTokens(user._id.toString(), user.email);

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
      userId: payload.userId,
      email: payload.email,
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
}
