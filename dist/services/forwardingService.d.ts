export interface ForwardingRule {
    id: string;
    api_key_id: string;
    domain: string;
    /** Local part to match ("sales") or '*' for the domain catch-all. */
    alias: string;
    destination: string;
    is_active: boolean;
    created_at: string;
}
export interface CreateForwardingRuleInput {
    apiKeyId: string;
    domain: string;
    alias: string;
    destination: string;
}
export interface ResolvedForward {
    rule: ForwardingRule;
    /** Owning key of the rule (already validated active + incoming-enabled). */
    apiKeyId: string;
    /** True when matched by the domain catch-all rather than an exact alias. */
    catchAll: boolean;
}
/**
 * Resolves the forwarding rule for an inbound recipient.
 * Match order mirrors DNSimple's semantics:
 *   1. exact alias on the recipient's domain (most specific wins)
 *   2. the domain catch-all ('*')
 * The rule's owning key must still be active and allowed incoming email.
 */
export declare function resolveForwardFor(recipient: string): Promise<ResolvedForward | null>;
/** Lists every forwarding rule owned by a key, newest first. */
export declare function listForwardingRules(apiKeyId: string): Promise<ForwardingRule[]>;
/**
 * Creates a forwarding rule. The domain must already belong to the key and be
 * verified — forwarding from an uncontrolled domain would let a tenant
 * intercept mail for names it does not own.
 */
export declare function createForwardingRule(input: CreateForwardingRuleInput): Promise<ForwardingRule>;
/** Deletes a rule, scoped to the owning key. */
export declare function deleteForwardingRule(id: string, apiKeyId: string): Promise<boolean>;
//# sourceMappingURL=forwardingService.d.ts.map