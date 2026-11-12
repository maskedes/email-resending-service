"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edgeProxyMiddleware = edgeProxyMiddleware;
exports.isTrustedDashboardProxy = isTrustedDashboardProxy;
exports.trustedDashboardUserId = trustedDashboardUserId;
exports.authMiddleware = authMiddleware;
exports.errorHandler = errorHandler;
exports.requireAdmin = requireAdmin;
exports.isAdminKey = isAdminKey;
const apiKeyService_1 = require("../services/apiKeyService");
const config_1 = require("../config");
const db_1 = require("../database/db");
/**
 * Verifies the Cloudflare edge proxy secret, if one is configured.
 * Ensures /api/emails/* traffic only comes through the Worker.
 */
function edgeProxyMiddleware(req, res, next) {
    const secret = config_1.config.edgeProxySecret;
    if (!secret)
        return next(); // Edge auth disabled
    const provided = req.headers['x-edge-proxy-secret'];
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
function isTrustedDashboardProxy(req) {
    const expected = config_1.config.dashboard.serviceSecret;
    if (!expected)
        return false;
    const provided = req.headers['x-dashboard-service-secret'];
    return typeof provided === 'string' && provided.length > 0 && provided === expected;
}
/**
 * Returns the dashboard user id only when the request is from the trusted
 * dashboard proxy; otherwise undefined.
 */
function trustedDashboardUserId(req) {
    if (!isTrustedDashboardProxy(req))
        return undefined;
    const userId = req.headers['x-dashboard-user-id'];
    return typeof userId === 'string' && userId.length > 0 ? userId : undefined;
}
async function authMiddleware(req, res, next) {
    const apiKey = req.headers[config_1.config.apiKeyHeader];
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
        const validKey = await (0, apiKeyService_1.validateApiKey)(apiKey);
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
                const { rows } = await (0, db_1.getPool)().query(`SELECT role FROM api_key_members
           WHERE api_key_id = $1 AND email = $2 AND role = 'admin'`, [validKey.id, userId]);
                if (rows.length > 0) {
                    req.apiKey.is_admin = true;
                }
            }
            catch {
                // Ignore member-check errors — fall back to key-level is_admin flag.
            }
        }
        next();
    }
    catch (err) {
        next(err);
    }
}
function errorHandler(err, _req, res, _next) {
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
function requireAdmin(req, res, next) {
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
function isAdminKey(req) {
    return Boolean(req.apiKey?.is_admin);
}
//# sourceMappingURL=auth.js.map