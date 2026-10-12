import Conf from 'conf';

interface Config {
  apiKey: string;
  host: string;
  edgeProxySecret: string;
}

const store = new Conf<Config>({
  projectName: 'envoy-cli',
  defaults: {
    apiKey: '',
    host: 'https://api.freemailsend.dev',
    edgeProxySecret: '',
  },
});

export const config = {
  get apiKey(): string {
    return process.env.ENVOY_API_KEY || store.get('apiKey', '');
  },
  set apiKey(key: string) {
    store.set('apiKey', key);
  },
  get host(): string {
    return process.env.ENVOY_HOST || store.get('host', 'https://api.freemailsend.dev');
  },
  set host(url: string) {
    const cleaned = (url || '').trim().replace(/\/$/, '');
    if (!cleaned) return;
    try {
      const u = new URL(cleaned);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('invalid protocol');
    } catch {
      // still store — validation happens at command time for better errors
    }
    store.set('host', cleaned);
  },
  get edgeProxySecret(): string {
    return process.env.ENVOY_EDGE_PROXY_SECRET || store.get('edgeProxySecret', '');
  },
  set edgeProxySecret(secret: string) {
    store.set('edgeProxySecret', secret);
  },
};

export async function api(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  opts?: { apiKey?: string; host?: string; json?: boolean; edgeProxySecret?: string }
): Promise<{ status: number; data: unknown }> {
  const host = (opts?.host || config.host || '').replace(/\/$/, '');
  const apiKey = opts?.apiKey || config.apiKey;
  const url = `${host}${path}`;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const edgeSecret = opts?.edgeProxySecret || config.edgeProxySecret;
  if (edgeSecret) {
    headers['x-edge-proxy-secret'] = edgeSecret;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { error: { message: raw.slice(0, 500) || res.statusText } } as unknown;
  }

  return { status: res.status, data };
}
