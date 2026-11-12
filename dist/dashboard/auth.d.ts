import { NextFunction, Request, Response } from 'express';
export declare function createSessionToken(): string;
export declare function verifySessionToken(token: string): boolean;
export declare function setSessionCookie(res: Response, token: string): void;
export declare function clearSessionCookie(res: Response): void;
export declare function isAuthenticated(req: Request): boolean;
export declare function requireDashboardAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Same guard, but for JSON API endpoints — returns 401 instead of a redirect
 * so the Next.js dashboard can react properly.
 *
 * Accepts either the browser session cookie OR the shared dashboard service
 * secret header (used by the Next.js proxy after it verifies a Supabase
 * session server-side).
 */
export declare function requireDashboardAuthApi(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map