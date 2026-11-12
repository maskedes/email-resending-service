export interface SiteRow {
    id: string;
    api_key_id: string;
    domain: string;
    subdomain: string | null;
    title: string | null;
    html: string;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}
export interface LinkRow {
    id: string;
    api_key_id: string;
    site_id: string | null;
    domain: string;
    slug: string;
    target_url: string;
    clicks: number;
    is_active: boolean;
    created_at: string;
}
export declare function shortUrl(domain: string, slug: string): string;
/** Thrown when a vanity slug already exists for the domain — routes map this to HTTP 409. */
export declare class AliasConflictError extends Error {
    code: string;
    constructor(domain: string, slug: string);
}
/** Thrown when the target URL cannot be safely shortened. */
export declare class ValidationError extends Error {
    code: string;
    constructor(message: string);
}
/** Thrown when the API key exceeds its link-creation budget → HTTP 429. */
export declare class RateLimitedError extends Error {
    code: string;
    retryAfterSeconds: number;
    constructor(retryAfterSeconds: number);
}
/**
 * Canonicalizes a long URL per the URL-shortener design doc:
 * - only http/https schemes (rejects javascript:, data:, file:, mailto:)
 * - lowercased scheme/host (URL does this) + default ports stripped
 * - repeated slashes collapsed, trailing slash removed (except bare "/")
 * Returns null when the URL is invalid or uses a disallowed scheme.
 */
export declare function canonicalizeUrl(raw: string): string | null;
/** Returns the short domain as configured (env override, else the legacy default). */
export declare function defaultShortDomain(): string;
export declare function createSite(apiKeyId: string, input: {
    domain?: string;
    subdomain?: string;
    title?: string;
    html: string;
}): Promise<SiteRow>;
export declare function listSites(apiKeyId: string): Promise<SiteRow[]>;
export declare function getSite(id: string): Promise<SiteRow | null>;
export declare function updateSite(id: string, patch: Partial<Pick<SiteRow, 'html' | 'title' | 'is_published'>>): Promise<SiteRow | null>;
export declare function deleteSite(id: string): Promise<void>;
export declare function createLink(apiKeyId: string, input: {
    domain?: string;
    slug?: string;
    target_url: string;
    site_id?: string;
}): Promise<LinkRow>;
export declare function listLinks(apiKeyId: string): Promise<LinkRow[]>;
export declare function getLinkByDomainSlug(domain: string, slug: string): Promise<LinkRow | null>;
export declare function incrementLinkClick(id: string): Promise<void>;
/**
 * Fire all active `click` triggers for a link (fire-and-forget caller).
 *
 * The route previously only counted clicks — triggers registered via
 * POST /api/sites-links/triggers with event `click` were never dispatched.
 * Triggers with a NULL link_id apply to every link of the same API key;
 * triggers bound to a specific link fire only for that link.
 */
export declare function dispatchClickTriggers(link: LinkRow): Promise<void>;
export declare function deleteLink(id: string): Promise<void>;
/**
 * Edits an existing short link: swap the long URL target and/or pause/activate.
 * Target changes re-run the same canonicalization + safety checks as creation
 * so an edit can never sneak in a scheme or host that create would reject.
 */
export declare function updateLink(id: string, patch: Partial<Pick<LinkRow, 'target_url' | 'is_active'>>): Promise<LinkRow | null>;
/**
 * Writes a per-click log row (event='click') for the redirect path.
 * Privacy: the last octet of IPv4 is masked, IPv6 is truncated to its first
 * four groups; user agents are truncated. Fire-and-forget caller — never
 * let analytics block or fail a redirect.
 */
export declare function logLinkClick(link: LinkRow, info: {
    ip: string | null;
    ua: string | null;
}): Promise<void>;
export declare function resolveSite(domain: string, subdomain?: string | null): Promise<SiteRow | null>;
//# sourceMappingURL=siteLinkService.d.ts.map