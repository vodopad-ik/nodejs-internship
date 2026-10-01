import Redis from 'ioredis';
import { env } from './env.config';

export const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});
