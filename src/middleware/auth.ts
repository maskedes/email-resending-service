import { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../services/apiKeyService';
import { config } from '../config';
import { getPool } from '../database/db';

export interface AuthRequest extends Request {
  apiKey?: {
    id: string;
    name: string;
    email: string;
    allow_sms: boolean;
    allow_incoming_email: boolean;
    forward_to: string | null;
    is_admin: boolean;
  };
}

/**
 * Verifies the Cloudflare edge proxy secret, if one is configured.
 * Ensures /api/emails/* traffic only comes through the Worker.
 */
export function edgeProxyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = config.edgeProxySecret;
  if (!secret) return next(); // Edge auth disabled

  const provided = req.headers['x-edge-proxy-secret'] as string | undefined;
  if (!provided || provided !== secret) {
    res.status(403).json({
      error: {
        type: 'forbidden',
        message: 'Direct access is not allowed. Use the edge endpoint.',
      },
    });
    return;
  }
  next();
}

/**
 * True when the request comes from the trusted Next.js dashboard proxy.
 *
 * The `x-dashboard-user-id` header is CLIENT-SUPPLIED and must never be
 * trusted on its own — otherwise any caller could send an arbitrary user id
 * and gain that user's API keys or elevate to admin. We therefore require the
 * shared service secret (known only to the backend and the Vercel dashboard)
 * before the header is honoured.
 */
export function isTrustedDashboardProxy(req: Request): boolean {
  const expected = config.dashboard.serviceSecret;
  if (!expected) return false;
  const provided = req.headers['x-dashboard-service-secret'];
  return typeof provided === 'string' && provided.length > 0 && provided === expected;
}

/**
 * Returns the dashboard user id only when the request is from the trusted
 * dashboard proxy; otherwise undefined.
 */
export function trustedDashboardUserId(req: Request): string | undefined {
  if (!isTrustedDashboardProxy(req)) return undefined;
  const userId = req.headers['x-dashboard-user-id'];
  return typeof userId === 'string' && userId.length > 0 ? userId : undefined;
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
      allow_sms: validKey.allow_sms === true,
      allow_incoming_email: validKey.allow_incoming_email === true,
      forward_to: validKey.forward_to ?? null,
      is_admin: validKey.is_admin === true,
    };

    // Check if the requesting dashboard user is an admin member of this key.
    // When a user email is added as "admin" to an API key's members, they get
    // elevated admin rights for testing and live production. Without admin
    // membership, they only have standard key privileges.
    //
    // Only honoured when the request comes from the trusted dashboard proxy
    // (see isTrustedDashboardProxy) — a bare client-supplied header is ignored.
    const userId = trustedDashboardUserId(req);
    if (userId && !req.apiKey.is_admin) {
      try {
        const { rows } = await getPool().query(
          `SELECT role FROM api_key_members
           WHERE api_key_id = $1 AND email = $2 AND role = 'admin'`,
          [validKey.id, userId]
        );
        if (rows.length > 0) {
          req.apiKey.is_admin = true;
        }
      } catch {
        // Ignore member-check errors — fall back to key-level is_admin flag.
      }
    }

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

/**
 * Check if the authenticated API key has admin rights.
 * Admin keys get elevated privileges for testing and live production.
 * Non-admin keys are restricted to standard privileges.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.apiKey) {
    res.status(401).json({
      error: {
        type: 'authentication_required',
        message: 'Authentication required.',
      },
    });
    return;
  }

  if (!req.apiKey.is_admin) {
    res.status(403).json({
      error: {
        type: 'forbidden',
        message: 'Admin rights required. This API key does not have admin privileges.',
      },
    });
    return;
  }

  next();
}

/**
 * Returns true if the request has an admin API key.
 */
export function isAdminKey(req: AuthRequest): boolean {
  return Boolean(req.apiKey?.is_admin);
}
