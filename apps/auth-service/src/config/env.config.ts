import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.AUTH_PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  mongoUri:
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/innogram_auth',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS) || 900,
    refreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS) || 604800,
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
    },
  },
};
