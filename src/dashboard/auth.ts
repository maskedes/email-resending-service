import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';

/**
 * Lightweight dashboard session auth using a signed, expiring cookie.
 * No extra dependencies: the token is an HMAC-SHA256 signature over
 * a base64 payload containing an expiry timestamp.
 */

interface SessionPayload {
  exp: number; // expiry epoch ms
}

function sign(data: string): string {
  return crypto.createHmac('sha256', config.dashboard.sessionSecret).update(data).digest('base64url');
}

export function createSessionToken(): string {
  const payload: SessionPayload = {
    exp: Date.now() + config.dashboard.sessionTtlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string): boolean {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;

  // Timing-safe signature comparison
  const expected = sign(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    );
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function getSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name === config.dashboard.cookieName) return value;
  }
  return undefined;
}

export function setSessionCookie(res: Response, token: string): void {
  const maxAgeSeconds = Math.floor(config.dashboard.sessionTtlMs / 1000);
  res.setHeader(
    'Set-Cookie',
    `${config.dashboard.cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`
  );
}

export function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${config.dashboard.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export function isAuthenticated(req: Request): boolean {
  const token = getSessionCookie(req);
  return !!token && verifySessionToken(token);
}

export function requireDashboardAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthenticated(req)) {
    next();
    return;
  }
  // Not authenticated -> send to login screen
  res.redirect('/login');
}

/**
 * Same guard, but for JSON API endpoints — returns 401 instead of a redirect
 * so the Next.js dashboard can react properly.
 *
 * Accepts either the browser session cookie OR the shared dashboard service
 * secret header (used by the Next.js proxy after it verifies a Supabase
 * session server-side).
 */
export function requireDashboardAuthApi(req: Request, res: Response, next: NextFunction): void {
  const serviceSecret = req.headers['x-dashboard-service-secret'];
  if (serviceSecret && config.dashboard.serviceSecret && serviceSecret === config.dashboard.serviceSecret) {
    next();
    return;
  }
  if (isAuthenticated(req)) {
    next();
    return;
  }
  res.status(401).json({ error: { type: 'unauthorized', message: 'Not authenticated.' } });
}
