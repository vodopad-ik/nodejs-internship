import { Document, Schema, model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  provider: 'local' | 'google' | 'github';
  providerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'github'],
      default: 'local',
    },
    providerId: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);
