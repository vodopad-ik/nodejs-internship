import { NextFunction, Request, Response, Router } from 'express';
import { AUTH_ERROR_MESSAGES } from '../common/auth-messages.constants';
import { AuthService } from '../services/auth.service';

export const authRouter: Router = Router();
const authService = new AuthService();

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        error: AUTH_ERROR_MESSAGES.EMAIL_AND_PASSWORD_REQUIRED,
        message: AUTH_ERROR_MESSAGES.EMAIL_AND_PASSWORD_REQUIRED,
      });
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
      res.status(400).json({
        error: AUTH_ERROR_MESSAGES.EMAIL_AND_PASSWORD_REQUIRED,
        message: AUTH_ERROR_MESSAGES.EMAIL_AND_PASSWORD_REQUIRED,
      });
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
      res.status(400).json({
        error: AUTH_ERROR_MESSAGES.ACCESS_TOKEN_REQUIRED,
        message: AUTH_ERROR_MESSAGES.ACCESS_TOKEN_REQUIRED,
      });
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
      res.status(400).json({
        error: AUTH_ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED,
        message: AUTH_ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED,
      });
      return;
    }
    const result = await authService.refreshToken(refreshToken);
    res.status(200).json(result);
  } catch {
    res.status(401).json({
      error: AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
      message: AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
    });
  }
});

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken, accessToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({
        error: AUTH_ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED,
        message: AUTH_ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED,
      });
      return;
    }
    const result = await authService.logout(refreshToken, accessToken);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/oauth/initiate', async (req: Request, res: Response) => {
  const provider = req.query.provider as 'google' | 'github';
  if (!provider || (provider !== 'google' && provider !== 'github')) {
    res.status(400).json({
      error: AUTH_ERROR_MESSAGES.INVALID_OAUTH_PROVIDER,
      message: AUTH_ERROR_MESSAGES.INVALID_OAUTH_PROVIDER,
    });
    return;
  }
  const url = authService.getOAuthUrl(provider);
  res.status(200).json({ url });
});

authRouter.post('/oauth/exchange-code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider, code } = req.body;
    if (!provider || !code) {
      res.status(400).json({
        error: AUTH_ERROR_MESSAGES.PROVIDER_AND_CODE_REQUIRED,
        message: AUTH_ERROR_MESSAGES.PROVIDER_AND_CODE_REQUIRED,
      });
      return;
    }
    const result = await authService.exchangeCodeForTokens(provider, code);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
