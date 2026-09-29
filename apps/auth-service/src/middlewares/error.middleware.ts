import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Auth Error]:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: err.message || 'Something went wrong',
  });
};
