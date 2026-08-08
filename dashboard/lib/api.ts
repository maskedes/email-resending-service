// Server-side helper to talk to the Express FreeMailSend API.
// All calls happen on the server so the session cookie is forwarded
// and never exposed to the browser.

export const API_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const SESSION_COOKIE = 'fms_dashboard';

export async function expressFetch(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    sessionToken?: string;
  } = {}
): Promise<{ status: number; data: any; setCookie?: string | null }> {
  const { method = 'GET', body, sessionToken } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (sessionToken) {
    headers['Cookie'] = `${SESSION_COOKIE}=${sessionToken}`;
  }

  // Shared service secret lets the Next.js proxy authenticate to Express
  // after the Supabase session has been verified server-side.
  const serviceSecret = process.env.DASHBOARD_SERVICE_SECRET;
  if (serviceSecret) {
    headers['X-Dashboard-Service-Secret'] = serviceSecret;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return {
    status: res.status,
    data,
    setCookie: res.headers.get('set-cookie'),
  };
}

export { SESSION_COOKIE };
