import { Redis } from 'ioredis';
import { redis as defaultRedisClient } from '../config/redis.config';

export class RedisAuthRepository {
  private redis: Redis;

  constructor(redisClient: Redis = defaultRedisClient) {
    this.redis = redisClient;
  }
  async storeRefreshTokenId(userId: string, tokenId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`session:${tokenId}`, userId, 'EX', ttlSeconds);
  }

  async findSessionByTokenId(tokenId: string): Promise<string | null> {
    return await this.redis.get(`session:${tokenId}`);
  }

  async deleteSession(tokenId: string): Promise<void> {
    await this.redis.del(`session:${tokenId}`);
  }

  async blacklistToken(tokenId: string, expiresInSeconds: number): Promise<void> {
    await this.redis.set(`blacklist:${tokenId}`, 'true', 'EX', expiresInSeconds);
  }

  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${tokenId}`);
    return result !== null;
  }
}
