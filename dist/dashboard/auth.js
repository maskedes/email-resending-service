"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionToken = createSessionToken;
exports.verifySessionToken = verifySessionToken;
exports.setSessionCookie = setSessionCookie;
exports.clearSessionCookie = clearSessionCookie;
exports.isAuthenticated = isAuthenticated;
exports.requireDashboardAuth = requireDashboardAuth;
exports.requireDashboardAuthApi = requireDashboardAuthApi;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
function sign(data) {
    return crypto_1.default.createHmac('sha256', config_1.config.dashboard.sessionSecret).update(data).digest('base64url');
}
function createSessionToken() {
    const payload = {
        exp: Date.now() + config_1.config.dashboard.sessionTtlMs,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encoded}.${sign(encoded)}`;
}
function verifySessionToken(token) {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig)
        return false;
    // Timing-safe signature comparison
    const expected = sign(encoded);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto_1.default.timingSafeEqual(a, b))
        return false;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
        return typeof payload.exp === 'number' && payload.exp > Date.now();
    }
    catch {
        return false;
    }
}
function getSessionCookie(req) {
    const header = req.headers.cookie;
    if (!header)
        return undefined;
    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1)
            continue;
        const name = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (name === config_1.config.dashboard.cookieName)
            return value;
    }
    return undefined;
}
function setSessionCookie(res, token) {
    const maxAgeSeconds = Math.floor(config_1.config.dashboard.sessionTtlMs / 1000);
    res.setHeader('Set-Cookie', `${config_1.config.dashboard.cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
}
function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `${config_1.config.dashboard.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
function isAuthenticated(req) {
    const token = getSessionCookie(req);
    return !!token && verifySessionToken(token);
}
function requireDashboardAuth(req, res, next) {
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
function requireDashboardAuthApi(req, res, next) {
    const serviceSecret = req.headers['x-dashboard-service-secret'];
    if (serviceSecret && config_1.config.dashboard.serviceSecret && serviceSecret === config_1.config.dashboard.serviceSecret) {
        next();
        return;
    }
    if (isAuthenticated(req)) {
        next();
        return;
    }
    res.status(401).json({ error: { type: 'unauthorized', message: 'Not authenticated.' } });
}
//# sourceMappingURL=auth.js.map