import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for API operational exceptions.
 */
export class APIError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Global centralized Express error-handling middleware.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract error info or default to Internal Server Error
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected server error occurred.';

  // Log critical 500 errors to stderr
  if (status === 500) {
    console.error('CRITICAL UNHANDLED ERROR:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  res.status(status).json({
    status: 'error',
    code,
    message: status === 500 && process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again.' 
      : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
export default errorHandler;
