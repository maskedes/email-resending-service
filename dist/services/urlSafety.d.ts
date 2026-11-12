/**
 * URL safety checks for the short-link write path.
 *
 * Layered guards (cheap → expensive), all fail-open except scheme checks:
 *  1. Schemes: only http/https (enforced in canonicalizeUrl, siteLinkService).
 *  2. Local/private hosts: no internal addresses — a redirect target pointing
 *     at localhost / RFC1918 space has no legitimate customer use and is a
 *     classic phishing/SSRF disguise.
 *  3. Vanity-slug abuse: ReservedRouting and obvious impersonation traps.
 *  4. Optional Google Safe Browsing v4 lookup when SAFE_BROWSING_API_KEY is
 *     set (2s timeout, fail-open): blocks known malware/phishing URLs.
 */
/** True when the URL points at a local/private address the service must not shorten. */
export declare function isLocalOrPrivateHost(url: string): boolean;
/** Throws a message when a customer-chosen vanity slug is not allowed. */
export declare function validateVanitySlug(slug: string): string | null;
/** Optional Safe Browsing v4 lookup. Returns (some) threat type or null. */
export declare function safeBrowsingCheck(url: string): Promise<{
    threat: string | null;
    error?: string;
}>;
/** Runs every enabled check; returns a rejection reason or null. */
export declare function rejectUnsafeUrl(url: string): Promise<string | null>;
//# sourceMappingURL=urlSafety.d.ts.map