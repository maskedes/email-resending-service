import { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../services/apiKeyService';
import { config } from '../config';

export interface AuthRequest extends Request {
  apiKey?: {
    id: string;
    name: string;
    email: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers[config.apiKeyHeader] as string;

  if (!apiKey) {
    res.status(401).json({
      error: {
        type: 'authentication_required',
        message: 'API key is required. Pass it via the x-api-key header.',
      },
    });
    return;
  }

  try {
    const validKey = await validateApiKey(apiKey);

    if (!validKey) {
      res.status(401).json({
        error: {
          type: 'invalid_api_key',
          message: 'The provided API key is invalid or has been deactivated.',
        },
      });
      return;
    }

    req.apiKey = {
      id: validKey.id,
      name: validKey.name,
      email: validKey.email,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      type: 'internal_error',
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
}
