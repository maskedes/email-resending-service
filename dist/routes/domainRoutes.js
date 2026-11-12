"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const domainService_1 = require("../services/domainService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Every domain is owned by an API key, so all routes require authentication
// and are scoped to the authenticated key. Without this, anyone could list
// every tenant's domains (including DKIM private keys) or delete them.
router.use(auth_1.authMiddleware);
const clients = new Map();
function broadcast(apiKeyId, event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients.values()) {
        if (client.apiKeyId !== apiKeyId)
            continue;
        try {
            client.res.write(payload);
        }
        catch {
            /* client disconnected */
        }
    }
}
function pruneClients() {
    for (const [id, client] of clients) {
        if (client.res.writableEnded || client.res.destroyed)
            clients.delete(id);
    }
}
router.get('/events', (req, res) => {
    const apiKeyId = req.apiKey.id;
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    const id = `${apiKeyId}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    clients.set(id, { apiKeyId, res });
    // Heartbeat keeps the connection alive
    const heartbeat = setInterval(() => {
        try {
            res.write(': ping\n\n');
        }
        catch {
            clearInterval(heartbeat);
        }
    }, 25000);
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id })}\n\n`);
    req.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(id);
    });
    pruneClients();
});
router.post('/', async (req, res) => {
    const { name } = req.body;
    const apiKeyId = req.apiKey.id;
    if (!name) {
        res.status(400).json({
            error: { type: 'validation_error', message: 'Domain name is required.' },
        });
        return;
    }
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(name)) {
        res.status(400).json({
            error: { type: 'validation_error', message: 'Please provide a valid domain name (e.g., example.com).' },
        });
        return;
    }
    try {
        const domain = await (0, domainService_1.createDomain)({ apiKeyId, name });
        // Kick off an immediate DNS check so the UI gets real status right away.
        (0, domainService_1.verifyDomainDns)(domain.id, apiKeyId)
            .then((result) => {
            if (result)
                broadcast(apiKeyId, 'domain-updated', { id: domain.id, verification: { ...result, domain: (0, domainService_1.sanitizeDomain)(result.domain) } });
        })
            .catch(() => {
            /* non-fatal; user can re-check */
        });
        res.status(201).json({ domain: (0, domainService_1.sanitizeDomain)(domain) });
    }
    catch (error) {
        if (error.code === '23505') {
            res.status(409).json({ error: { type: 'conflict', message: error.message || 'This domain has already been added.' } });
            return;
        }
        res.status(500).json({ error: { type: 'server_error', message: 'Failed to create domain.' } });
    }
});
router.get('/', async (req, res) => {
    const domains = await (0, domainService_1.getDomainsByApiKey)(req.apiKey.id);
    res.json({ data: domains.map(domainService_1.sanitizeDomain) });
});
router.post('/:id/verify', async (req, res) => {
    const apiKeyId = req.apiKey.id;
    const result = await (0, domainService_1.verifyDomainDns)(req.params.id, apiKeyId);
    if (!result) {
        res.status(404).json({ error: { type: 'not_found', message: 'Domain not found.' } });
        return;
    }
    broadcast(apiKeyId, 'domain-updated', { id: result.domain.id, verification: { ...result, domain: (0, domainService_1.sanitizeDomain)(result.domain) } });
    res.json({ domain: (0, domainService_1.sanitizeDomain)(result.domain), checks: result.checks, overall: result.overall });
});
router.delete('/:id', async (req, res) => {
    const apiKeyId = req.apiKey.id;
    // Confirm ownership before deleting so a 404 is returned for other tenants'
    // domains (deleteDomain also scopes the delete as defence in depth).
    const owned = await (0, domainService_1.getDomainById)(req.params.id, apiKeyId);
    if (!owned) {
        res.status(404).json({ error: { type: 'not_found', message: 'Domain not found.' } });
        return;
    }
    const success = await (0, domainService_1.deleteDomain)(req.params.id, apiKeyId);
    if (!success) {
        res.status(404).json({ error: { type: 'not_found', message: 'Domain not found.' } });
        return;
    }
    broadcast(apiKeyId, 'domain-deleted', { id: req.params.id });
    res.json({ message: 'Domain deleted successfully.' });
});
router.get('/:id', async (req, res) => {
    const domain = await (0, domainService_1.getDomainById)(req.params.id, req.apiKey.id);
    if (!domain) {
        res.status(404).json({ error: { type: 'not_found', message: 'Domain not found.' } });
        return;
    }
    res.json({ domain: (0, domainService_1.sanitizeDomain)(domain) });
});
exports.default = router;
//# sourceMappingURL=domainRoutes.js.map