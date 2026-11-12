export interface ApiKey {
    id: string;
    key: string;
    name: string;
    email: string;
    user_id: string | null;
    created_at: string;
    is_active: boolean;
    total_emails_sent: number;
    last_used_at: string | null;
    /** Whether this key is allowed to send SMS (per-key "Allow SMS" toggle). */
    allow_sms: boolean;
    /** Whether this key accepts inbound email (per-key "Allow incoming email" toggle). */
    allow_incoming_email: boolean;
    /** Address inbound email for this key is forwarded to, when set. */
    forward_to: string | null;
    /** When true, this key has elevated privileges for testing/admin purposes. */
    is_admin: boolean;
}
export interface CreateApiKeyInput {
    name: string;
    email: string;
    userId?: string;
}
export declare function createApiKey(input: CreateApiKeyInput): Promise<{
    apiKey: ApiKey;
    rawKey: string;
}>;
/** Drop a cached validation (e.g. after delete/revoke) so revocation is prompt. */
export declare function invalidateApiKeyCacheById(apiKeyId: string): void;
export declare function validateApiKey(rawKey: string): Promise<ApiKey | null>;
export declare function getAllApiKeys(): Promise<ApiKey[]>;
/** Return all API keys owned by a specific Supabase user. */
export declare function getApiKeysByUserId(userId: string): Promise<ApiKey[]>;
export declare function deactivateApiKey(id: string): Promise<boolean>;
export declare function getApiKeyById(id: string): Promise<ApiKey | null>;
/**
 * Resolve the active API key that owns an inbound email address.
 * Inbound mail is routed to a key by matching the recipient against the key's
 * `email` field (case-insensitive). Returns null when nothing matches.
 */
export declare function getApiKeyByInboundAddress(address: string): Promise<ApiKey | null>;
export declare function deleteApiKey(id: string): Promise<boolean>;
export declare function incrementEmailCount(apiKeyId: string): Promise<void>;
//# sourceMappingURL=apiKeyService.d.ts.map