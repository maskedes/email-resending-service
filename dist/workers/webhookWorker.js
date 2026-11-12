"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebhookWorker = initWebhookWorker;
const webhookQueue_1 = require("../queue/webhookQueue");
const webhookService_1 = require("../services/webhookService");
/** Boots the webhook retry worker. Call once during application startup. */
function initWebhookWorker() {
    (0, webhookQueue_1.startWebhookWorker)({
        process: (data) => (0, webhookService_1.processWebhookRetryJob)(data),
    });
}
//# sourceMappingURL=webhookWorker.js.map