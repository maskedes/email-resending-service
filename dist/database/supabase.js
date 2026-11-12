"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabase = getSupabase;
/**
 * Supabase admin client for server-side writes.
 * Uses the service_role key to bypass RLS.
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend .env.
 */
const supabase_js_1 = require("@supabase/supabase-js");
const ws_1 = __importDefault(require("ws"));
// Supabase's RealtimeClient requires a global `WebSocket`, which Node only
// provides natively from v22. Runtimes on older images (e.g. the WispByte
// `nodejs_19` image) would otherwise throw inside createClient(). Supply the
// `ws` implementation when there is no native WebSocket.
if (!globalThis.WebSocket) {
    globalThis.WebSocket = ws_1.default;
}
let client = null;
function getSupabase() {
    if (client)
        return client;
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
    }
    client = (0, supabase_js_1.createClient)(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    return client;
}
//# sourceMappingURL=supabase.js.map