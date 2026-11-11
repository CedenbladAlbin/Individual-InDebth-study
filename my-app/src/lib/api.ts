export function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem('token');
  } catch {
    // ignore
  }
}

/**
 * fetch() for the app's own API: adds the Bearer token and JSON content type,
 * and sends the user to the login page when the session has expired.
 */
export async function api(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login?expired=1';
  }
  return res;
}
