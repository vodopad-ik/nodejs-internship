import { NextFunction, Request, Response } from 'express';
import { AppError } from '../common/app.error';
import { AUTH_ERROR_MESSAGES } from '../common/auth-messages.constants';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      message: err.message,
    });
    return;
  }

  console.error('[Auth Error]:', err);
  res.status(500).json({
    error: AUTH_ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    message: AUTH_ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
  });
};
