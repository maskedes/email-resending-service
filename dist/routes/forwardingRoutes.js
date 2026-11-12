"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const forwardingService_1 = require("../services/forwardingService");
const router = (0, express_1.Router)();
// Every rule is owned by an API key; all routes are scoped to the
// authenticated key so one tenant can never read or mutate another's rules.
router.use(auth_1.authMiddleware);
router.get('/', async (req, res) => {
    const rules = await (0, forwardingService_1.listForwardingRules)(req.apiKey.id);
    res.json({ data: rules });
});
router.post('/', async (req, res) => {
    const { domain, alias, destination } = req.body || {};
    if (!domain || !alias || !destination) {
        res.status(400).json({
            error: { type: 'validation_error', message: '"domain", "alias" and "destination" are all required.' },
        });
        return;
    }
    try {
        const rule = await (0, forwardingService_1.createForwardingRule)({
            apiKeyId: req.apiKey.id,
            domain: String(domain),
            alias: String(alias),
            destination: String(destination),
        });
        res.status(201).json({ rule });
    }
    catch (error) {
        if (error.status === 400 || error.status === 403 || error.status === 409) {
            res.status(error.status).json({ error: { type: 'validation_error', message: error.message } });
            return;
        }
        console.error('Error creating forwarding rule:', error);
        res.status(500).json({ error: { type: 'server_error', message: 'Failed to create forwarding rule.' } });
    }
});
router.delete('/:id', async (req, res) => {
    const ok = await (0, forwardingService_1.deleteForwardingRule)(req.params.id, req.apiKey.id);
    if (!ok) {
        res.status(404).json({ error: { type: 'not_found', message: 'Forwarding rule not found.' } });
        return;
    }
    res.json({ message: 'Forwarding rule deleted.' });
});
exports.default = router;
//# sourceMappingURL=forwardingRoutes.js.map