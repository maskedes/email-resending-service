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

const LOCAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^localhost\./i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[?fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

/** True when the URL points at a local/private address the service must not shorten. */
export function isLocalOrPrivateHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return LOCAL_HOST_PATTERNS.some((re) => re.test(host));
  } catch {
    return true; // unreachable via canonicalizeUrl, but fail-closed here
  }
}

/**
 * Vanity slugs that would collide with panel/system routing or invite abuse.
 * Nginx/express mounts: /s, /site, /api; infra: health, metrics;
 * brandable phishing: admin, login, signin, account.
 */
const RESERVED_SLUGS = new Set([
  's', 'site', 'sites', 'api', 'health', 'metrics', 'admin', 'administrator',
  'login', 'signin', 'sign-in', 'account', 'dashboard', 'www', 'mail', 'webmail',
  'root', 'system', 'support', 'help', 'e-nvoy', 'envoy',
]);

/** Throws a message when a customer-chosen vanity slug is not allowed. */
export function validateVanitySlug(slug: string): string | null {
  const s = slug.toLowerCase();
  if (RESERVED_SLUGS.has(s)) return `The short path /${slug} is reserved by the platform. Choose a different slug.`;
  if (/^(pay|secure|login|verify|update|confirm|recover)/.test(s) && /(-|freesend|envoy|onboard|bank|wallet)/.test(s)) {
    return 'That short path looks like impersonation and is not allowed. Choose a different slug.';
  }
  return null;
}

/** Optional Safe Browsing v4 lookup. Returns (some) threat type or null. */
export async function safeBrowsingCheck(url: string): Promise<{ threat: string | null; error?: string }> {
  const key = (process.env.SAFE_BROWSING_API_KEY || '').trim();
  if (!key) return { threat: null }; // not configured — skip silently

  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'envoy-shortener', clientVersion: '1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { threat: null, error: `safebrowsing HTTP ${res.status}` };

    const body = (await res.json()) as { matches?: Array<{ threatType?: string }> };
    const match = body?.matches?.[0];
    return { threat: match?.threatType ?? null };
  } catch (err) {
    // Fail-open: a flaky reputation service must never block link creation.
    return { threat: null, error: (err as Error).message };
  }
}

/** Runs every enabled check; returns a rejection reason or null. */
export async function rejectUnsafeUrl(url: string): Promise<string | null> {
  if (isLocalOrPrivateHost(url)) {
    return 'target_url points at a local/private address and cannot be shortened.';
  }
  const sb = await safeBrowsingCheck(url);
  if (sb.threat) {
    return `target_url was flagged by safe browsing (${sb.threat}) and cannot be shortened.`;
  }
  return null;
}
