"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiKeyService_1 = require("../services/apiKeyService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const { name, email } = req.body;
    const userId = (0, auth_1.trustedDashboardUserId)(req);
    if (!name || !email) {
        res.status(400).json({
            error: {
                type: 'validation_error',
                message: 'Both "name" and "email" are required.',
            },
        });
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({
            error: {
                type: 'validation_error',
                message: 'Please provide a valid email address.',
            },
        });
        return;
    }
    const { apiKey, rawKey } = await (0, apiKeyService_1.createApiKey)({ name, email, userId });
    res.status(201).json({
        id: apiKey.id,
        key: rawKey,
        name: apiKey.name,
        email: apiKey.email,
        created_at: apiKey.created_at,
        message: 'API key created successfully. Save this key securely - it will not be shown again.',
    });
});
router.get('/', auth_1.authMiddleware, async (req, res) => {
    // Only honoured for trusted dashboard-proxy requests; a bare client-supplied
    // header cannot enumerate another user's keys.
    const userId = (0, auth_1.trustedDashboardUserId)(req);
    // Only admin keys can list all keys; non-admin keys can only list their own
    if (!userId && !(0, auth_1.isAdminKey)(req)) {
        res.status(403).json({
            error: {
                type: 'forbidden',
                message: 'Admin rights required to list all API keys.',
            },
        });
        return;
    }
    const keys = userId ? await (0, apiKeyService_1.getApiKeysByUserId)(userId) : await (0, apiKeyService_1.getAllApiKeys)();
    res.json({
        data: keys.map((k) => ({
            id: k.id,
            name: k.name,
            email: k.email,
            is_active: k.is_active,
            total_emails_sent: k.total_emails_sent,
            created_at: k.created_at,
            last_used_at: k.last_used_at,
            allow_sms: k.allow_sms,
            allow_incoming_email: k.allow_incoming_email,
            forward_to: k.forward_to,
            is_admin: k.is_admin === true,
        })),
    });
});
router.delete('/:id', auth_1.authMiddleware, auth_1.requireAdmin, async (req, res) => {
    const success = await (0, apiKeyService_1.deactivateApiKey)(req.params.id);
    if (!success) {
        res.status(404).json({
            error: {
                type: 'not_found',
                message: 'API key not found.',
            },
        });
        return;
    }
    res.json({
        message: 'API key deactivated successfully.',
    });
});
// Permanently delete an API key (auto-revokes + purges it and all child data:
// emails, events, webhooks, domains, templates). This is destructive and
// irreversible, so it requires an admin API key.
router.delete('/:id/delete', auth_1.authMiddleware, auth_1.requireAdmin, async (req, res) => {
    const success = await (0, apiKeyService_1.deleteApiKey)(req.params.id);
    if (!success) {
        res.status(404).json({
            error: {
                type: 'not_found',
                message: 'API key not found.',
            },
        });
        return;
    }
    res.json({
        message: 'API key deleted successfully.',
    });
});
exports.default = router;
//# sourceMappingURL=apiKeyRoutes.js.map