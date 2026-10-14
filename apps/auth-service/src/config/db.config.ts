import mongoose from 'mongoose';
import { env } from './env.config';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('[MongoDB] Connected successfully');
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    process.exit(1);
  }
};
