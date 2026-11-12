"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendViaSmtp = sendViaSmtp;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
let transporter = null;
/** Lazily creates the shared SMTP transporter from configuration. */
function getTransporter() {
    if (!transporter) {
        transporter = nodemailer_1.default.createTransport({
            host: config_1.config.smtp.host,
            port: config_1.config.smtp.port,
            secure: config_1.config.smtp.secure,
            auth: config_1.config.smtp.auth.user ? config_1.config.smtp.auth : undefined,
            tls: {
                rejectUnauthorized: false, // Accept self-signed certs (dev/relay servers)
            },
        });
    }
    return transporter;
}
async function sendViaSmtp(message) {
    return getTransporter().sendMail(message);
}
//# sourceMappingURL=smtp.js.map