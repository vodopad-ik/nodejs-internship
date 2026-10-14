import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { connectDB } from './config/db.config';
import { authRouter } from './controllers/auth.controller';
import { errorHandler } from './middlewares/error.middleware';

dotenv.config();
connectDB();

const app = express();
const port = process.env.AUTH_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/internal/auth', authRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.use(errorHandler);
app.listen(port, () => {
  console.log(`Auth Service is running on http://localhost:${port}`);
});
