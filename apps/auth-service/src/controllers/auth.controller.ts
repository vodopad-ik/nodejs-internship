import { NextFunction, Request, Response, Router } from 'express';
import { AuthService } from '../services/auth.service';

export const authRouter: Router = Router();
const authService = new AuthService();

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await authService.register(email, password);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/validate', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ error: 'accessToken is required' });
      return;
    }
    const result = await authService.validateToken(accessToken);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ valid: false, message: (error as Error).message });
  }
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }
    const result = await authService.refreshToken(refreshToken);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken, accessToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'refreshToken is required' });
      return;
    }
    const result = await authService.logout(refreshToken, accessToken);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
