import { Request, Response, NextFunction } from 'express';
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
export declare function edgeProxyMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * True when the request comes from the trusted Next.js dashboard proxy.
 *
 * The `x-dashboard-user-id` header is CLIENT-SUPPLIED and must never be
 * trusted on its own — otherwise any caller could send an arbitrary user id
 * and gain that user's API keys or elevate to admin. We therefore require the
 * shared service secret (known only to the backend and the Vercel dashboard)
 * before the header is honoured.
 */
export declare function isTrustedDashboardProxy(req: Request): boolean;
/**
 * Returns the dashboard user id only when the request is from the trusted
 * dashboard proxy; otherwise undefined.
 */
export declare function trustedDashboardUserId(req: Request): string | undefined;
export declare function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void;
/**
 * Check if the authenticated API key has admin rights.
 * Admin keys get elevated privileges for testing and live production.
 * Non-admin keys are restricted to standard privileges.
 */
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void;
/**
 * Returns true if the request has an admin API key.
 */
export declare function isAdminKey(req: AuthRequest): boolean;
//# sourceMappingURL=auth.d.ts.map